// Harbor's mark in the top bar: two app tiles resting on a shelf. The shelf
// is filled while the dock shows and only outlined while it is away; the
// whole mark takes the warning colour while an app wants attention.

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {warn} from './palettes.js';
import {roundedRect, setSource} from './paint.js';

const SIZE = 16;
const STROKE = 1.5;
const SECOND_TILE = 0.6;

export const HarborMark = GObject.registerClass({GTypeName: 'HarborMark'},
class HarborMark extends St.DrawingArea {
    _init() {
        super._init({width: SIZE, height: SIZE, y_align: Clutter.ActorAlign.CENTER});
        this._shown = true;
        this._attention = false;
        this.connect('repaint', () => this._draw());
    }

    set({shown, attention}) {
        if (shown === this._shown && attention === this._attention)
            return;
        this._shown = shown;
        this._attention = attention;
        this.queue_repaint();
    }

    _draw() {
        const cr = this.get_context();
        const [width] = this.get_surface_size();
        // Drawn on the 16 px grid, scaled with the top bar.
        const k = width / SIZE;
        cr.scale(k, k);
        const color = this.get_theme_node().get_foreground_color();
        const paint = (alpha = 1) => {
            if (this._attention)
                setSource(cr, warn.dark, alpha);
            else
                cr.setSourceRGBA(color.red / 255, color.green / 255, color.blue / 255, alpha * color.alpha / 255);
        };

        roundedRect(cr, 3, 3, 4, 4, 1.4);
        paint();
        cr.fill();
        roundedRect(cr, 9, 3, 4, 4, 1.4);
        paint(SECOND_TILE);
        cr.fill();
        if (this._shown) {
            roundedRect(cr, 1, 9, 14, 5, 2.5);
            paint();
            cr.fill();
        } else {
            roundedRect(cr, 1.75, 9.75, 12.5, 3.5, 1.75);
            paint();
            cr.setLineWidth(STROKE);
            cr.stroke();
        }
        cr.$dispose();
    }
});
