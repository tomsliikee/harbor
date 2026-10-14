// The look under the top bar mark while the pointer rests on it: how many
// windows, what the dock does, and who has the most. Always dark, so it
// reads the same over any window.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {ease} from './motion.js';
import {setScheme} from './theme.js';
import {text} from './text.js';
import * as Words from './words.js';

const GAP = 6;
const FADE_MS = 120;

function row(name) {
    const box = new St.BoxLayout({style_class: 'harbor-peek-row', x_expand: true});
    box.add_child(text('body', {styleClass: 'harbor-muted', expand: true, text: name}));
    const value = text('body-strong');
    box.add_child(value);
    return {box, value};
}

export class Peek {
    constructor(theme) {
        this._theme = theme;
        this.actor = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'harbor-peek',
            reactive: false,
            visible: false,
            opacity: 0,
        });
        const head = new St.BoxLayout({style_class: 'harbor-peek-head'});
        this._count = text('metric-s');
        this._caption = text('label', {styleClass: 'harbor-muted'});
        head.add_child(this._count);
        head.add_child(this._caption);
        this.actor.add_child(head);
        const dock = row('Dock');
        const most = row('Most windows');
        this._dock = dock.value;
        this._most = most.value;
        this.actor.add_child(dock.box);
        this.actor.add_child(most.box);
        // Above windows and the panel, but never in the way of the pointer.
        Main.layoutManager.uiGroup.add_child(this.actor);
        this._theme.connectObject('changed', () => this._paint(), this);
        this._paint();
    }

    update(snapshot, dockState) {
        this._count.text = `${snapshot.windowCount}`;
        this._caption.text = Words.peekCaption(snapshot.windowCount, snapshot.appCount);
        this._dock.text = Words.DOCK_STATES[dockState] ?? Words.DOCK_STATES.showing;
        const apps = snapshot.apps.map(entry => ({name: entry.name, windows: entry.windows.length, lastUsed: entry.lastUsed}));
        this._most.text = Words.mostLine(apps);
    }

    show(source) {
        const [x, y] = source.get_transformed_position();
        const [width, height] = source.get_transformed_size();
        const monitor = Main.layoutManager.findMonitorForActor(source) ?? Main.layoutManager.primaryMonitor;
        const [, natural] = this.actor.get_preferred_width(-1);
        const left = Math.min(Math.max(monitor.x + 8, x + width / 2 - natural / 2), monitor.x + monitor.width - natural - 8);
        this.actor.set_position(Math.round(left), Math.round(y + height + GAP));
        this.actor.visible = true;
        ease(this.actor, {opacity: 255}, {duration: FADE_MS});
    }

    hide() {
        if (!this.actor.visible)
            return;
        ease(this.actor, {opacity: 0}, {duration: FADE_MS, onComplete: () => (this.actor.visible = false)});
    }

    destroy() {
        this._theme.disconnectObject(this);
        this.actor.destroy();
    }

    _paint() {
        setScheme(this.actor, `${this._theme.colour}-dark`);
    }
}

