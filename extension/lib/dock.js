// HarborDock: one dock on one monitor. It places the chosen style at the
// edge, keeps it out of the way of windows the way the settings ask, makes
// room for drops, and opens the menus of its items.

import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Mtk from 'gi://Mtk';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as DND from 'resource:///org/gnome/shell/ui/dnd.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {appMenu, move, pin, placeMenu, unpin} from './appmenu.js';
import {SPRINGS, expressive, normal, run, spring, springShare, stretch} from './choreo.js';
import {debug} from './debug.js';
import {anyOverlaps, fromCenter} from './layout.js';
import {STATE_MS, animationsOn, ease} from './motion.js';
import * as Places from './places.js';
import {ICON_PX} from './settings.js';
import {settleMs} from './spring.js';
import {Tooltip} from './tooltip.js';
import {windowList} from './windowlist.js';
import {makeStyle} from './styles/index.js';
import {rectIn} from './styles/base.js';

// How long the pointer rests at the edge, or on the handle, before the
// dock comes: long enough that passing by does nothing.
const EDGE_MS = 200;
const HANDLE_MS = 150;
// How long the dock stays after the pointer has left it.
const LEAVE_MS = 500;
// Sizes and paddings are drawn for this icon size and scaled from it.
const BASE_ICON = 48;
// "See-through", as in Ledge.
const SEE_THROUGH = 0.78;

// Appearing, at normal speed: the dock rises, its bars spread, then the
// items pop up from the middle outwards; groups follow one another.
const SPREAD_AT = 90;
const ITEMS_AT = 150;
const GROUP_STEP = 90;
const OVERLAY_AT = 260;
// Going: the reverse, without swinging, in about two thirds of the time.
const GO_ITEM_MS = 120;
const GO_ITEM_STEP = 14;
const GO_BARS_AT = 90;
const GO_BARS_MS = 170;
const GO_SINK_AT = 190;
const GO_SINK_MS = 150;

const easeIn = t => t * t * t;
const clamp = t => Math.max(0, Math.min(1, t));

export class Dock {
    // shared: {theme, model, places, status, settings: () => current, onState}
    constructor(monitorIndex, shared) {
        this.monitorIndex = monitorIndex;
        this._shared = shared;
        this.theme = shared.theme;
        this.tooltip = new Tooltip(this.theme);
        this.barAlpha = 1;
        this.shown = true;
        this._revealed = false;
        this._hovering = false;
        this._dragging = false;
        this._menu = null;
        this._leave = 0;
        this._edgeWait = 0;
        this._handleWait = 0;
        this._choreo = null;
        this._ambient = false;
        this._struts = null;
        this._snapshot = null;
        this._geometryQueued = false;

        this._container = new St.Bin({
            style_class: 'harbor-dock',
            reactive: true,
            track_hover: true,
        });
        this._container._delegate = this;
        // At shell exit the actors go before Harbor is disabled.
        this._container.connect('destroy', () => {
            this._clearTimers();
            this._choreo?.stop();
            this._choreo = null;
            this._style = null;
        });
        this._container.connect('notify::hover', () => this._hoverChanged());
        this._container.connect('notify::allocation', () => this._queueReposition());
        // The handle: a thin grip, the only thing left of a dock that is away.
        this._handle = new St.Button({style_class: 'harbor-handle', reactive: true, track_hover: true, visible: false, accessible_name: 'Show the dock'});
        this._handle.set_pivot_point(0.5, 0.5);
        this._handle.connect('clicked', () => this.reveal());
        this._handle.connect('notify::hover', () => this._handleHovered());
        Main.layoutManager.addChrome(this._handle);
        // A strip one pixel deep along the edge under the dock: resting on
        // it brings the dock back, no push needed.
        this._edge = new St.Widget({reactive: true, visible: false});
        this._edge.connect('enter-event', () => this._edgeEntered());
        this._edge.connect('leave-event', () => this._edgeLeft());
        Main.layoutManager.addChrome(this._edge);

        this._shared.power?.connectObject('changed', () => this._syncAmbient(), this);
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
        const before = this._settings;
        const rebuild = ['style', 'position', 'iconSize', 'trashAndDrives', 'whenWindowClose', 'symbolicIcons']
            .some(key => settings[key] !== before[key]) ||
            JSON.stringify(settings.symbols) !== JSON.stringify(before.symbols);
        this._settings = settings;
        if (rebuild) {
            this._applySettings(settings, {fade: true});
            // A new look shows itself, even on a dock that is away.
            if (settings.style !== before.style || settings.position !== before.position || settings.iconSize !== before.iconSize)
                this.reveal();
            return;
        }
        this._setBarAlpha(settings.seeThrough ? SEE_THROUGH : 1);
        this.update(this._snapshot);
        this._syncHandle();
        this._syncAmbient();
    }

