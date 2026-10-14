// The list of dock styles: eleven are too many for segmented buttons, so
// they are grouped rows with a small drawing of each. Four rows show at
// first, the chosen one always among them; the rest unfold below. The
// chosen row says in one sentence what its style does, and resting on any
// row tells the whole story on a card beside the menu.

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {STYLES} from '../settings.js';
import {ease} from '../motion.js';
import {roundedRect, setSource, shapePath} from '../paint.js';
import {text} from '../text.js';
import {HarborChevron} from './chevron.js';
import {STYLE_INFO, StyleInfoCard} from './styleinfo.js';

export const STYLE_NAMES = {
    'floating-bar': 'Floating bar',
    'shape-stage': 'Shape stage',
    'grouped-block': 'Grouped block',
    'expressive-rail': 'Expressive rail',
    'status': 'Status',
    'quiet-handle': 'Quiet handle',
    'loud-tile': 'Loud tile',
    'mono-container': 'Mono container',
    'window-list': 'Window list',
    'pebbles': 'Pebbles',
    'workspace-split': 'Workspace split',
};

const FIRST_ROWS = 4;
const MINI = 32;

// Each drawing is the style reduced to its idea, on a 32 px square.
const DRAW = {
    'floating-bar'(cr, r) {
        roundedRect(cr, 3, 18, 26, 9, 4.5);
        setSource(cr, r.highest);
        cr.fill();
        dots(cr, r, [8, 13, 18, 23], 22.5, 1.8);
    },
    'shape-stage'(cr, r) {
        roundedRect(cr, 2, 17, 28, 11, 5.5);
        setSource(cr, r.surf);
        cr.fill();
        [[8, {n: 0, a: 0}, r.bright], [16, {n: 4, a: 0.32}, r.pc], [24, {n: 8, a: 0.2}, r.sc]].forEach(([x, shape, color]) => {
            shapePath(cr, shape, x, 22.5, 3.6);
            setSource(cr, color);
            cr.fill();
        });
    },
    'grouped-block'(cr, r) {
        [[3, 11], [15, 7], [23, 6]].forEach(([x, w], i) => {
            roundedRect(cr, x, 17, w, 11, 3);
            setSource(cr, i === 0 ? r.primary : r.bright);
            cr.fill();
        });
    },
    'expressive-rail'(cr, r) {
        cr.rectangle(0, 21, 32, 11);
        setSource(cr, r.surf);
        cr.fill();
        roundedRect(cr, 4, 15, 15, 9, 4.5);
        setSource(cr, r.pc);
        cr.fill();
        cr.arc(8.5, 19.5, 3, 0, 2 * Math.PI);
        setSource(cr, r.primary);
        cr.fill();
    },
    'status'(cr, r) {
        DRAW['floating-bar'](cr, r);
        cr.arc(20.5, 18, 3, 0, 2 * Math.PI);
        setSource(cr, r.primary);
        cr.fill();
    },
    'quiet-handle'(cr, r) {
        roundedRect(cr, 9, 25, 14, 2.5, 1.25);
        setSource(cr, r.outline);
        cr.fill();
    },
    'loud-tile'(cr, r) {
        roundedRect(cr, 3, 18, 26, 9, 4.5);
        setSource(cr, r.highest);
        cr.fill();
        roundedRect(cr, 4.5, 19.5, 10, 6, 2.5);
        setSource(cr, r.pc);
        cr.fill();
        dots(cr, r, [19, 24], 22.5, 1.8);
    },
    'mono-container'(cr, r) {
        roundedRect(cr, 3, 18, 26, 9, 4.5);
        setSource(cr, r.pc);
        cr.fill();
        cr.arc(9, 22.5, 3.2, 0, 2 * Math.PI);
        setSource(cr, r.primary);
        cr.fill();
        [16, 22].forEach(x => {
            cr.arc(x, 22.5, 1.8, 0, 2 * Math.PI);
            setSource(cr, r.onPc);
            cr.fill();
        });
    },
    'window-list'(cr, r) {
        DRAW['floating-bar'](cr, r);
        roundedRect(cr, 8, 4, 16, 11, 3);
        setSource(cr, r.surf);
        cr.fill();
        roundedRect(cr, 10, 6, 12, 3, 1);
        setSource(cr, r.pc);
        cr.fill();
    },
    'pebbles'(cr, r) {
        [[7, 3.4, r.pc], [16, 4.6, r.sc], [25, 3.4, r.tc]].forEach(([x, radius, color]) => {
            cr.arc(x, 23 - (radius - 3.4), radius, 0, 2 * Math.PI);
            setSource(cr, color);
            cr.fill();
        });
    },
    'workspace-split'(cr, r) {
        [[2, 7], [11, 13], [26, 5]].forEach(([x, w]) => {
            roundedRect(cr, x, 18, w, 9, 3.5);
            setSource(cr, r.highest);
            cr.fill();
        });
        cr.arc(5.5, 22.5, 2, 0, 2 * Math.PI);
        setSource(cr, r.primary);
        cr.fill();
    },
};

function dots(cr, roles, xs, y, radius) {
    const colors = [roles.pc, roles.sc, roles.tc];
    xs.forEach((x, i) => {
        cr.arc(x, y, radius, 0, 2 * Math.PI);
        setSource(cr, colors[i % colors.length]);
        cr.fill();
    });
}

