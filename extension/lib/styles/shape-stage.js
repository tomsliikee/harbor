// Shape stage: every app stands on an expressive shape, and the shape is
// the run indicator: a circle while closed, more points the more windows
// are open. The focused app's stage is larger.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {HarborShape} from '../shape.js';
import {ladder} from '../shapes.js';
import {SPATIAL, ease} from '../motion.js';
import {Style, box} from './base.js';

export class ShapeStageStyle extends Style {
    buildRoot() {
        const vertical = this.host.vertical;
        const root = box(vertical, 'harbor-bar');
        this.apps = box(vertical);
        this.separator = new St.Widget();
        this.ends = box(vertical);
        root.add_child(this.apps);
        root.add_child(this.separator);
        root.add_child(this.ends);
        return root;
    }

    get stage() {
        return this.px(60);
    }

    get focusedStage() {
        return this.px(72);
    }

    fill(button) {
        const slot = this.focusedStage;
        const holder = new St.Widget({layout_manager: new Clutter.BinLayout(), width: slot, height: slot});
        if (button.kind === 'show-apps') {
            const tile = new St.Bin({
                width: this.stage, height: this.stage,
                x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER,
                child: new St.Icon({icon_name: 'view-app-grid-symbolic', icon_size: this.px(24)}),
            });
            holder.add_child(tile);
            button.tileBin = tile;
        } else {
            const shape = new HarborShape({size: this.stage, x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER});
            const icon = button.kind === 'app'
                ? button.item.app.create_icon_texture(this.px(26))
                : new St.Icon({icon_size: this.px(22)});
            if (button.kind === 'place')
                button.placeIcon = icon;
            const tile = new St.Bin({x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER, child: icon});
            holder.add_child(shape);
            holder.add_child(tile);
            button.shape = shape;
            button.tileBin = tile;
            button.icon = icon;
        }
        button.set_child(holder);
        this.host.decorate(button);
    }

    arrange({pinned, running, places, showApps}) {
        this.place(this.apps, [...pinned, ...running]);
        this.place(this.ends, [...places, showApps]);
    }

    paintRoot() {
        const roles = this.host.theme.roles;
        const vertical = this.host.vertical;
        const [a, b] = vertical ? [this.px(14), this.px(10)] : [this.px(10), this.px(14)];
        this.body.set_style(`${this.tileStyle(roles.surf, this.px(48), this.host.barAlpha)} padding: ${a}px ${b}px; spacing: ${this.px(4)}px;`);
        this.apps.set_style(`spacing: ${this.px(4)}px;`);
        this.ends.set_style(`spacing: ${this.px(4)}px;`);
        if (vertical)
            this.separator.set_size(this.px(36), 1);
        else
            this.separator.set_size(1, this.px(36));
        this.separator.set_style(`background-color: ${roles.outVar};`);
        this.separator.x_align = Clutter.ActorAlign.CENTER;
        this.separator.y_align = Clutter.ActorAlign.CENTER;
    }

    get barColor() {
        return this.host.theme.roles.surf;
    }

    paint(button) {
        const roles = this.host.theme.roles;
        const item = button.item;
        if (button.kind === 'app') {
            const windows = item.windows.length;
            const attention = this.host.attentionFor(button);
            const color = attention ? this.host.theme.warn : item.focused ? roles.pc : windows > 0 ? roles.sc : roles.bright;
            button.shape.setColor(color);
            button.shape.setShape(ladder(windows));
            const size = item.focused ? this.focusedStage : this.stage;
            if (button.shape.width !== size)
                ease(button.shape, {width: size, height: size}, {mode: SPATIAL});
            button.icon.icon_size = item.focused ? this.px(32) : this.px(26);
        } else if (button.kind === 'place') {
            button.placeIcon.icon_name = item.iconName ?? null;
            if (item.gicon)
                button.placeIcon.gicon = item.gicon;
            button.shape.setColor(roles.bright);
            button.tileBin.set_style(`color: ${roles.onVar};`);
        } else {
            button.tileBin.set_style(`${this.tileStyle(roles.tc, this.px(20))} color: ${roles.onTc};`);
        }
        this.host.paintStatus(button);
    }
}