    _setBarAlpha(alpha) {
        if (alpha === this.barAlpha)
            return;
        this.barAlpha = alpha;
        this._style?.paintRoot();
    }

    _applySettings(settings, {fade = false} = {}) {
        this._settings = settings;
        this.side = settings.position;
        this._shrink = 0;
        this.iconPx = ICON_PX[settings.iconSize];
        this.barAlpha = settings.seeThrough ? SEE_THROUGH : 1;
        const old = this._style;
        // The new style is made at the swap, so it never paints off stage.
        const swap = () => {
            if (this._style !== old)
                return;
            old?.destroy();
            this._style = makeStyle(this._settings.style, this);
            this._container.set_child(this._style.actor);
            debug(this, 'style', {style: this._settings.style, side: this.side, icon: this.iconPx});
            this._track();
            if (this._snapshot)
                this.update(this._snapshot);
            this._reposition();
            this._evaluate({animated: false});
            this._syncAmbient();
        };
        if (!old || !fade || !this._container.visible) {
            swap();
        } else if (expressive()) {
            // The old look goes at once; the new one pops up (reveal).
            this._stopChoreo();
            this.shown = false;
            this._container.visible = false;
            swap();
        } else {
            ease(old.actor, {opacity: 0}, {duration: STATE_MS / 2, onComplete: () => {
                swap();
                if (!this._style)
                    return;
                this._style.actor.opacity = 0;
                ease(this._style.actor, {opacity: 255}, {duration: STATE_MS / 2});
            }});
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
        this._style.setAmbient(this._ambient);
        this._evaluate();
        this._queueIconGeometry();
    }

    // Where a window minimises to: its app's icon here. GNOME's own
    // minimise animation then flies the window into it.
    _queueIconGeometry() {
        if (this._geometryQueued)
            return;
        this._geometryQueued = true;
        global.compositor.get_laters().add(Meta.LaterType.BEFORE_REDRAW, () => {
            this._geometryQueued = false;
            this._setIconGeometry();
            return GLib.SOURCE_REMOVE;
        });
    }

    _setIconGeometry() {
        if (!this._style || !this._container.get_stage())
            return;
        const [cx, cy] = this._container.get_position();
        for (const button of this._style.appButtons()) {
            const r = rectIn(button, this._container);
            if (!r || r.width <= 0)
                continue;
            const rect = new Mtk.Rectangle({x: Math.round(cx + r.x), y: Math.round(cy + r.y), width: Math.round(r.width), height: Math.round(r.height)});
            for (const window of button.item.windows) {
                try {
                    window.set_icon_geometry(rect);
                } catch {}
            }
        }
    }

    // A new bar starts at the share the dock is shown with.
    get revealShare() {
        return this.shown && !this._choreo ? 1 : 0;
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
        debug(this, 'menu open');
        this._dropMenu();
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

    // Closing a menu reports that it closed; the old one must not answer.
    _dropMenu() {
        const old = this._menu;
        this._menu = null;
        if (old) {
            old.onClosed = null;
            old.destroy();
        }
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
        this._watchDrag();
        return DND.DragMotionResult.MOVE_DROP;
    }

    // DND only tells a target while the pointer is over it, so the dock
    // watches the drag to close the gap once the pointer moves away.
    _watchDrag() {
        if (this._dragWatch)
            return;
        this._dragWatch = {
            // DND walks its list of monitors while calling them, so this
            // one is taken off only after the drag has ended.
            dragMotion: event => {
                if (!this._contains(event.x, event.y, 8))
                    this._closeGap();
                return DND.DragMotionResult.CONTINUE;
            },
            dragDrop: () => {
                this._closeGap();
                GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                    this._clearDragWatch();
                    return GLib.SOURCE_REMOVE;
                });
                return DND.DragDropResult.CONTINUE;
            },
        };
        DND.addDragMonitor(this._dragWatch);
    }

    _clearDragWatch() {
        if (this._dragWatch)
            DND.removeDragMonitor(this._dragWatch);
        this._dragWatch = null;
    }

