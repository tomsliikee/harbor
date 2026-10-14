// The small pill that names what the pointer rests on, on the side of the
// item that faces the middle of the screen.

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {ease} from './motion.js';
import {setScheme} from './theme.js';
import {text} from './text.js';

const GAP = 8;
const FADE_MS = 120;
export const TOOLTIP_DELAY_MS = 300;

export class Tooltip {
    constructor(theme) {
        this._theme = theme;
        this._pending = 0;
        this.actor = new St.BoxLayout({style_class: 'harbor-tooltip', reactive: false, visible: false, opacity: 0});
        this._title = text('body-strong');
        this._detail = text('body', {styleClass: 'harbor-tooltip-detail'});
        this._detail.opacity = 204;
        this._italic = text('aside');
        this.actor.add_child(this._title);
        this.actor.add_child(this._detail);
        this.actor.add_child(this._italic);
        Main.layoutManager.uiGroup.add_child(this.actor);
        this._theme.connectObject('changed', () => setScheme(this.actor, this._theme.key), this);
        setScheme(this.actor, this._theme.key);
    }

    // side: the screen edge the dock sits on.
    showSoon(source, side, {title = '', detail = '', italic = ''}) {
        this.cancel();
        this._pending = GLib.timeout_add(GLib.PRIORITY_DEFAULT, TOOLTIP_DELAY_MS, () => {
            this._pending = 0;
            this.showNow(source, side, {title, detail, italic});
            return GLib.SOURCE_REMOVE;
        });
    }

    showNow(source, side, {title = '', detail = '', italic = ''}) {
        if (!source.get_stage())
            return;
        this._title.text = title;
        this._title.visible = title !== '';
        this._detail.text = detail ? `· ${detail}` : '';
        this._detail.visible = detail !== '';
        this._italic.text = italic;
        this._italic.visible = italic !== '';
        const [x, y] = source.get_transformed_position();
        const [width, height] = source.get_transformed_size();
        const [, w] = this.actor.get_preferred_width(-1);
        const [, h] = this.actor.get_preferred_height(w);
        let left, top;
        if (side === 'left') {
            left = x + width + GAP;
            top = y + height / 2 - h / 2;
        } else if (side === 'right') {
            left = x - w - GAP;
            top = y + height / 2 - h / 2;
        } else {
            left = x + width / 2 - w / 2;
            top = y - h - GAP;
        }
        const monitor = Main.layoutManager.findMonitorForActor(source) ?? Main.layoutManager.primaryMonitor;
        left = Math.max(monitor.x + 4, Math.min(left, monitor.x + monitor.width - w - 4));
        this.actor.set_position(Math.round(left), Math.round(top));
        this.actor.visible = true;
        Main.layoutManager.uiGroup.set_child_above_sibling(this.actor, null);
        ease(this.actor, {opacity: 255}, {duration: FADE_MS});
    }

    cancel() {
        if (this._pending)
            GLib.source_remove(this._pending);
        this._pending = 0;
    }

    hide() {
        this.cancel();
        if (this._destroyed || !this.actor.visible)
            return;
        ease(this.actor, {opacity: 0}, {duration: FADE_MS, onComplete: () => (this.actor.visible = false)});
    }

    destroy() {
        this.cancel();
        this._destroyed = true;
        this._theme.disconnectObject(this);
        this.actor.destroy();
    }
}

export function isVertical(side) {
    return side === 'left' || side === 'right';
}

export const Orientation = side => (isVertical(side) ? Clutter.Orientation.VERTICAL : Clutter.Orientation.HORIZONTAL);
