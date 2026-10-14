// HarborDock: one dock on one monitor. It places the chosen style at the
// edge, keeps it out of the way of windows the way the settings ask, makes
// room for drops, and opens the menus of its items.

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as DND from 'resource:///org/gnome/shell/ui/dnd.js';
import * as Layout from 'resource:///org/gnome/shell/ui/layout.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {appMenu, move, pin, placeMenu, unpin} from './appmenu.js';
import {anyOverlaps, barOpacity} from './layout.js';
import {STATE_MS, ease} from './motion.js';
import * as Places from './places.js';
import {ICON_PX} from './settings.js';
import {Tooltip} from './tooltip.js';
import {windowList} from './windowlist.js';
import {makeStyle} from './styles/index.js';

// GNOME's own numbers for the hot corner: a firm push, not a brush.
const PRESSURE_THRESHOLD = 100;
const PRESSURE_TIMEOUT = 1000;
// How long the dock stays after the pointer has left it.
const LEAVE_MS = 500;
const BASE_ICON = 48;

export class Dock {
    // shared: {theme, model, places, status, settings: () => current, onState}
    constructor(monitorIndex, shared) {
        this.monitorIndex = monitorIndex;
        this._shared = shared;
        this.theme = shared.theme;
        this.tooltip = new Tooltip(this.theme);
        this.barAlpha = 0.85;
        this.shown = true;
        this._revealed = false;
        this._hovering = false;
        this._dragging = false;
        this._menu = null;
        this._leave = 0;
        this._barrier = null;
        this._pressure = null;
        this._struts = null;
        this._snapshot = null;

        this._container = new St.Bin({
            style_class: 'harbor-dock',
            reactive: true,
            track_hover: true,
        });
        this._container._delegate = this;
        // At shell exit the actors go before Harbor is disabled.
        this._container.connect('destroy', () => {
            if (this._leave)
                GLib.source_remove(this._leave);
            this._leave = 0;
            this._style = null;
        });
        this._container.connect('notify::hover', () => this._hoverChanged());
        this._container.connect('notify::allocation', () => this._queueReposition());
        // The quiet handle's grip: the only thing left of a hidden dock.
        this._handle = new St.Button({style_class: 'harbor-handle', reactive: true, visible: false, accessible_name: 'Show the dock'});
        this._handle.connect('clicked', () => this.reveal());
        Main.layoutManager.addChrome(this._handle);

        this._applySettings(shared.settings());

        Main.overview.connectObject(
            'showing', () => this._evaluate(),
            'hidden', () => this._evaluate(), this);
        Main.layoutManager.connectObject('monitors-changed', () => this._reposition(), this);
        global.display.connectObject('workareas-changed', () => this._reposition(), this);
    }

    get monitor() {
        return Main.layoutManager.monitors[this.monitorIndex] ?? Main.layoutManager.primaryMonitor;
    }

    get vertical() {
        return this.side === 'left' || this.side === 'right';
    }

    get scale() {
        return this.iconPx / BASE_ICON;
    }

    // Hands the dock new settings; a change of style, edge or size builds
    // the style anew, the rest is applied in place.
    setSettings(settings) {
        const rebuild = ['style', 'position', 'iconSize', 'trashAndDrives', 'whenWindowClose']
            .some(key => settings[key] !== this._settings[key]);
        this._settings = settings;
        if (rebuild)
            this._applySettings(settings, {fade: true});
        else
            this.update(this._snapshot);
    }

    _applySettings(settings, {fade = false} = {}) {
        this._settings = settings;
        this.side = settings.position;
        this._shrink = 0;
        this.iconPx = ICON_PX[settings.iconSize];
        const old = this._style;
        // The new style is made at the swap, so it never paints off stage.
        const swap = () => {
            old?.destroy();
            this._style = makeStyle(this._settings.style, this);
            this._container.set_child(this._style.actor);
            this._track();
            if (this._snapshot)
                this.update(this._snapshot);
            this._reposition();
            this._setupBarrier();
            this._evaluate({animated: false});
        };
        if (old && fade && this._container.visible) {
            ease(this._container, {opacity: 0}, {duration: STATE_MS / 2, onComplete: () => {
                swap();
                ease(this._container, {opacity: 255}, {duration: STATE_MS / 2});
            }});
        } else {
            swap();
        }
    }