    acceptDrop(source) {
        const app = source?.app ?? null;
        if (!app || app.is_window_backed())
            return false;
        const id = app.get_id();
        const index = this._dropIndex ?? -1;
        this._closeGap();
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
        this._closeGap();
        this._clearDragWatch();
    }

    _closeGap() {
        this._dropIndex = null;
        if (!this._style)
            return;
        for (const button of this._style.appButtons()) {
            if (button.translation_x !== 0 || button.translation_y !== 0)
                ease(button, {translation_x: 0, translation_y: 0}, {duration: 120});
        }
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

    // The rail keeps its room, so it acts as if set to Stay unless hidden.
    _mode() {
        const mode = this._settings.whenWindowClose;
        return this._style?.reservesSpace && mode !== 'hide' ? 'stay' : mode;
    }

    _evaluate({animated = true} = {}) {
        if (!this._style)
            return;
        const mode = this._mode();
        const overlap = mode === 'make-room' && anyOverlaps(this._shownRect(), this._focusedWindowsHere());
        const reasons = {
            overview: Main.overview.visible,
            hover: this._hovering,
            revealed: this._revealed,
            drag: this._dragging,
            menu: this._menu !== null,
        };
        const needed = Object.values(reasons).some(Boolean);
        let show;
        if (mode === 'stay')
            show = true;
        else if (mode === 'make-room')
            show = needed || !overlap;
        else
            show = needed;
        // Away because a window came close reads differently from away
        // because it was asked to hide.
        const state = show ? 'showing' : mode === 'make-room' ? 'making-room' : 'hidden';
        if (state !== this.state) {
            const why = Object.entries(reasons).filter(([, on]) => on).map(([name]) => name).join(',');
            debug(this, state, {mode, overlap, why: why || null});
        }
        this.state = state;
        this._setShown(show, animated);
        this._shared.onState?.();
    }

    // Make room gives way to the focused app only, as Intellihide does:
    // the windows of the app in front, on this monitor and workspace.
    _focusedWindowsHere() {
        const focus = global.display.focus_window;
        if (!focus)
            return [];
        const app = Shell.WindowTracker.get_default().get_window_app(focus);
        const windows = app?.get_windows() ?? [focus];
        const workspace = global.workspace_manager.get_active_workspace();
        return windows
            .filter(window => window.get_monitor() === this.monitorIndex)
            .filter(window => window.get_workspace() === workspace || window.is_on_all_workspaces())
            .map(window => {
                const rect = window.get_frame_rect();
                return {
                    rect: {x: rect.x, y: rect.y, width: rect.width, height: rect.height},
                    minimized: window.minimized,
                    skipTaskbar: window.skip_taskbar || window.get_window_type() !== Meta.WindowType.NORMAL,
                    onMonitor: true,
                };
            });
    }

    // Handle and edge

    _handleWanted() {
        return Boolean(this._settings.handles?.[this._settings.style]) && this._awayAndAllowed();
    }

    // Away from a visible desktop: not in the overview, not under fullscreen.
    _awayAndAllowed() {
        return Boolean(this._style) && !this.shown && !Main.overview.visible && this._allowedVisible();
    }

    _syncHandle() {
        if (!this._handleWanted()) {
            this._handle.visible = false;
            this._handle.set_scale(1, 1);
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

    // Under the pointer the handle grows, and with "Show on hover" it
    // brings the dock after a moment.
    _handleHovered() {
        if (this._handleWait)
            GLib.source_remove(this._handleWait);
        this._handleWait = 0;
        const hover = this._handle.hover && this._handle.visible;
        const grow = hover ? 1.7 : 1;
        spring(this._handle, this.vertical ? {scale_x: grow} : {scale_y: grow}, {spring: SPRINGS.hover});
        if (!hover || !this._settings.handleHover)
            return;
        this._handleWait = GLib.timeout_add(GLib.PRIORITY_DEFAULT, HANDLE_MS, () => {
            this._handleWait = 0;
            if (this._handle.hover) {
                debug(this, 'handle hover');
                this.reveal();
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _syncEdge() {
        const wanted = this._awayAndAllowed() && this._mode() !== 'stay';
        if (!wanted) {
            this._edge.visible = false;
            this._edgeLeft();
            return;
        }
        const monitor = this.monitor;
        const shown = this._shownRect();
        const left = Math.max(monitor.x, shown.x);
        const top = Math.max(monitor.y, shown.y);
        const right = Math.min(monitor.x + monitor.width, shown.x + shown.width);
        const bottom = Math.min(monitor.y + monitor.height, shown.y + shown.height);
        if (right <= left || bottom <= top) {
            this._edge.visible = false;
            return;
        }
        if (this.side === 'bottom') {
            this._edge.set_position(left, monitor.y + monitor.height - 1);
            this._edge.set_size(right - left, 1);
        } else {
            this._edge.set_position(this.side === 'left' ? monitor.x : monitor.x + monitor.width - 1, top);
            this._edge.set_size(1, bottom - top);
        }
        this._edge.visible = true;
    }

    _edgeEntered() {
        if (this._edgeWait)
            return;
        this._edgeWait = GLib.timeout_add(GLib.PRIORITY_DEFAULT, EDGE_MS, () => {
            this._edgeWait = 0;
            debug(this, 'edge rest');
            this.reveal();
            return GLib.SOURCE_REMOVE;
        });
    }

    _edgeLeft() {
        if (this._edgeWait)
            GLib.source_remove(this._edgeWait);
        this._edgeWait = 0;
    }

    _clearTimers() {
        for (const name of ['_leave', '_edgeWait', '_handleWait']) {
            if (this[name])
                GLib.source_remove(this[name]);
            this[name] = 0;
        }
    }

    // GNOME hides the dock under a fullscreen window (trackFullscreen); the
    // dock never shows itself against that.
    _allowedVisible() {
        const monitor = this.monitor;
        return !(global.window_group.visible && monitor?.inFullscreen);
    }

    // Appearing and going

    _setShown(show, animated) {
        const container = this._container;
        if (show === this.shown) {
            // A shown dock sits at its place, whatever an earlier slide left.
            if (show && !this._choreo && !container.get_transition('translation-x') && !container.get_transition('translation-y')) {
                container.translation_x = 0;
                container.translation_y = 0;
                container.opacity = 255;
                container.visible = this._allowedVisible();
            }
            this._syncHandle();
            this._syncEdge();
            return;
        }
        this.shown = show;
        this._syncHandle();
        this._syncEdge();
        this._syncAmbient();
        if (!show)
            this.tooltip.hide();
        if (animated && expressive()) {
            if (show)
                this._appear();
            else
                this._go();
            return;
        }
        this._stopChoreo();
        const offset = this._edgeThickness();
        const hidden = {
            bottom: {translation_x: 0, translation_y: offset},
            left: {translation_x: -offset, translation_y: 0},
            right: {translation_x: offset, translation_y: 0},
        }[this.side];
        if (show) {
            this._settle(1);
            container.visible = this._allowedVisible();
            ease(container, {translation_x: 0, translation_y: 0, opacity: 255}, {duration: animated ? STATE_MS : 0});
        } else {
            ease(container, {...hidden, opacity: 0}, {
                duration: animated ? STATE_MS : 0,
                onComplete: () => {
                    if (!this.shown)
                        container.visible = false;
                },
            });
        }
    }

    _stopChoreo() {
        this._choreo?.stop();
        this._choreo = null;
    }

    // Every bar and item at one share: 1 is shown, 0 gone.
    _settle(share) {
        const style = this._style;
        if (!style)
            return;
        for (const group of style.revealGroups()) {
            for (const ghost of group.bars)
                style.setSpread(ghost, share);
            for (const item of group.items)
                item.set_scale(share, share);
        }
        style.overlay.opacity = Math.round(255 * share);
        style.revealFrame();
    }

    // How far the dock has risen from its edge: 0 down, 1 up.
    _rise() {
        const offset = this._edgeThickness();
        if (!offset)
            return 1;
        const along = this.vertical ? this._container.translation_x : this._container.translation_y;
        return clamp(1 - Math.abs(along) / offset);
    }

    _setRise(share) {
        const offset = this._edgeThickness() * (1 - share);
        const container = this._container;
        if (this.side === 'bottom')
            container.translation_y = offset;
        else
            container.translation_x = this.side === 'left' ? -offset : offset;
    }

    // Rises as a pill in the middle of the edge, spreads to both sides with
    // a swing, and lets the items pop up from the middle outwards. Taken up
    // from wherever an earlier move left things.
    _appear() {
        const container = this._container;
        const style = this._style;
        this._stopChoreo();
        container.remove_all_transitions();
        if (!container.visible) {
            this._settle(0);
            this._setRise(0);
        }
        container.opacity = 255;
        container.visible = this._allowedVisible();
        const tracks = [];
        const add = (from, at, curve, set) => tracks.push({from, at, curve, set});
        add(this._rise(), 0, SPRINGS.rise, v => this._setRise(v));
        const groups = style.revealGroups();
        const groupRanks = fromCenter(groups.length);
        groups.forEach((group, g) => {
            const after = (group.rank ?? groupRanks[g]) * GROUP_STEP;
            for (const ghost of group.bars)
                add(ghost.spread, SPREAD_AT + after, SPRINGS.spread, v => style.setSpread(ghost, Math.max(0, v)));
            const ranks = fromCenter(group.items.length);
            group.items.forEach((item, i) => {
                add(item.scale_x, ITEMS_AT + after + ranks[i] * style.itemStep, SPRINGS.pop, v => {
                    const scale = Math.max(0, v);
                    item.set_scale(scale, scale);
                });
            });
        });
        add(style.overlay.opacity / 255, OVERLAY_AT, SPRINGS.press, v => (style.overlay.opacity = Math.round(255 * clamp(v))));
        const length = Math.max(...tracks.map(track => track.at + settleMs(track.curve)));
        debug(this, 'appear', {ms: stretch(length)});
        this._choreo = run(container, length, ms => {
            const done = ms >= stretch(length);
            for (const track of tracks) {
                const share = done ? 1 : springShare(ms, track.at, track.curve);
                track.set(track.from + (1 - track.from) * share);
            }
            style.revealFrame();
        }, () => {
            this._choreo = null;
            this._syncAmbient();
            this._queueIconGeometry();
        });
    }

    // The reverse: the items gather in the middle, the bar draws together
    // into a pill, and the pill sinks into the edge.
    _go() {
        const container = this._container;
        const style = this._style;
        this._stopChoreo();
        container.remove_all_transitions();
        const tracks = [];
        const add = (from, at, length, set) => tracks.push({from, at, length, set});
        const groups = style.revealGroups();
        for (const group of groups) {
            const ranks = fromCenter(group.items.length);
            const outer = Math.max(0, ...ranks);
            group.items.forEach((item, i) => add(item.scale_x, (outer - ranks[i]) * GO_ITEM_STEP, GO_ITEM_MS, v => item.set_scale(v, v)));
            for (const ghost of group.bars)
                add(ghost.spread, GO_BARS_AT, GO_BARS_MS, v => style.setSpread(ghost, v));
        }
        add(style.overlay.opacity / 255, 0, GO_ITEM_MS, v => (style.overlay.opacity = Math.round(255 * v)));
        add(this._rise(), GO_SINK_AT, GO_SINK_MS, v => this._setRise(v));
        const length = Math.max(...tracks.map(track => track.at + track.length));
        debug(this, 'go', {ms: stretch(length)});
        this._choreo = run(container, length, ms => {
            const now = normal(ms);
            for (const track of tracks)
                track.set(track.from * (1 - easeIn(clamp((now - track.at) / track.length))));
            style.revealFrame();
        }, () => {
            this._choreo = null;
            if (!this.shown)
                container.visible = false;
        });
    }

    // "Always moving": shapes turn slowly while the dock shows, with
    // animations on and not on battery.
    _syncAmbient() {
        const settings = this._settings;
        const on = Boolean(settings.alwaysMoving && settings.expressiveMotion && animationsOn() &&
            this.shown && !this._shared.power?.onBattery);
        this._ambient = on;
        this._style?.setAmbient(on);
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
        debug(this, 'place', {rect: {x, y, width: w, height: h}});
        this._syncEdge();
        this._queueIconGeometry();
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
        debug(this, 'fit', {length, room, icon: this.iconPx});
        this._rebuildStyle();
        return true;
    }

    _rebuildStyle() {
        this._style?.destroy();
        this._style = makeStyle(this._settings.style, this);
        this._container.set_child(this._style.actor);
        if (this._snapshot)
            this._style.update(this._snapshot);
        this._style.setAmbient(this._ambient);
        this._queueReposition();
    }

    // Brings the dock back until the pointer has been away from it a moment.
    reveal({animated = true} = {}) {
        this._revealed = true;
        this._evaluate({animated});
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
        this._clearTimers();
        this._stopChoreo();
        this._shared.power?.disconnectObject(this);
        this._dropMenu();
        this._clearDragWatch();
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
        Main.layoutManager.removeChrome(this._edge);
        this._edge.destroy();
    }
}
