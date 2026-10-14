// HarborRunLine: what runs, drawn under an icon (or beside it, on a side
// dock). The focused app gets a long bar, a running one a short one, two
// or three windows as many dots, and a playing app a small wave.

import GObject from 'gi://GObject';
import St from 'gi://St';

import {SPRINGS, expressive, run, springShare, stretch} from './choreo.js';
import {roundedRect, setSource} from './paint.js';
import {settleMs} from './spring.js';

const LENGTH = 24;
const THICK = 6;
const BAR = 4;

export const HarborRunLine = GObject.registerClass({GTypeName: 'HarborRunLine'},
class HarborRunLine extends St.DrawingArea {
    // vertical: the line runs down the side of a left or right dock.
    _init({theme, vertical = false, scale = 1, focusedLength = 18, runningLength = 6}) {
        const along = Math.round(LENGTH * scale);
        super._init({width: vertical ? THICK : along, height: vertical ? along : THICK});
        this._theme = theme;
        this._vertical = vertical;
        this._focusedLength = focusedLength;
        this._runningLength = runningLength;
        this._state = {windows: 0, focused: false, playing: false, onColor: null, focusColor: null};
        // How far the line has drawn out from its middle, 0 to 1 (past 1
        // while it swings).
        this._grow = 1;
        this._growing = null;
        this.connect('repaint', () => this._draw());
        this._theme.connectObject('changed', () => this.queue_repaint(), this);
        this.connect('destroy', () => {
            this._growing?.stop();
            this._theme.disconnectObject(this);
        });
    }

    // colors: optional role names for a style that draws on its own colour.
    set(state) {
        const before = this._state;
        this._state = {...this._state, ...state};
        const changed = ['windows', 'focused', 'playing'].some(key => key in state && state[key] !== before[key]);
        if (changed && this.get_stage() && expressive())
            this._drawOut(before.windows === 0 ? 0 : 0.4);
        this.queue_repaint();
    }

    // The new line draws out from the middle with a swing.
    _drawOut(from) {
        this._growing?.stop();
        const length = settleMs(SPRINGS.pop);
        this._growing = run(this, length, ms => {
            const share = ms >= stretch(length) ? 1 : springShare(ms, 0, SPRINGS.pop);
            this._grow = from + (1 - from) * share;
            this.queue_repaint();
        }, () => {
            this._growing = null;
        });
    }

    _draw() {
        const cr = this.get_context();
        const [width, height] = this.get_surface_size();
        const roles = this._theme.roles;
        const {windows, focused, playing} = this._state;
        const along = this._vertical ? height : width;
        const across = this._vertical ? width : height;
        // Every piece is drawn from the middle at the share it has grown to.
        const grow = Math.max(0, this._grow);
        const rect = (start, size) => {
            const middle = along / 2;
            const length = size * grow;
            start = middle + (start + size / 2 - middle) * grow - length / 2;
            const offset = (across - BAR) / 2;
            const radius = Math.min(BAR, length) / 2;
            if (this._vertical)
                roundedRect(cr, offset, start, BAR, length, radius);
            else
                roundedRect(cr, start, offset, length, BAR, radius);
        };
        const focusColor = roles[this._state.focusColor ?? 'primary'];
        const runColor = roles[this._state.onColor ?? 'onVar'];

        if (playing) {
            // A short sine, two periods, round ends.
            cr.setLineWidth(2);
            cr.setLineCap(1);
            setSource(cr, roles.primary);
            for (let i = 0; i <= 24; i++) {
                const t = i / 24;
                const a = 2 + t * (along - 4);
                const b = across / 2 + Math.sin(t * 4 * Math.PI) * 1.6;
                if (this._vertical)
                    i === 0 ? cr.moveTo(b, a) : cr.lineTo(b, a);
                else
                    i === 0 ? cr.moveTo(a, b) : cr.lineTo(a, b);
            }
            cr.stroke();
        } else if (focused) {
            rect((along - this._focusedLength) / 2, this._focusedLength);
            setSource(cr, focusColor);
            cr.fill();
        } else if (windows >= 2) {
            const dots = Math.min(3, windows);
            const dot = 5;
            const gap = 3;
            const total = dots * dot + (dots - 1) * gap;
            for (let i = 0; i < dots; i++)
                rect((along - total) / 2 + i * (dot + gap), dot);
            setSource(cr, runColor);
            cr.fill();
        } else if (windows === 1) {
            rect((along - this._runningLength) / 2, this._runningLength);
            setSource(cr, runColor);
            cr.fill();
        }
        cr.$dispose();
    }
});
