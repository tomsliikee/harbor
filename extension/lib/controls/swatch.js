// A colour style to choose: a disc in the style's primary colour in the
// current scheme, with a check mark while it is the chosen one.

import Cairo from 'cairo';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {palette} from '../palettes.js';
import {setSource} from '../paint.js';

const SIZE = 32;
const CHECK_STROKE = 2.5;

export const HarborSwatch = GObject.registerClass({GTypeName: 'HarborSwatch'},
class HarborSwatch extends St.DrawingArea {
    _init({colour, theme}) {
        super._init({width: SIZE, height: SIZE});
        this._colour = colour;
        this._theme = theme;
        this._selected = false;
        this.connect('repaint', () => this._draw());
        this._theme.connectObject('changed', () => this.queue_repaint(), this);
        this.connect('destroy', () => this._theme.disconnectObject(this));
    }

    setSelected(selected) {
        if (selected === this._selected)
            return;
        this._selected = selected;
        this.queue_repaint();
    }

    _draw() {
        const cr = this.get_context();
        const [width, height] = this.get_surface_size();
        const roles = palette(this._colour, this._theme.scheme);
        setSource(cr, roles.primary);
        cr.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, 2 * Math.PI);
        cr.fill();
        if (this._selected) {
            setSource(cr, roles.onPrimary);
            cr.setLineWidth(CHECK_STROKE);
            cr.setLineCap(Cairo.LineCap.ROUND);
            cr.setLineJoin(Cairo.LineJoin.ROUND);
            cr.moveTo(width / 2 - 6, height / 2);
            cr.lineTo(width / 2 - 2, height / 2 + 4);
            cr.lineTo(width / 2 + 6, height / 2 - 4);
            cr.stroke();
        }
        cr.$dispose();
    }
});
