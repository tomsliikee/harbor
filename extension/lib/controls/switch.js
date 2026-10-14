// HarborSwitch: Material 3's switch. Off, an outlined track with a small
// thumb on the left; on, a filled track with a large thumb on the right.
// The thumb travels and grows.

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {STATE_MS, animate} from '../motion.js';
import {mix} from '../palettes.js';
import {roundedRect, setSource} from '../paint.js';

const WIDTH = 52;
const HEIGHT = 32;
const BORDER = 2;
const THUMB_OFF = 16;
const THUMB_ON = 24;

export const HarborSwitch = GObject.registerClass({GTypeName: 'HarborSwitch'},
class HarborSwitch extends St.DrawingArea {
    _init({theme}) {
        super._init({width: WIDTH, height: HEIGHT, y_align: Clutter.ActorAlign.CENTER});
        this._theme = theme;
        this._position = 0;
        this._on = false;
        this._tween = null;
        this.connect('repaint', () => this._draw());
        this._theme.connectObject('changed', () => this.queue_repaint(), this);
        this.connect('destroy', () => {
            this._tween?.stop();
            this._theme.disconnectObject(this);
        });
    }

    set(on, {animated = true} = {}) {
        if (on === this._on)
            return;
        this._on = on;
        this._tween?.stop();
        this._tween = null;
        const from = this._position;
        const to = on ? 1 : 0;
        if (!animated) {
            this._position = to;
            this.queue_repaint();
            return;
        }
        this._tween = animate(this, STATE_MS, t => {
            this._position = from + (to - from) * t;
            this.queue_repaint();
        });
    }

    _draw() {
        const cr = this.get_context();
        const roles = this._theme.roles;
        const on = this._position;

        roundedRect(cr, 0, 0, WIDTH, HEIGHT, HEIGHT / 2);
        setSource(cr, mix(roles.highest, roles.primary, on));
        cr.fill();
        if (on < 1) {
            roundedRect(cr, BORDER / 2, BORDER / 2, WIDTH - BORDER, HEIGHT - BORDER, (HEIGHT - BORDER) / 2);
            setSource(cr, roles.outline, 1 - on);
            cr.setLineWidth(BORDER);
            cr.stroke();
        }

        const thumb = (THUMB_OFF + (THUMB_ON - THUMB_OFF) * on) / 2;
        const travel = WIDTH - HEIGHT;
        cr.arc(HEIGHT / 2 + travel * on, HEIGHT / 2, thumb, 0, 2 * Math.PI);
        setSource(cr, mix(roles.outline, roles.onPrimary, on));
        cr.fill();
        cr.$dispose();
    }
});
