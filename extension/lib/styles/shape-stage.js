// Shape stage: every app stands on an expressive shape, and the shape is
// the run indicator: a circle while closed, more points the more windows
// are open. The focused app's stage is larger.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {COOKIE, ladder} from '../shapes.js';
import {Style, box} from './base.js';

export class ShapeStageStyle extends Style {
    buildRoot() {
        const vertical = this.host.vertical;
        const root = box(vertical, 'harbor-bar');
        this.apps = box(vertical);
        this.separator = new St.Widget();
        this.ends = box(vertical);
        // The separator pops up with the items around it.
        this.separator._harborItem = true;
        this.separator.set_pivot_point(0.5, 0.5);
        root.add_child(this.apps);
        root.add_child(this.separator);
        root.add_child(this.ends);
        return root;
    }

    // The slot holds the focused stage; other stages are drawn smaller.
    get focusedStage() {
        return Math.round(this.slotSize * 1.14);
    }

    get restScale() {
        return this.slotSize / this.focusedStage;
    }

    fill(button) {
        const iconSize = Math.round(this.host.iconPx * 0.8);
        const slot = this.makeSlot(button, {
            size: this.focusedStage,
            iconSize,
            solid: {scale: this.restScale, hoverScale: this.restScale * 1.06},
        });
        // A holder, so the status layer can wrap the slot.
        const holder = new St.Widget({layout_manager: new Clutter.BinLayout()});
        holder.add_child(slot);
        button.set_child(holder);
        button.tileBin = slot;
        button.shape = slot.shape;
        this.host.decorate(button);
    }

    arrange({pinned, running, places, showApps}) {
        this.place(this.apps, [...pinned, ...running]);
        this.place(this.ends, [...places, showApps]);
    }

    paintRoot() {
        const roles = this.host.theme.roles;
        const vertical = this.host.vertical;
        const [a, b] = vertical ? [this.px(14), this.px(8)] : [this.px(8), this.px(14)];
        this.body.set_style(`padding: ${a}px ${b}px; spacing: ${this.px(2)}px;`);
        this.bar(this.body, this.tileStyle(roles.surf, this.px(48), this.host.barAlpha));
        this.apps.set_style(`spacing: ${this.px(2)}px;`);
        this.ends.set_style(`spacing: ${this.px(2)}px;`);
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

    slotColor(button) {
        const roles = this.host.theme.roles;
        if (button.kind === 'app') {
            const item = button.item;
            return item.focused ? roles.pc : item.windows.length > 0 ? roles.sc : roles.bright;
        }
        return button.kind === 'show-apps' ? roles.tc : roles.bright;
    }

    paint(button) {
        this.paintSlot(button);
        if (button.kind === 'app') {
            const item = button.item;
            const scale = item.focused ? 1 : this.restScale;
            button.slot.setRest({form: ladder(item.windows.length), hoverForm: COOKIE, scale, hoverScale: scale * 1.06});
            button.icon.icon_size = Math.round(this.host.iconPx * (item.focused ? 0.9 : 0.8));
        }
        this.host.paintStatus(button);
    }

    setAmbient(on) {
        for (const button of this.revealItems())
            button.shape?.setSpin(on);
    }
}
