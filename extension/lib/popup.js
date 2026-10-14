// The menu behind the top bar mark: one loud tile with the open windows,
// what runs, what is pinned, and the settings folded away below a chevron.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {HarborChevron} from './controls/chevron.js';
import {HarborSegmented} from './controls/segmented.js';
import {HarborStyleList} from './controls/stylelist.js';
import {HarborSwatch} from './controls/swatch.js';
import {HarborSwitch} from './controls/switch.js';
import {appTile, paintTile} from './icon.js';
import {STATE_MS, ease} from './motion.js';
import {COLOURS} from './palettes.js';
import {ICON_SIZES, MOTION_SPEEDS, POSITIONS, WHEN_WINDOW_CLOSE} from './settings.js';
import {text} from './text.js';
import * as Words from './words.js';

const CAPTIONS = {
    left: 'Left', bottom: 'Bottom', right: 'Right',
    small: 'Small', medium: 'Medium', large: 'Large', huge: 'Huge',
    'stay': 'Stay', 'make-room': 'Make room', 'hide': 'Hide',
    quick: 'Quick', normal: 'Normal', slow: 'Slow',
};
// [key, title, note]; a key of "handles" means the chosen style's handle.
const LOOK_SWITCHES = [
    ['symbolicIcons', 'Symbolic icons', 'Flat symbols in the colours of the dock. Right-click an app to choose its symbol.'],
    ['inkFocus', 'Ink focus', 'The focused app is black, in dark mode white. Off, it takes the colour of the style.'],
    ['lightDock', 'Light dock', 'The dock stays light when the desktop is dark.'],
    ['seeThrough', 'See-through', 'Lets the wallpaper show through the dock.'],
    ['expressiveMotion', 'Expressive motion', 'The dock rises and spreads out, icons pop up, shapes glide and morph.'],
];
const MOTION_SWITCHES = [
    ['alwaysMoving', 'Always moving', 'Shapes turn slowly while nothing happens. Rests on battery.'],
];
const MORE_SWITCHES = [
    ['trashAndDrives', 'Trash and drives', 'Shows the trash and plugged-in drives at the end of the dock.'],
    ['countsOnIcons', 'Counts on icons', 'Shows unread counts and progress that apps report.'],
    ['everyMonitor', 'Every monitor', 'Puts a dock on each screen, not only the main one.'],
];
const COLOUR_NAMES = {
    blue: 'Blue', violet: 'Violet', green: 'Green', teal: 'Teal',
    orange: 'Orange', salmon: 'Salmon', pink: 'Pink', white: 'White',
};
const CLOSING_NOTE = 'Clicks adapt by themselves: one window focuses or minimises, several show a list. Make room gives way to the app in front; rest the pointer on the edge to bring the dock back.';
const PINNED_NOTE = 'Drag an icon in the dock to move it. Right-click it to unpin.';
const DASH_TO_DOCK = 'Dash to Dock is on too. Harbor replaces it; switch it off in Extensions.';
// Room the menu leaves above and below itself on the screen.
const SCREEN_MARGIN = 48;

function column(styleClass = '') {
    return new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, style_class: styleClass, x_expand: true});
}

function caption(label) {
    return text('label', {styleClass: 'harbor-muted', text: label});
}

export class Popup {
    // settings: the SettingsStore; onActivate(entry) acts like a click in the dock.
    constructor({theme, settings, onActivate, onClose}) {
        this._theme = theme;
        this._settings = settings;
        this._onActivate = onActivate;
        this._onClose = onClose;
        this._snapshot = null;
        this._runningKey = '';
        this._pinnedKey = '';
        this._tiles = [];
        this._overflowOpen = false;

        this._content = column('harbor-content');
        this.actor = new St.ScrollView({
            style_class: 'harbor-scroll',
            child: this._content,
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            overlay_scrollbars: true,
        });
        this.actor.connect('destroy', () => this._stop());
        this._buildLoud();
        this._buildRunning();
        this._buildPinned();
        this._buildFooter();
        this._buildOverflow();
        this._buildSettings();
        this._theme.connectObject('changed', () => this._paintTiles(), this);
        this.actor.connect('destroy', () => this._theme.disconnectObject(this));
        this.setSettings(settings.current, {animated: false});
    }

