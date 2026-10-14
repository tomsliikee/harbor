// Mono container: a round bar in the primary container colour, with every
// icon in one colour. Running apps show fully, closed ones fade back, and
// a primary shape glides behind the focused app.

import {appGlyph, paintGlyph} from '../icon.js';
import {mix} from '../palettes.js';
import {CIRCLE} from '../shapes.js';
import {FloatingBarStyle} from './floating-bar.js';

const CLOSED_OPACITY = 153;

export class MonoContainerStyle extends FloatingBarStyle {
    get barPadding() {
        return this.px(10);
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

    get focusForm() {
        return CIRCLE;
    }

    // Icons stand free on the bar, always as symbols in one colour.
    tileRest(button) {
        return null;
    }

    appIcon(button, tile) {
        button.glyph = appGlyph(button.item.app, Math.round(tile * 1.2), {...this.host.settings, symbolicIcons: true});
        return button.glyph.icon;
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
        paintGlyph(button.glyph, color);
        button.icon.opacity = item.windows.length > 0 ? 255 : CLOSED_OPACITY;
        // Window counts as dots, also a single one.
        button.run.set({windows: item.windows.length, focused: false, playing: this.host.playing(item)});
    }
}