    // Chrome is tracked once per kind of room it takes: only a dock that
    // keeps its place reserves room for itself.
    _track() {
        const struts = this._reservesSpace();
        if (this._struts === struts)
            return;
        if (this._struts !== null)
            Main.layoutManager.removeChrome(this._container);
        Main.layoutManager.addChrome(this._container, {affectsStruts: struts, trackFullscreen: true});
        this._struts = struts;
    }

    _reservesSpace() {
        const mode = this._settings.whenWindowClose;
        return mode === 'stay' || (this._style.reservesSpace && mode !== 'hide');
    }

    update(snapshot) {
        if (!snapshot)
            return;
        this._snapshot = snapshot;
        this._style.update(snapshot);
        this._evaluate();
    }

    // Apps as this dock shows them: with "Every monitor", running means
    // running here.
    appsFor(snapshot) {
        const settings = this._settings;
        if (!settings.everyMonitor || Main.layoutManager.monitors.length < 2)
            return snapshot.apps;
        return snapshot.apps.map(entry => {
            const windows = entry.windows.filter(window => window.get_monitor() === this.monitorIndex);
            // Focus and attention count where the window is.
            return {
                ...entry,
                windows,
                focused: entry.focused && windows.length > 0,
                attention: windows.some(window => window.demands_attention || window.urgent),
            };
        }).filter(entry => entry.pinned || entry.windows.length > 0);
    }

    places() {
        return this._settings.trashAndDrives ? this._shared.places.list : [];
    }

    // Status, filled in by the status module.
    decorate(button) {
        this._shared.status?.decorate(button, this);
    }

    paintStatus(button) {
        this._shared.status?.paint(button, this);
    }

    attentionFor(button) {
        return this._shared.status?.attention(button.item, this) ?? false;
    }

    playing(item) {
        return this._shared.status?.playing(item) ?? false;
    }

    get settings() {
        return this._settings;
    }

    // Item actions

    showApps() {
        if (Main.overview.visible && Main.overview.dash.showAppsButton.checked)
            Main.overview.hide();
        else
            Main.overview.showApps();
    }

    openPlace(place) {
        Places.open(place);
    }

    openAppMenu(button) {
        this._openMenu(appMenu(button, this.side, this.theme));
    }

    openPlaceMenu(button) {
        this._openMenu(placeMenu(button, this.side, this.theme, {onOpen: Places.open, onEject: Places.eject}));
    }

    showWindowList(button, {hover = false} = {}) {
        // One list at a time; resting on the same app keeps it.
        if (hover && this._menu?.isOpen && this._menu.source === button)
            return;
        const menu = windowList(button, this.side, this.theme, {hover});
        menu.source = button;
        this._openMenu(menu);
    }

    get status() {
        return this._shared.status;
    }

    // A style that names what the pointer rests on by itself.
    get ownNames() {
        return this._style?.ownNames ?? false;
    }

    // A style that opens lists on hover needs no tooltip over apps.
    get hoverLists() {
        return this._style?.hoverLists ?? false;
    }

    // A style that shows status loudly keeps it with the switch off.
    get loudStatus() {
        return this._style?.loudStatus ?? false;
    }

    // The colour around a count, so it reads as cut out of the bar.
    get barColor() {
        return this._style?.barColor ?? null;
    }

    repaint() {
        this._style?.repaint();
    }

    buttonFor(appId) {
        return this._style?.buttonFor(appId) ?? null;
    }

