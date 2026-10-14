// One place that knows the colour style, light or dark, and whether the
// desktop animates. Everything that paints listens to "changed".

import Gio from 'gi://Gio';
import St from 'gi://St';

import {EventEmitter} from 'resource:///org/gnome/shell/misc/signals.js';

import {palette, warn} from './palettes.js';

export class ThemeController extends EventEmitter {
    constructor(colour) {
        super();
        this.colour = colour;
        this._interface = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this.scheme = this._readScheme();
        this.animations = St.Settings.get().enable_animations;
        this._interface.connectObject('changed::color-scheme', () => {
            const scheme = this._readScheme();
            if (scheme !== this.scheme) {
                this.scheme = scheme;
                this.emit('changed');
            }
        }, this);
        St.Settings.get().connectObject('notify::enable-animations', () => {
            this.animations = St.Settings.get().enable_animations;
            this.emit('changed');
        }, this);
    }

    // The roles of the current style in the current scheme.
    get roles() {
        return palette(this.colour, this.scheme);
    }

    // The same style in the other scheme, or a fixed one (the peek is dark).
    rolesIn(scheme) {
        return palette(this.colour, scheme);
    }

    get warn() {
        return warn[this.scheme];
    }

    get key() {
        return `${this.colour}-${this.scheme}`;
    }

    setColour(colour) {
        if (colour === this.colour)
            return;
        this.colour = colour;
        this.emit('changed');
    }

    destroy() {
        this._interface.disconnectObject(this);
        St.Settings.get().disconnectObject(this);
        this.disconnectAll();
    }

    _readScheme() {
        return this._interface.get_string('color-scheme') === 'prefer-dark' ? 'dark' : 'light';
    }
}
