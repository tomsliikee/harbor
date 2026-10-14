// HarborShape: an expressive shape filled with Cairo, since St cannot use a
// path as a background. A change of shape morphs point by point.

import GObject from 'gi://GObject';
import St from 'gi://St';

import {SPATIAL, STATE_MS, animate} from './motion.js';
import {setSource, polygon} from './paint.js';
import {CIRCLE, outline} from './shapes.js';

export const HarborShape = GObject.registerClass({GTypeName: 'HarborShape'},
class HarborShape extends St.DrawingArea {
    _init({size, shape = CIRCLE, color = '#000000', shadow = false, ...params} = {}) {
        super._init({width: size, height: size, ...params});
        // Unit outlines (centre 0, radius 1); drawing scales them.
        this._from = outline(shape, 0, 0, 1);
        this._to = shape;
        this._target = this._from;
        this._t = 1;
        this._color = color;
        this._alpha = 1;
        this._shadow = shadow;
        this._tween = null;
        this.connect('repaint', () => this._draw());
        this.connect('destroy', () => this._tween?.stop());
    }

    setShape(shape, {animated = true} = {}) {
        if (shape.n === this._to.n && shape.a === this._to.a)
            return;
        this._tween?.stop();
        this._tween = null;
        // A morph that is cut short starts from where it stands.
        this._from = this._current();
        this._to = shape;
        this._target = outline(shape, 0, 0, 1);
        if (!animated) {
            this._t = 1;
            this.queue_repaint();
            return;
        }
        this._t = 0;
        this._tween = animate(this, STATE_MS, progress => {
            this._t = progress;
            this.queue_repaint();
        }, {mode: SPATIAL});
    }

    _current() {
        const t = this._t;
        return this._from.map(([x, y], i) => [x + (this._target[i][0] - x) * t, y + (this._target[i][1] - y) * t]);
    }

    setColor(color, alpha = 1) {
        this._color = color;
        this._alpha = alpha;
        this.queue_repaint();
    }

    _draw() {
        const cr = this.get_context();
        const [width, height] = this.get_surface_size();
        // A soft shadow below needs room, so the shape stays a little smaller.
        const inset = this._shadow ? 3 : 0;
        const r = Math.min(width, height) / 2 - inset;
        const cx = width / 2;
        const cy = height / 2 - (this._shadow ? 1 : 0);
        const points = this._current().map(([x, y]) => [cx + x * r, cy + y * r]);
        if (this._shadow) {
            cr.save();
            cr.translate(0, 2);
            polygon(cr, points);
            cr.setSourceRGBA(0, 0, 0, 0.14);
            cr.fill();
            cr.restore();
        }
        polygon(cr, points);
        setSource(cr, this._color, this._alpha);
        cr.fill();
        cr.$dispose();
    }
});
