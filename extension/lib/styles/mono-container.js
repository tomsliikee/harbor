// Mono container: a round bar in the primary container colour, with every
// icon in one colour. Running apps show fully, closed ones fade back, and
// the focused app sits on a primary circle.

import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import Gio from 'gi://Gio';
import St from 'gi://St';

import {rgb} from '../palettes.js';
import {FloatingBarStyle, ICON_SHARE} from './floating-bar.js';

const CLOSED_OPACITY = 153;

let iconTheme = null;
function hasIcon(name) {
    try {
        iconTheme ??= new St.IconTheme();
        return iconTheme.has_icon(name);
    } catch {
        return false;
    }
}

// The app's symbolic icon if the theme has one.
function symbolicName(app) {
    const icon = app.get_app_info()?.get_icon();
    if (!(icon instanceof Gio.ThemedIcon))
        return null;
    for (const name of icon.get_names()) {
        const symbolic = name.endsWith('-symbolic') ? name : `${name}-symbolic`;
        if (hasIcon(symbolic))
            return symbolic;
    }
    return null;
}

function coglColor(hex) {
    const [r, g, b] = rgb(hex).map(channel => Math.round(channel * 255));
    return new Cogl.Color({red: r, green: g, blue: b, alpha: 255});
}

export class MonoContainerStyle extends FloatingBarStyle {
    get barPadding() {
        return Math.round((this.px(72) - this.tile - this.px(10)) / 2);
    }

    get barRadius() {
        return this.px(36);
    }

    get barColor() {
        return this.host.theme.roles.pc;
    }

    get showAppsSize() {
        return this.tile;
    }

    get showAppsRadius() {
        return this.px(16);
    }

    icon(button, size) {
        if (button.kind !== 'app')
            return super.icon(button, size);
        const iconSize = Math.round(size * 0.5);
        const name = symbolicName(button.item.app);
        if (name)
            return new St.Icon({icon_name: name, icon_size: iconSize});
        // Without a symbolic icon the real one is tinted, which reads the
        // same from a distance.
        const icon = button.item.app.create_icon_texture(Math.round(size * ICON_SHARE * 0.8));
        button.tint = new Clutter.ColorizeEffect();
        icon.add_effect(button.tint);
        return icon;
    }

    fill(button) {
        super.fill(button);
        if (button.kind === 'app') {
            button.run.set({onColor: 'onPc', focusColor: 'onPc'});
            button.run._runningLength = 4;
        }
    }

    paintRoot() {
        super.paintRoot();
        const roles = this.host.theme.roles;
        this.body.set_style(`${this.tileStyle(roles.pc, this.barRadius)} padding: ${this.barPadding}px ${this.px(10)}px; spacing: ${this.px(6)}px;`);
        this.separator.set_style(`background-color: ${roles.onPc}; opacity: 0.4;`);
    }

    paint(button) {
        const roles = this.host.theme.roles;
        const item = button.item;
        if (button.kind === 'app') {
            const focused = item.focused;
            const color = focused ? roles.onPrimary : roles.onPc;
            const circle = focused ? `background-color: ${roles.primary}; border-radius: ${Math.round(this.tile / 2)}px;` : 'background-color: transparent;';
            button.tileBin.set_style(`${circle} color: ${color};`);
            button.tint?.set_tint(coglColor(color));
            button.tileBin.opacity = item.windows.length > 0 ? 255 : CLOSED_OPACITY;
            // Window counts as dots, also a single one.
            button.run.set({windows: item.windows.length, focused: false, playing: this.host.playing(item)});
        } else if (button.kind === 'place') {
            super.paint(button);
            button.tileBin.set_style(`background-color: transparent; color: ${roles.onPc};`);
        } else {
            button.tileBin.set_style(`${this.tileStyle(roles.onPc, this.showAppsRadius)} color: ${roles.pc};`);
        }
        this.host.paintStatus(button);
    }
}
