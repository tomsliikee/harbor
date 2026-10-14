// Loud tile: the floating bar led by a loud tile for the focused app, with
// its window count large. Without a focused app the tile counts all open
// windows.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import * as Actions from '../actions.js';
import {box} from './base.js';
import {text} from '../text.js';
import {FloatingBarStyle} from './floating-bar.js';

export class LoudTileStyle extends FloatingBarStyle {
    buildRoot() {
        const root = super.buildRoot();
        const vertical = this.host.vertical;
        this.loud = new St.Button({style_class: 'harbor-loud-tile', can_focus: true, reactive: true});
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
            const size = this.px(48);
            this.loudPlace.set_child(app
                ? app.create_icon_texture(this.px(34))
                : new St.Icon({icon_name: 'view-app-grid-symbolic', icon_size: this.px(22)}));
            this.loudPlace.set_size(size, size);
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

    paintRoot() {
        super.paintRoot();
        const roles = this.host.theme.roles;
        const vertical = this.host.vertical;
        this.loud.set_style(`background-color: ${roles.pc}; color: ${roles.onPc}; border-radius: ${this.px(24)}px;` +
            `padding: ${this.px(8)}px ${this.px(vertical ? 8 : 14)}px ${this.px(vertical ? 4 : 8)}px ${this.px(8)}px;`);
        this.loudPlace.set_style(`background-color: ${roles.primary}; color: ${roles.onPrimary}; border-radius: ${this.px(14)}px;`);
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
