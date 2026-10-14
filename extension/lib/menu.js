// A popup that opens from a dock item toward the middle of the screen, in
// the same dress as the top bar menu. The right-click menu and the window
// list are built on it.

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {setScheme} from './theme.js';
import {text} from './text.js';

const SIDE_TOWARD_SCREEN = {bottom: St.Side.BOTTOM, left: St.Side.LEFT, right: St.Side.RIGHT};

export function column(styleClass = '') {
    return new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, style_class: styleClass, x_expand: true});
}

// Grouped rows: 4 px apart, small inner corners, wide outer ones.
// rows: [{title, subtitle, selected, onClick, trailing}]
export function rowGroup(rows, {outer = 'harbor-group-20'} = {}) {
    const group = column(`harbor-rows ${outer}`);
    rows.forEach((spec, i) => {
        const place = rows.length === 1 ? 'only' : i === 0 ? 'first' : i === rows.length - 1 ? 'last' : '';
        const row = new St.Button({
            style_class: `harbor-row harbor-menu-row${place ? ` harbor-row-${place}` : ''}${spec.selected ? ' harbor-selected' : ''}`,
            can_focus: true,
            x_expand: true,
            accessible_name: spec.title,
        });
        const box = new St.BoxLayout({style_class: 'harbor-row-box', x_expand: true});
        const words = column();
        words.add_child(text('body-medium', {ellipsize: true, text: spec.title}));
        if (spec.subtitle)
            words.add_child(text('label', {styleClass: 'harbor-row-subtitle', text: spec.subtitle}));
        words.y_align = Clutter.ActorAlign.CENTER;
        box.add_child(words);
        if (spec.trailing)
            box.add_child(spec.trailing);
        row.set_child(box);
        row.connect('clicked', () => spec.onClick?.());
        group.add_child(row);
    });
    return group;
}

export class DockMenu {
    // side: the edge the dock sits on.
    // grab: false for a menu that opens on hover; it then closes once the
    // pointer has left both the menu and its item.
    constructor(source, side, theme, {styleClass = 'harbor-menu', grab = true} = {}) {
        this._theme = theme;
        this._source = source;
        this._grab = grab;
        this._watch = 0;
        this.menu = new PopupMenu.PopupMenu(source, 0.5, SIDE_TOWARD_SCREEN[side] ?? St.Side.BOTTOM);
        this.menu.actor.add_style_class_name('harbor-menu-outer');
        this.menu.box.add_style_class_name(`harbor-popup ${styleClass}`);
        if (grab) {
            this._manager = new PopupMenu.PopupMenuManager(source);
            this._manager.addMenu(this.menu);
        }
        Main.uiGroup.add_child(this.menu.actor);
        this.menu.actor.hide();
        this.content = column('harbor-menu-content');
        this.menu.box.add_child(this.content);
        this._theme.connectObject('changed', () => setScheme(this.menu.box, this._theme.key), this);
        setScheme(this.menu.box, this._theme.key);
        this.menu.connect('open-state-changed', (_menu, open) => {
            if (!open)
                this.onClosed?.();
        });
    }

    open() {
        this.menu.open(true);
        if (!this._grab)
            this._watchPointer();
    }

    _watchPointer() {
        let away = 0;
        this._watch = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            const [x, y] = global.get_pointer();
            const inside = actor => {
                const [ax, ay] = actor.get_transformed_position();
                const [w, h] = actor.get_transformed_size();
                return x >= ax && x < ax + w && y >= ay && y < ay + h;
            };
            away = inside(this.menu.actor) || inside(this._source) ? 0 : away + 100;
            if (away >= 300) {
                this._watch = 0;
                this.close();
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    close() {
        this.menu.close(true);
    }

    get isOpen() {
        return this.menu.isOpen;
    }

    destroy() {
        if (this._watch)
            GLib.source_remove(this._watch);
        this._watch = 0;
        this._theme.disconnectObject(this);
        this.menu.destroy();
    }
}