    _buildLoud() {
        const tile = column('harbor-tile harbor-tile-loud');
        tile.add_child(text('label', {styleClass: 'harbor-loud-text', text: 'Open windows'}));
        this._windows = text('metric-l', {styleClass: 'harbor-loud-text'});
        this._across = text('label', {styleClass: 'harbor-loud-text'});
        this._most = text('body-strong', {styleClass: 'harbor-loud-text harbor-loud-most'});
        tile.add_child(this._windows);
        tile.add_child(this._across);
        tile.add_child(this._most);
        this._content.add_child(tile);
    }

    _buildRunning() {
        this._running = column('harbor-rows');
        this._content.add_child(this._running);
    }

    _buildPinned() {
        const tile = column('harbor-tile');
        tile.add_child(caption('Pinned to the dock'));
        const flow = new Clutter.FlowLayout({column_spacing: 6, row_spacing: 6, homogeneous: false});
        this._pinned = new St.Widget({layout_manager: flow, x_expand: true});
        tile.add_child(this._pinned);
        tile.add_child(text('aside', {styleClass: 'harbor-muted', wrap: true, text: PINNED_NOTE}));
        this._content.add_child(tile);
    }

    // Only there while Dash to Dock runs beside Harbor.
    _buildFooter() {
        this._footer = text('aside', {styleClass: 'harbor-muted harbor-footer', wrap: true, text: DASH_TO_DOCK});
        this._content.add_child(this._footer);
    }

    // The settings are not needed day to day, so they wait behind a chevron
    // and are closed again whenever the menu opens.
    _buildOverflow() {
        this._chevron = new HarborChevron({accessibleName: 'Settings'});
        this._chevron.connect('clicked', () => this._setOverflow(!this._overflowOpen));
        this._content.add_child(this._chevron);
    }

    _buildSettings() {
        const tile = column('harbor-tile harbor-settings');
        const block = (label, control) => {
            const box = column('harbor-block');
            box.add_child(caption(label));
            box.add_child(control);
            tile.add_child(box);
            return box;
        };
        const set = (key, value) => this._settings.set(key, value);
        const segmented = (key, values, label) => {
            const control = new HarborSegmented({
                theme: this._theme,
                choices: values.map(value => ({value, caption: CAPTIONS[value]})),
                onPick: value => set(key, value),
                accessibleName: label,
            });
            const box = block(label, control);
            this._segmented[key] = control;
            return box;
        };
        const switches = list => {
            const group = column('harbor-switches');
            for (const [key, title, note] of list)
                group.add_child(this._switchRow(key, title, note));
            tile.add_child(group);
            return group;
        };
        this._segmented = {};
        this._switches = {};

        this._styleList = new HarborStyleList({theme: this._theme, onPick: style => set('style', style)});
        block('Dock style', this._styleList);
        // The handle belongs to the chosen style; each style keeps its own.
        const handle = column('harbor-switches');
        handle.add_child(this._switchRow('handles', 'Handle when away', 'A thin grip stays at the edge while this style is away.'));
        this._hoverRow = this._switchRow('handleHover', 'Show on hover', 'Resting on the handle brings the dock; off, it takes a click.');
        handle.add_child(this._hoverRow);
        this._longRow = this._switchRow('longHandle', 'Long handle', 'The handle is twice as long, so it is easier to find.');
        handle.add_child(this._longRow);
        tile.add_child(handle);

        segmented('position', POSITIONS, 'Where the dock sits');
        segmented('iconSize', ICON_SIZES, 'Icon size');
        segmented('whenWindowClose', WHEN_WINDOW_CLOSE, 'When a window comes close');
        switches(LOOK_SWITCHES);
        this._motionBlock = segmented('motionSpeed', MOTION_SPEEDS, 'Speed of motion');
        this._motionSwitches = switches(MOTION_SWITCHES);
        switches(MORE_SWITCHES);

        const swatches = new St.BoxLayout({style_class: 'harbor-swatches'});
        this._swatches = COLOURS.map(colour => {
            const swatch = new HarborSwatch({colour, theme: this._theme});
            const button = new St.Button({style_class: 'harbor-swatch', child: swatch, can_focus: true, accessible_name: COLOUR_NAMES[colour]});
            button.connect('clicked', () => set('colour', colour));
            swatches.add_child(button);
            return {colour, swatch};
        });
        block('Colour', swatches);
        tile.add_child(text('aside', {styleClass: 'harbor-muted', wrap: true, text: CLOSING_NOTE}));

        tile.visible = false;
        // The tile's height is animated, so what does not fit yet is cut off.
        tile.clip_to_allocation = true;
        this._settingsTile = tile;
        this._content.add_child(tile);
    }

