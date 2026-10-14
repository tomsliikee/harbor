// Floating bar: one rounded bar that floats above the edge. Apps rest on
// tiles in their own tone; a line under each says what runs.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {HarborRunLine} from '../runline.js';
import {Style, box} from './base.js';

// The share of a tile the app's own icon fills.
export const ICON_SHARE = 0.72;

export class FloatingBarStyle extends Style {
    buildRoot() {
        const vertical = this.host.vertical;
        const root = box(vertical, 'harbor-bar harbor-floating');
        this.apps = box(vertical, 'harbor-bar-apps');
        this.separator = new St.Widget({style_class: 'harbor-separator'});
        this.ends = box(vertical, 'harbor-bar-apps');
        root.add_child(this.apps);
        root.add_child(this.separator);
        root.add_child(this.ends);
        return root;
    }

    // The tile size for the icon size in the settings.
    get tile() {
        return this.host.iconPx;
    }

    fill(button) {
        const side = this.host.side;
        const vertical = this.host.vertical;
        // The run line sits between the icon and the screen edge.
        const content = box(!vertical, 'harbor-item-box');
        const size = button.kind === 'show-apps' ? this.tile + this.px(8) : this.tile;
        const tile = new St.Bin({
            style_class: 'harbor-tile-bin',
            width: size,
            height: size,
            child: this.icon(button, size),
        });
        const run = new HarborRunLine({theme: this.host.theme, vertical, scale: this.s});
        run.visible = button.kind === 'app';
        if (side === 'left') {
            content.add_child(run);
            content.add_child(tile);
        } else {
            content.add_child(tile);
            content.add_child(run);
        }
        // Show apps and places carry no run line, but keep the same rhythm.
        if (button.kind !== 'app')
            run.opacity = 0;
        run.visible = button.kind !== 'show-apps';
        content.x_align = Clutter.ActorAlign.CENTER;
        content.y_align = Clutter.ActorAlign.CENTER;
        button.set_child(content);
        button.tileBin = tile;
        button.run = run;
        this.host.decorate(button);
    }

    icon(button, size) {
        const iconSize = Math.round(size * ICON_SHARE);
        if (button.kind === 'app')
            return button.item.app.create_icon_texture(iconSize);
        if (button.kind === 'show-apps')
            return new St.Icon({icon_name: 'view-app-grid-symbolic', icon_size: Math.round(size * 0.42)});
        const icon = new St.Icon({icon_size: Math.round(size * 0.42)});
        button.placeIcon = icon;
        return icon;
    }

    arrange({pinned, running, places, showApps}) {
        this.place(this.apps, [...pinned, ...running]);
        this.place(this.ends, [...places, showApps]);
    }

    paintRoot() {
        const roles = this.host.theme.roles;
        const vertical = this.host.vertical;
        const pad = this.px(8);
        this.actor.set_style(
            `${this.tileStyle(roles.highest, this.px(32), this.host.barAlpha)}` +
            `padding: ${pad}px; spacing: ${this.px(6)}px;`);
        this.apps.set_style(`spacing: ${this.px(6)}px;`);
        this.ends.set_style(`spacing: ${this.px(6)}px;`);
        if (vertical)
            this.separator.set_size(this.px(36), 1);
        else
            this.separator.set_size(1, this.px(36));
        this.separator.set_style(`background-color: ${roles.outVar};`);
        this.separator.x_align = Clutter.ActorAlign.CENTER;
        this.separator.y_align = Clutter.ActorAlign.CENTER;
    }

    paint(button) {
        const roles = this.host.theme.roles;
        const item = button.item;
        if (button.kind === 'app') {
            const attention = this.host.attentionFor(button);
            const background = attention ? this.host.theme.warn : roles[item.tone];
            button.tileBin.set_style(this.tileStyle(background, this.px(item.focused ? 24 : 16)));
            button.run.set({windows: item.windows.length, focused: item.focused, playing: this.host.playing(item)});
        } else if (button.kind === 'place') {
            button.placeIcon.icon_name = item.iconName ?? null;
            if (item.gicon)
                button.placeIcon.gicon = item.gicon;
            button.tileBin.set_style(`${this.tileStyle(roles.high, this.px(16))} color: ${roles.onVar};`);
        } else {
            button.tileBin.set_style(`${this.tileStyle(roles.tc, this.px(20))} color: ${roles.onTc};`);
        }
        this.host.paintStatus(button);
    }
}
