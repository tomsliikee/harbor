// Harbor's settings: a small JSON file in ~/.config/harbor. Every key falls
// back to its default on its own, so one broken value never costs the rest.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {COLOURS} from './palettes.js';

export const STYLES = [
    'floating-bar', 'shape-stage', 'grouped-block', 'expressive-rail', 'status', 'quiet-handle',
    'loud-tile', 'mono-container', 'window-list', 'pebbles', 'workspace-split',
];
export const POSITIONS = ['left', 'bottom', 'right'];
export const ICON_SIZES = ['small', 'medium', 'large'];
export const WHEN_WINDOW_CLOSE = ['stay', 'make-room', 'hide'];
export const MOTION_SPEEDS = ['quick', 'normal', 'slow'];

// The size of an app's own icon as the dock shows it.
export const ICON_PX = {small: 52, medium: 64, large: 76};

// Values an earlier Harbor wrote that mean something else now.
const RENAMED = {iconSize: {huge: 'large'}};

const CHOICES = {
    style: STYLES,
    position: POSITIONS,
    iconSize: ICON_SIZES,
    whenWindowClose: WHEN_WINDOW_CLOSE,
    colour: COLOURS,
    motionSpeed: MOTION_SPEEDS,
};

// Keys that hold one switch per style.
const PER_STYLE = ['handles'];

function perStyle(value, fallback) {
    const source = value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return Object.fromEntries(STYLES.map(style => [style, typeof source[style] === 'boolean' ? source[style] : fallback]));
}

export const DEFAULTS = Object.freeze({
    style: 'floating-bar',
    position: 'bottom',
    iconSize: 'medium',
    whenWindowClose: 'make-room',
    trashAndDrives: true,
    countsOnIcons: true,
    everyMonitor: false,
    colour: 'blue',
    // Whether a thin handle stays at the edge while the dock is away.
    handles: Object.freeze(perStyle(null, true)),
    handleHover: true,
    seeThrough: false,
    expressiveMotion: true,
    alwaysMoving: false,
    motionSpeed: 'normal',
    // Writes what the dock decides to the journal; not in the menu.
    debug: false,
});

// Takes whatever was parsed (or nothing) and returns complete settings.
export function normalize(raw) {
    const source = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const settings = {};
    for (const [key, fallback] of Object.entries(DEFAULTS)) {
        const value = RENAMED[key]?.[source[key]] ?? source[key];
        if (PER_STYLE.includes(key))
            settings[key] = perStyle(value, true);
        else if (key in CHOICES)
            settings[key] = CHOICES[key].includes(value) ? value : fallback;
        else
            settings[key] = typeof value === 'boolean' ? value : fallback;
    }
    return settings;
}

export function parse(text) {
    try {
        return normalize(JSON.parse(text));
    } catch {
        return normalize(null);
    }
}

export function isValid(key, value) {
    if (!(key in DEFAULTS))
        return false;
    if (PER_STYLE.includes(key))
        return value !== null && typeof value === 'object' && STYLES.every(style => typeof value[style] === 'boolean');
    return key in CHOICES ? CHOICES[key].includes(value) : typeof value === 'boolean';
}

// Reads, writes and watches the file. onChange gets the complete settings
// whenever they differ from before, also after an edit by hand.
export class SettingsStore {
    constructor(onChange, {directory = GLib.build_filenamev([GLib.get_user_config_dir(), 'harbor'])} = {}) {
        this._onChange = onChange;
        this._file = Gio.File.new_for_path(GLib.build_filenamev([directory, 'settings.json']));
        this._directory = Gio.File.new_for_path(directory);
        this.current = this._read();
        // The folder is watched, not the file: an atomic write replaces it.
        this._monitor = null;
        try {
            this._directory.make_directory_with_parents(null);
        } catch (e) {
            if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.EXISTS))
                logError(e, 'Harbor: cannot create the settings folder');
        }
        try {
            this._monitor = this._directory.monitor_directory(Gio.FileMonitorFlags.WATCH_MOVES, null);
            this._monitor.connect('changed', (_monitor, file, other) => {
                if (file?.get_basename() === 'settings.json' || other?.get_basename() === 'settings.json')
                    this._reload();
            });
        } catch (e) {
            logError(e, 'Harbor: cannot watch the settings');
        }
    }

    set(key, value) {
        if (!isValid(key, value) || this.current[key] === value)
            return;
        this.current = {...this.current, [key]: value};
        this._write();
        this._onChange(this.current);
    }

    destroy() {
        this._monitor?.cancel();
        this._monitor = null;
        this._onChange = () => {};
    }

    _read() {
        try {
            const [, bytes] = this._file.load_contents(null);
            return parse(new TextDecoder().decode(bytes));
        } catch {
            return normalize(null);
        }
    }

    _reload() {
        const next = this._read();
        if (JSON.stringify(next) === JSON.stringify(this.current))
            return;
        this.current = next;
        this._onChange(this.current);
    }

    _write() {
        const bytes = new TextEncoder().encode(`${JSON.stringify(this.current, null, 2)}\n`);
        try {
            // replace_contents writes a temporary file and renames it.
            this._file.replace_contents(bytes, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
        } catch (e) {
            logError(e, 'Harbor: cannot save the settings');
        }
    }
}
