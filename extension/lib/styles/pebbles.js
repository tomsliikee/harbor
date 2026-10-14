// Pebbles: no bar at all. Every app is a pebble of its own that floats in
// its tone; the pebbles near the pointer grow, and the one under it turns
// into a six-pointed cookie with its name above.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {HarborRunLine} from '../runline.js';
import {magnification} from '../layout.js';
import {text} from '../text.js';
import {Style, box} from './base.js';

export class PebblesStyle extends Style {
    constructor(host) {
        super(host);
        this.body.reactive = true;
        this.body.connect('motion-event', () => this._magnify());
        this.body.connect('leave-event', () => this._magnify(true));
        this._name = new St.Bin({style_class: 'harbor-pebble-name', child: text('nav-label'), visible: false});
        this.overlay.add_child(this._name);
    }

    get ownNames() {
        return true;
    }

    buildRoot() {
        const vertical = this.host.vertical;
        return box(vertical, 'harbor-pebbles');
    }

    get pebble() {
        return this.slotSize;
    }

    // Pebbles appear one by one.
    get itemStep() {
        return 45;
    }

    fill(button) {
        const vertical = this.host.vertical;
        const content = box(!vertical, 'harbor-item-box');
        // The icon nearly fills its pebble; the pebble is its tone around it.
        const holder = this.makeSlot(button, {
            iconSize: Math.round(this.pebble * 0.8),
            solid: {scale: 1, hoverScale: 1},
            shadow: true,
        });
        const shape = holder.shape;
        const tile = holder;
        const run = new HarborRunLine({theme: this.host.theme, vertical, scale: this.s});
        if (this.host.side === 'left') {
            content.add_child(run);
            content.add_child(holder);
        } else {
            content.add_child(holder);
            content.add_child(run);
        }
        // Pebbles grow from the edge they rest on.
        const pivot = {bottom: [0.5, 1], left: [0, 0.5], right: [1, 0.5]}[this.host.side];
        button.set_pivot_point(...pivot);
        button.set_child(content);
        button.shape = shape;
        button.tileBin = tile;
        button.run = run;
        run.opacity = button.kind === 'app' ? 255 : 0;
        this.host.decorate(button);
    }

    arrange({pinned, running, places, showApps}) {
        this.place(this.body, [...pinned, ...running, ...places, showApps]);
    }

    paintRoot() {
        this.body.set_style(`spacing: ${this.px(8)}px; padding: ${this.px(10)}px ${this.px(4)}px 0 ${this.px(4)}px;`);
        const roles = this.host.theme.roles;
        this._name.set_style(`background-color: ${roles.on}; color: ${roles.bright};`);
    }

    paint(button) {
        this.paintSlot(button);
        if (button.kind === 'app') {
            const item = button.item;
            button.run.set({windows: item.windows.length, focused: item.focused, playing: this.host.playing(item)});
        }
        this.host.paintStatus(button);
    }

    // The magnification shows what is under the pointer; the slot itself
    // does not need to.
    hovered() {}

    setAmbient(on) {
        for (const button of this.revealItems())
            button.shape?.setSpin(on);
    }

    // The pointer's distance to each pebble, in pebbles, sets its size.
    _magnify(leave = false) {
        const [px, py] = global.get_pointer();
        const vertical = this.host.vertical;
        const buttons = this.body.get_children();
        let nearest = null;
        let nearestDistance = Infinity;
        for (const button of buttons) {
            const [bx, by] = button.get_transformed_position();
            const [bw, bh] = button.get_transformed_size();
            // Untransformed size, so growing does not feed back into itself.
            const size = this.pebble + this.px(8);
            const centre = vertical ? by + bh / 2 : bx + bw / 2;
            const distance = leave ? 99 : ((vertical ? py : px) - centre) / size;
            const scale = magnification(distance);
            button.set_scale(scale, scale);
            if (Math.abs(distance) < nearestDistance) {
                nearestDistance = Math.abs(distance);
                nearest = button;
            }
        }
        for (const button of buttons)
            button.slot?.setHover(button === nearest && nearestDistance < 0.5);
        this._showName(nearestDistance < 0.5 ? nearest : null);
    }

    _showName(button) {
        if (!button) {
            this._name.visible = false;
            return;
        }
        this._name.child.text = button.item.name ?? 'Show apps';
        const r = this.positionOf(button);
        if (!r)
            return;
        const [, w] = this._name.get_preferred_width(-1);
        const [, h] = this._name.get_preferred_height(w);
        const side = this.host.side;
        const lift = this.pebble * 0.45;
        if (side === 'bottom')
            this._name.set_position(Math.round(r.x + r.width / 2 - w / 2), Math.round(r.y - h - lift * 0.4));
        else if (side === 'left')
            this._name.set_position(Math.round(r.x + r.width + lift * 0.4), Math.round(r.y + r.height / 2 - h / 2));
        else
            this._name.set_position(Math.round(r.x - w - lift * 0.4), Math.round(r.y + r.height / 2 - h / 2));
        this._name.visible = true;
    }
}