    // One switch with its title and note; the whole row toggles it.
    _switchRow(key, title, note) {
        const row = new St.Button({style_class: 'harbor-switch-row', can_focus: true, x_expand: true, accessible_name: title});
        const box = new St.BoxLayout({style_class: 'harbor-switch-box', x_expand: true});
        const words = column();
        words.add_child(text('title-row', {text: title}));
        words.add_child(text('aside', {styleClass: 'harbor-muted', wrap: true, text: note}));
        const control = new HarborSwitch({theme: this._theme});
        box.add_child(words);
        box.add_child(control);
        row.set_child(box);
        row.connect('clicked', () => {
            const settings = this._settings.current;
            if (key === 'handles')
                this._settings.set('handles', {...settings.handles, [settings.style]: !settings.handles[settings.style]});
            else
                this._settings.set(key, !settings[key]);
        });
        this._switches[key] = control;
        return row;
    }

    setSettings(settings, {animated = true} = {}) {
        const appearance = {symbolicIcons: settings.symbolicIcons, symbols: settings.symbols};
        if (JSON.stringify(appearance) !== JSON.stringify(this._appearance)) {
            // The app tiles are made anew with their new symbols.
            this._appearance = appearance;
            this._runningKey = null;
            this._pinnedKey = null;
            if (this._snapshot)
                this.update(this._snapshot);
        }
        this._styleList.select(settings.style);
        for (const [key, control] of Object.entries(this._segmented))
            control.select(settings[key], {animated});
        for (const [key, control] of Object.entries(this._switches))
            control.set(key === 'handles' ? settings.handles[settings.style] : settings[key], {animated});
        for (const {colour, swatch} of this._swatches)
            swatch.setSelected(colour === settings.colour);
        // What only matters with something else on.
        this._hoverRow.visible = settings.handles[settings.style];
        this._longRow.visible = settings.handles[settings.style];
        this._motionBlock.visible = settings.expressiveMotion;
        this._motionSwitches.visible = settings.expressiveMotion;
    }

    setDashToDock(on) {
        this._footer.visible = on;
    }

    update(snapshot) {
        this._snapshot = snapshot;
        const apps = snapshot.apps.map(entry => ({name: entry.name, windows: entry.windows.length, lastUsed: entry.lastUsed}));
        this._windows.text = `${snapshot.windowCount}`;
        this._across.text = Words.acrossLine(snapshot.appCount, Math.max(1, snapshot.usedWorkspaces));
        this._most.text = Words.mostSentence(apps);
        this._syncRunning(snapshot);
        this._syncPinned(snapshot);
    }

    // Called when the menu opens.
    opened() {
        this._setOverflow(false, {animated: false});
        this._styleList.setOpen(false, {animated: false});
        this._fitScreen();
    }

    _fitScreen() {
        const monitor = Main.layoutManager.primaryMonitor;
        if (monitor)
            this.actor.set_style(`max-height: ${monitor.height - Main.panel.height - SCREEN_MARGIN}px;`);
    }