    // Keeps the dock up while a menu of it is open.
    _openMenu(menu) {
        this._menu?.destroy();
        this._menu = menu;
        this.tooltip.hide();
        menu.onClosed = () => {
            if (this._menu === menu) {
                this._menu = null;
                // The menu's own close animation runs first.
                GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                    menu.destroy();
                    return GLib.SOURCE_REMOVE;
                });
                this._evaluate();
            }
        };
        menu.open();
        this._evaluate();
    }

    holdOpen(menu) {
        this._openMenu(menu);
    }

    hovered(button, hover) {
        this._style?.hovered?.(button, hover);
    }

    // Dragging

    dragBegin() {
        this._dragging = true;
        this.tooltip.hide();
        this._evaluate();
    }

    // An app dragged out of the dock and let go elsewhere is unpinned.
    dragCancelled(button) {
        if (!button.item.pinned)
            return;
        const [x, y] = global.get_pointer();
        if (!this._contains(x, y, this._edgeThickness()))
            unpin(button.item.id);
    }

    dragEnd() {
        this._dragging = false;
        this._clearPlaceholder();
        this._evaluate();
    }

    // DND target: apps from the dock itself or from the app grid.
    handleDragOver(source, _actor, x, y) {
        const app = source?.app ?? null;
        if (!app || app.is_window_backed() || !global.settings.is_writable('favorite-apps'))
            return DND.DragMotionResult.NO_DROP;
        this._dropIndex = this._indexAt(x, y);
        this._showPlaceholder(this._dropIndex);
        return DND.DragMotionResult.MOVE_DROP;
    }

    acceptDrop(source) {
        const app = source?.app ?? null;
        if (!app || app.is_window_backed())
            return false;
        const id = app.get_id();
        const index = this._dropIndex ?? -1;
        this._clearPlaceholder();
        const laters = global.compositor.get_laters();
        laters.add(Meta.LaterType.BEFORE_REDRAW, () => {
            const pinnedIds = this._snapshot.apps.filter(entry => entry.pinned).map(entry => entry.id);
            if (pinnedIds.includes(id)) {
                // Its own place does not count while it moves.
                const from = pinnedIds.indexOf(id);
                move(id, index > from ? index - 1 : index);
            } else {
                pin(id, index);
            }
            return GLib.SOURCE_REMOVE;
        });
        return true;
    }

    // The place among the pinned apps the pointer points at; drops behind
    // the last pinned app pin at the end.
    _indexAt(x, y) {
        const pinned = this._style.appButtons().filter(button => button.item.pinned);
        const [cx, cy] = this._container.get_transformed_position();
        const along = this.vertical ? cy + y : cx + x;
        let index = 0;
        for (const button of pinned) {
            const [bx, by] = button.get_transformed_position();
            const [bw, bh] = button.get_transformed_size();
            const middle = this.vertical ? by + bh / 2 : bx + bw / 2;
            if (along > middle)
                index++;
        }
        return index;
    }

    _showPlaceholder(index) {
        const pinned = this._style.appButtons().filter(button => button.item.pinned);
        for (const [i, button] of pinned.entries()) {
            const gap = Math.round(this.iconPx / 3);
            const shift = i >= index ? gap : 0;
            ease(button, this.vertical ? {translation_y: shift} : {translation_x: shift}, {duration: 120});
        }
    }

    _clearPlaceholder() {
        this._dropIndex = null;
        for (const button of this._style.appButtons())
            ease(button, {translation_x: 0, translation_y: 0}, {duration: 120});
    }

    // Showing and hiding

    _hoverChanged() {
        if (this._leave)
            GLib.source_remove(this._leave);
        this._leave = 0;
        if (this._container.hover) {
            this._hovering = true;
            this._evaluate();
            return;
        }
        this._leave = GLib.timeout_add(GLib.PRIORITY_DEFAULT, LEAVE_MS, () => {
            this._leave = 0;
            this._hovering = false;
            this._revealed = false;
            this._evaluate();
            return GLib.SOURCE_REMOVE;
        });
    }

    // Called when windows move or change; also by the dock itself.
    windowsChanged() {
        this._evaluate();
    }

    _evaluate({animated = true} = {}) {
        if (!this._style)
            return;
        const mode = this._settings.whenWindowClose;
        const windows = this._windowsHere();
        const overlap = anyOverlaps(this._shownRect(), windows);
        const needed = Main.overview.visible || this._hovering || this._revealed || this._dragging || this._menu !== null;
        let show;
        if (mode === 'stay')
            show = true;
        else if (mode === 'make-room')
            show = needed || !overlap;
        else
            show = needed;
        // Over a window the bar is fully opaque; over the desktop it lets a
        // little through.
        const touched = windows.some(w => !w.minimized && w.maximized);
        const alpha = Main.overview.visible ? 1 : barOpacity(touched || (show && overlap));
        if (alpha !== this.barAlpha) {
            this.barAlpha = alpha;
            this._style.paintRoot();
        }
        // Away because a window came close reads differently from away
        // because it was asked to hide.
        this.state = show ? 'showing' : mode === 'make-room' ? 'making-room' : 'hidden';
        this._setShown(show, animated);
        this._shared.onState?.();
    }

    _windowsHere() {
        const workspace = global.workspace_manager.get_active_workspace();
        return workspace.list_windows().filter(window => window.get_monitor() === this.monitorIndex).map(window => {
            const rect = window.get_frame_rect();
            return {
                rect: {x: rect.x, y: rect.y, width: rect.width, height: rect.height},
                minimized: window.minimized,
                skipTaskbar: window.skip_taskbar || window.get_window_type() !== Meta.WindowType.NORMAL,
                onMonitor: true,
                maximized: window.maximized_vertically && window.maximized_horizontally,
            };
        });
    }

    _syncHandle() {
        const wanted = Boolean(this._style?.handle) && !this.shown && !Main.overview.visible;
        if (!wanted) {
            this._handle.visible = false;
            return;
        }
        const monitor = this.monitor;
        const [w, h] = this.vertical ? [6, 96] : [96, 6];
        const gap = 8;
        let x, y;
        if (this.side === 'bottom') {
            x = monitor.x + Math.round((monitor.width - w) / 2);
            y = monitor.y + monitor.height - h - gap;
        } else {
            y = monitor.y + Math.round((monitor.height - h) / 2);
            x = this.side === 'left' ? monitor.x + gap : monitor.x + monitor.width - w - gap;
        }
        this._handle.set_position(x, y);
        this._handle.set_size(w, h);
        this._handle.set_style(`background-color: ${this.theme.roles.outline}; border-radius: 3px;`);
        this._handle.visible = true;
    }

    _setShown(show, animated) {
        if (show === this.shown) {
            // A shown dock sits at its place, whatever an earlier slide left.
            const container = this._container;
            if (show && !container.get_transition('translation-x') && !container.get_transition('translation-y')) {
                container.translation_x = 0;
                container.translation_y = 0;
                container.visible = true;
            }
            this._syncHandle();
            return;
        }
        this.shown = show;
        this._syncHandle();
        const container = this._container;
        const offset = this._edgeThickness();
        const hidden = {
            bottom: {translation_x: 0, translation_y: offset},
            left: {translation_x: -offset, translation_y: 0},
            right: {translation_x: offset, translation_y: 0},
        }[this.side];
        if (show) {
            container.visible = true;
            ease(container, {translation_x: 0, translation_y: 0, opacity: 255}, {duration: animated ? STATE_MS : 0});
        } else {
            this.tooltip.hide();
            ease(container, {...hidden, opacity: 0}, {
                duration: animated ? STATE_MS : 0,
                onComplete: () => {
                    if (!this.shown)
                        container.visible = false;
                },
            });
        }
    }

    // The dock's depth from the screen edge, gap included.
    _edgeThickness() {
        return this.vertical ? this._container.width : this._container.height;
    }

    // Where the dock is when it shows, whether it shows now or not.
    _shownRect() {
        if (!this._style)
            return {x: 0, y: 0, width: 0, height: 0};
        const [x, y] = this._container.get_position();
        return {x, y, width: this._container.width, height: this._container.height};
    }

    _contains(px, py, slack = 0) {
        const r = this._shownRect();
        return px >= r.x - slack && px < r.x + r.width + slack && py >= r.y - slack && py < r.y + r.height + slack;
    }

    _queueReposition() {
        if (this._repositioning)
            return;
        this._repositioning = true;
        global.compositor.get_laters().add(Meta.LaterType.BEFORE_REDRAW, () => {
            this._repositioning = false;
            this._reposition();
            return GLib.SOURCE_REMOVE;
        });
    }

    _reposition() {
        const monitor = this.monitor;
        if (!monitor || !this._style)
            return;
        const gap = this._style.edgeGap;
        const full = this._style.fullLength;
        // The gap belongs to the dock, so a dock that keeps its place keeps
        // the gap free as well.
        const padding = {bottom: `0 0 ${gap}px 0`, left: `0 0 0 ${gap}px`, right: `0 ${gap}px 0 0`}[this.side];
        this._container.set_style(`padding: ${padding};`);
        // Below the top bar on a side dock.
        const top = monitor.index === Main.layoutManager.primaryIndex ? Main.panel.height : 0;
        if (full) {
            if (this.vertical)
                this._container.set_size(-1, monitor.height - top);
            else
                this._container.set_size(monitor.width, -1);
        } else {
            this._container.set_size(-1, -1);
        }
        const [, width] = this._container.get_preferred_width(-1);
        const [, height] = this._container.get_preferred_height(width);
        const w = full && !this.vertical ? monitor.width : width;
        const h = full && this.vertical ? monitor.height - top : height;
        let x, y;
        if (this.side === 'bottom') {
            x = monitor.x + Math.round((monitor.width - w) / 2);
            y = monitor.y + monitor.height - h;
        } else {
            y = monitor.y + top + Math.round((monitor.height - top - h) / 2);
            x = this.side === 'left' ? monitor.x : monitor.x + monitor.width - w;
        }
        this._container.set_position(x, y);
        if (this._fit(full ? 0 : this.vertical ? h : w, this.vertical ? monitor.height - top : monitor.width))
            return;
        this._setupBarrier();
    }

    // A dock longer than its edge takes smaller icons, step by step, and
    // grows back once there is room again. Returns true when it rebuilt.
    _fit(length, room) {
        const margin = 16;
        const full = ICON_PX[this._settings.iconSize];
        if (length > room - margin && this.iconPx > 24) {
            this._shrink++;
        } else if (this._shrink > 0 && length * (this.iconPx + 8) / this.iconPx < room - margin) {
            this._shrink--;
        } else {
            return false;
        }
        const keep = this._shrink;
        this.iconPx = full - 8 * keep;
        this._rebuildStyle();
        return true;
    }

    _rebuildStyle() {
        this._style?.destroy();
        this._style = makeStyle(this._settings.style, this);
        this._container.set_child(this._style.actor);
        if (this._snapshot)
            this._style.update(this._snapshot);
        this._queueReposition();
    }

    // A push against the edge brings a hidden dock back.
    _setupBarrier() {
        this._removeBarrier();
        if (!this._style || this._settings.whenWindowClose === 'stay')
            return;
        const monitor = this.monitor;
        const shown = this._shownRect();
        // The barrier stays on the monitor even if the dock is longer.
        const top = Math.max(monitor.y, shown.y);
        const left = Math.max(monitor.x, shown.x);
        const r = {
            x: left,
            y: top,
            width: Math.min(shown.x + shown.width, monitor.x + monitor.width) - left,
            height: Math.min(shown.y + shown.height, monitor.y + monitor.height) - top,
        };
        if (r.width <= 0 || r.height <= 0)
            return;
        let params;
        if (this.side === 'bottom') {
            const edge = monitor.y + monitor.height;
            params = {x1: r.x, x2: r.x + r.width, y1: edge, y2: edge, directions: Meta.BarrierDirection.NEGATIVE_Y};
        } else if (this.side === 'left') {
            params = {x1: monitor.x, x2: monitor.x, y1: r.y, y2: r.y + r.height, directions: Meta.BarrierDirection.POSITIVE_X};
        } else {
            const edge = monitor.x + monitor.width;
            params = {x1: edge, x2: edge, y1: r.y, y2: r.y + r.height, directions: Meta.BarrierDirection.NEGATIVE_X};
        }
        try {
            this._barrier = new Meta.Barrier({backend: global.backend, ...params});
            this._pressure = new Layout.PressureBarrier(PRESSURE_THRESHOLD, PRESSURE_TIMEOUT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW);
            this._pressure.addBarrier(this._barrier);
            this._pressure.connect('trigger', () => this.reveal());
        } catch (e) {
            logError(e, 'Harbor: no pressure barrier');
            this._removeBarrier();
        }
    }

    _removeBarrier() {
        if (this._pressure) {
            this._pressure.destroy();
            this._pressure = null;
        }
        if (this._barrier) {
            this._barrier.destroy();
            this._barrier = null;
        }
    }

    // Brings the dock back until the pointer has been away from it a moment.
    reveal() {
        this._revealed = true;
        this._evaluate();
        if (this._leave)
            GLib.source_remove(this._leave);
        this._leave = GLib.timeout_add(GLib.PRIORITY_DEFAULT, LEAVE_MS * 4, () => {
            this._leave = 0;
            if (!this._container.hover) {
                this._revealed = false;
                this._evaluate();
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    destroy() {
        if (this._leave)
            GLib.source_remove(this._leave);
        this._leave = 0;
        this._removeBarrier();
        this._menu?.destroy();
        this._menu = null;
        Main.overview.disconnectObject(this);
        Main.layoutManager.disconnectObject(this);
        global.display.disconnectObject(this);
        // The buttons hide the tooltip as they go, so they go first.
        this._style?.destroy();
        this._style = null;
        this.tooltip.destroy();
        Main.layoutManager.removeChrome(this._container);
        this._container.destroy();
        Main.layoutManager.removeChrome(this._handle);
        this._handle.destroy();
    }
}