const HarborStyleMini = GObject.registerClass({GTypeName: 'HarborStyleMini'},
class HarborStyleMini extends St.DrawingArea {
    _init({style, theme}) {
        super._init({width: MINI, height: MINI, y_align: Clutter.ActorAlign.CENTER});
        this._style = style;
        this._theme = theme;
        this.connect('repaint', () => this._draw());
        this._theme.connectObject('changed', () => this.queue_repaint(), this);
        this.connect('destroy', () => this._theme.disconnectObject(this));
    }

    _draw() {
        const cr = this.get_context();
        const roles = this._theme.roles;
        roundedRect(cr, 0, 0, MINI, MINI, 8);
        setSource(cr, roles.low);
        cr.fill();
        // The drawings sit low on their grid, the way a dock sits on a screen;
        // here they are lifted to the middle of the square.
        cr.translate(0, this._style === 'window-list' ? -1 : -6);
        DRAW[this._style](cr, roles);
        cr.$dispose();
    }
});

export const HarborStyleList = GObject.registerClass({GTypeName: 'HarborStyleList'},
class HarborStyleList extends St.BoxLayout {
    _init({theme, onPick}) {
        super._init({orientation: Clutter.Orientation.VERTICAL, style_class: 'harbor-rows', x_expand: true});
        this._open = false;
        this._chosen = null;
        this._card = new StyleInfoCard({theme, names: STYLE_NAMES, mini: style => new HarborStyleMini({style, theme})});
        this.connect('destroy', () => this._card.destroy());
        // The menu closing takes the card with it.
        this.connect('notify::mapped', () => {
            if (!this.mapped)
                this._card.hide();
        });
        this._rows = STYLES.map(style => {
            const row = new St.Button({
                style_class: 'harbor-row harbor-style-row',
                can_focus: true,
                x_expand: true,
                accessible_name: STYLE_NAMES[style],
            });
            const box = new St.BoxLayout({style_class: 'harbor-row-box', x_expand: true});
            box.add_child(new HarborStyleMini({style, theme}));
            const words = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, x_expand: true, y_align: Clutter.ActorAlign.CENTER});
            words.add_child(text('body-medium', {text: STYLE_NAMES[style]}));
            const short = text('label', {styleClass: 'harbor-row-subtitle', wrap: true, text: STYLE_INFO[style].short});
            short.visible = false;
            words.add_child(short);
            box.add_child(words);
            const check = new St.Icon({icon_name: 'object-select-symbolic', icon_size: 16, visible: false, y_align: Clutter.ActorAlign.CENTER});
            box.add_child(check);
            row.set_child(box);
            row.connect('clicked', () => onPick(style));
            row.connect('notify::hover', () => this._rested(style, row, row.hover));
            row.connect('key-focus-in', () => this._rested(style, row, true));
            row.connect('key-focus-out', () => this._rested(style, row, false));
            this.add_child(row);
            return {style, row, check, short};
        });
        this._more = new St.Button({style_class: 'harbor-row harbor-more-row', can_focus: true, x_expand: true});
        const moreBox = new St.BoxLayout({style_class: 'harbor-row-box', x_expand: true});
        moreBox.add_child(text('body-medium', {expand: true, text: `All ${STYLES.length} styles`}));
        this._moreChevron = new HarborChevron({accessibleName: 'All styles', styleClass: 'harbor-chevron-inline'});
        this._moreChevron.reactive = false;
        moreBox.add_child(this._moreChevron);
        this._more.set_child(moreBox);
        this._more.connect('clicked', () => this.setOpen(!this._open));
        this.add_child(this._more);
    }

    select(style) {
        this._chosen = style;
        for (const {style: name, row, check, short} of this._rows) {
            check.visible = name === style;
            short.visible = name === style;
            if (name === style)
                row.add_style_class_name('harbor-selected');
            else
                row.remove_style_class_name('harbor-selected');
        }
        this._layout();
    }

    _rested(style, row, on) {
        if (on)
            this._card.showSoon(style, row);
        else
            this._card.hideSoon();
    }

    setOpen(open, {animated = true} = {}) {
        this._open = open;
        if (!open)
            this._card.hide();
        this._moreChevron.setOpen(open, {animated});
        this._layout(animated);
    }

    // The first rows in their own order, with the chosen style taking the
    // last place when it is further down.
    _firstRows() {
        const first = STYLES.slice(0, FIRST_ROWS);
        if (this._chosen && !first.includes(this._chosen))
            first[FIRST_ROWS - 1] = this._chosen;
        return new Set(first);
    }

    _layout(animated = false) {
        const first = this._firstRows();
        const shown = this._rows.filter(({style}) => this._open || first.has(style));
        for (const entry of this._rows) {
            const visible = this._open || first.has(entry.style);
            if (visible && !entry.row.visible && animated) {
                entry.row.opacity = 0;
                entry.row.visible = true;
                ease(entry.row, {opacity: 255});
            } else {
                entry.row.visible = visible;
                entry.row.opacity = 255;
            }
            entry.row.remove_style_class_name('harbor-row-first');
        }
        shown[0]?.row.add_style_class_name('harbor-row-first');
        // The chosen style keeps its place in the order once everything shows.
        if (!this._open) {
            const chosen = this._rows.find(({style}) => style === this._chosen);
            if (chosen && !STYLES.slice(0, FIRST_ROWS).includes(this._chosen))
                this.set_child_at_index(chosen.row, FIRST_ROWS - 1);
        } else {
            this._rows.forEach(({row}, i) => this.set_child_at_index(row, i));
        }
    }
});