    _syncRunning(snapshot) {
        const running = snapshot.apps.filter(entry => entry.running);
        const key = running.map(entry => `${entry.id}|${entry.windows.length}|${entry.focused}`).join('\n');
        if (key === this._runningKey)
            return;
        this._runningKey = key;
        this._running.destroy_all_children();

        const header = new St.BoxLayout({style_class: 'harbor-row harbor-row-header', x_expand: true});
        header.add_child(caption(running.length ? 'Running now' : 'Nothing is running'));
        header.add_style_class_name(running.length ? 'harbor-row-first' : 'harbor-row-only');
        this._running.add_child(header);
        running.forEach((entry, i) => {
            const row = new St.Button({
                style_class: `harbor-row harbor-app-row${i === running.length - 1 ? ' harbor-row-last' : ''}`,
                can_focus: true,
                x_expand: true,
                accessible_name: entry.name,
            });
            const box = new St.BoxLayout({style_class: 'harbor-row-box', x_expand: true});
            const tile = this._tile(entry, {size: 40, iconSize: 24, radius: 12});
            box.add_child(tile);
            box.add_child(text('body-medium', {expand: true, ellipsize: true, text: entry.name}));
            box.add_child(text('label', {styleClass: 'harbor-muted', text: Words.windows(entry.windows.length)}));
            const dot = new St.Widget({style_class: 'harbor-focus-dot', y_align: Clutter.ActorAlign.CENTER, opacity: entry.focused ? 255 : 0});
            box.add_child(dot);
            row.set_child(box);
            row.connect('clicked', () => this._activate(entry.id));
            this._running.add_child(row);
        });
        this._paintTiles();
    }

    _syncPinned(snapshot) {
        const pinned = snapshot.apps.filter(entry => entry.pinned);
        const key = pinned.map(entry => entry.id).join('\n');
        if (key === this._pinnedKey)
            return;
        this._pinnedKey = key;
        this._pinned.destroy_all_children();
        for (const entry of pinned) {
            const tile = this._tile(entry, {size: 30, iconSize: 18, radius: 9});
            const button = new St.Button({style_class: 'harbor-pinned', child: tile, can_focus: true, accessible_name: entry.name});
            button.connect('clicked', () => this._activate(entry.id));
            this._pinned.add_child(button);
        }
        this._paintTiles();
    }

    // Rows are rebuilt as apps come and go, so the click finds its entry anew.
    _activate(id) {
        const entry = this._snapshot?.apps.find(candidate => candidate.id === id);
        this._onClose();
        if (entry)
            this._onActivate(entry);
    }

    _tile(entry, size) {
        const tile = appTile(entry.app, size, this._appearance);
        const item = {tile, tone: entry.tone};
        this._tiles.push(item);
        tile.connect('destroy', () => this._tiles.splice(this._tiles.indexOf(item), 1));
        return tile;
    }

    _paintTiles() {
        const roles = this._theme.roles;
        for (const {tile, tone} of this._tiles)
            paintTile(tile, roles, tone);
    }

    _setOverflow(open, {animated = true} = {}) {
        this._overflowOpen = open;
        this._chevron.setOpen(open, {animated});
        const tile = this._settingsTile;
        tile.remove_all_transitions();
        if (!animated) {
            tile.visible = open;
            tile.opacity = 255;
            tile.height = -1;
            return;
        }
        if (open) {
            tile.visible = true;
            tile.height = -1;
            const [, natural] = tile.get_preferred_height(this._content.width);
            tile.height = 0;
            tile.opacity = 0;
            ease(tile, {height: natural, opacity: 255}, {
                duration: STATE_MS,
                // Back to its own height, so the style list can still unfold.
                onComplete: () => {
                    tile.height = -1;
                    this._scrollTo(tile);
                },
            });
        } else {
            ease(tile, {height: 0, opacity: 0}, {
                duration: STATE_MS,
                onComplete: () => {
                    tile.visible = false;
                    tile.height = -1;
                },
            });
        }
    }

    _scrollTo(actor) {
        const [, y] = actor.get_position();
        this.actor.vadjustment.ease(Math.max(0, y - 120), {
            duration: STATE_MS,
            mode: Clutter.AnimationMode.EASE_OUT_CUBIC,
        });
    }

    _stop() {
        this._settingsTile?.remove_all_transitions();
    }
}
