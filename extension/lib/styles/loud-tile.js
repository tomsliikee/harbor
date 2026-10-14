// Loud tile: the floating bar led by a loud tile for the focused app, with
// its window count large. Without a focused app the tile counts all open
// windows.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import * as Actions from '../actions.js';
import {appGlyph, paintGlyph} from '../icon.js';
import {box} from './base.js';
import {text} from '../text.js';
import {FloatingBarStyle} from './floating-bar.js';

export class LoudTileStyle extends FloatingBarStyle {
    buildRoot() {
        const root = super.buildRoot();
        const vertical = this.host.vertical;
        this.loud = new St.Button({style_class: 'harbor-loud-tile', can_focus: true, reactive: true});
        this.loud.set_pivot_point(0.5, 0.5);
        const inner = box(vertical, 'harbor-loud-inner');
        this.loudPlace = new St.Bin({style_class: 'harbor-loud-place'});
        const words = box(true, 'harbor-loud-words');
        this.loudNumber = text('metric-m', {scale: this.s});
        this.loudCaption = text('label', {scale: this.s});
        words.add_child(this.loudNumber);
        words.add_child(this.loudCaption);
        // A side dock is too narrow for the sentence; the number stays.
        this.loudCaption.visible = !vertical;
        this.loudNumber.x_align = Clutter.ActorAlign.CENTER;
        words.y_align = Clutter.ActorAlign.CENTER;
        inner.add_child(this.loudPlace);
        inner.add_child(words);
        this.loud.set_child(inner);
        this.loud.connect('clicked', () => {
            const item = this._focusedButton?.item;
            if (!item) {
                this.host.showApps();
                return;
            }
            // The app's own button is out of the bar, so the list opens
            // from the tile.
            this.loud.item = item;
            Actions.primary(item, {onList: () => this.host.showWindowList(this.loud)});
        });
        this.loudSeparator = new St.Widget({style_class: 'harbor-separator'});
        root.insert_child_at_index(this.loud, 0);
        root.insert_child_at_index(this.loudSeparator, 1);
        this._loudApp = null;
        return root;
    }

    arrange(groups) {
        const focused = [...groups.pinned, ...groups.running].find(button => button.item.focused) ?? null;
        this._focusedButton = focused;
        const hide = button => button !== focused;
        super.arrange({...groups, pinned: groups.pinned.filter(hide), running: groups.running.filter(hide)});
        focused?.get_parent()?.remove_child(focused);
        const app = focused?.item.app ?? null;
        if (app !== this._loudApp) {
            this._loudApp = app;
            const size = Math.round(this.host.iconPx * 0.9);
            this._loudGlyph = app ? appGlyph(app, size, this.host.settings) : null;
            this.loudPlace.set_child(this._loudGlyph?.icon ??
                new St.Icon({icon_name: 'view-app-grid-symbolic', icon_size: Math.round(size * 0.45)}));
            this.loudPlace.set_size(size, size);
            this._paintLoudPlace();
        }
        const snapshot = this.snapshot;
        if (focused) {
            this.loudNumber.text = `${focused.item.windows.length}`;
            this.loudCaption.text = `${focused.item.name} windows`;
        } else {
            this.loudNumber.text = `${snapshot?.windowCount ?? 0}`;
            this.loudCaption.text = 'windows open';
        }
    }

    // A glyph on primary; an app's own icon stands free.
    _paintLoudPlace() {
        const ink = this.focusInk();
        const real = this._loudApp && !this._loudGlyph?.symbolic;
        this.loudPlace.set_style(real
            ? 'background-color: transparent;'
            : `background-color: ${ink.fill}; color: ${ink.on}; border-radius: ${this.px(16)}px;`);
        paintGlyph(this._loudGlyph, ink.on);
    }

    revealItems() {
        return [this.loud, ...super.revealItems()];
    }

    paintRoot() {
        super.paintRoot();
        const roles = this.host.theme.roles;
        const vertical = this.host.vertical;
        this.loud.set_style(`background-color: ${roles.pc}; color: ${roles.onPc}; border-radius: ${this.px(24)}px;` +
            `padding: ${this.px(8)}px ${this.px(vertical ? 8 : 14)}px ${this.px(vertical ? 4 : 8)}px ${this.px(8)}px;`);
        this._paintLoudPlace();
        this.loud.get_child().set_style(`spacing: ${this.px(12)}px;`);
        if (vertical)
            this.loudSeparator.set_size(this.px(36), 1);
        else
            this.loudSeparator.set_size(1, this.px(36));
        this.loudSeparator.set_style(`background-color: ${roles.outVar};`);
        this.loudSeparator.x_align = Clutter.ActorAlign.CENTER;
        this.loudSeparator.y_align = Clutter.ActorAlign.CENTER;
    }
}
