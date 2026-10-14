// Mono container: a round bar in the primary container colour, with every
// icon in one colour. Running apps show fully, closed ones fade back, and
// a primary shape glides behind the focused app.

import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import Gio from 'gi://Gio';
import St from 'gi://St';

import {mix, rgb} from '../palettes.js';
import {FloatingBarStyle} from './floating-bar.js';

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
        return this.px(8);
    }

    // Fully round at its ends.
    get barRadius() {
        return Math.round(this.slotSize / 2 + this.barPadding);
    }

    get barColor() {
        return this.host.theme.roles.pc;
    }

    focusColor() {
        return this.host.theme.roles.primary;
    }

    // Show apps stands out in the on-colour; hover only darkens the bar a
    // little.
    slotColor(button) {
        const roles = this.host.theme.roles;
        return button.kind === 'show-apps' ? roles.onPc : mix(roles.pc, roles.onPc, 0.25);
    }

    glyphColor(button) {
        const roles = this.host.theme.roles;
        return button.kind === 'show-apps' ? roles.pc : roles.onPc;
    }

    appIcon(button, iconSize) {
        const name = symbolicName(button.item.app);
        if (name)
            return new St.Icon({icon_name: name, icon_size: Math.round(iconSize * 0.62)});
        // Without a symbolic icon the real one is tinted, which reads the
        // same from a distance.
        const icon = button.item.app.create_icon_texture(Math.round(iconSize * 0.82));
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
        this.bar(this.body, this.tileStyle(roles.pc, this.barRadius, this.host.barAlpha));
        this.separator.set_style(`background-color: ${roles.onPc}; opacity: 0.4;`);
    }

    paint(button) {
        super.paint(button);
        const roles = this.host.theme.roles;
        if (button.kind !== 'app')
            return;
        const item = button.item;
        const color = item.focused ? roles.onPrimary : roles.onPc;
        button.icon.set_style(`color: ${color};`);
        button.tint?.set_tint(coglColor(color));
        button.icon.opacity = item.windows.length > 0 ? 255 : CLOSED_OPACITY;
        // Window counts as dots, also a single one.
        button.run.set({windows: item.windows.length, focused: false, playing: this.host.playing(item)});
    }
}
