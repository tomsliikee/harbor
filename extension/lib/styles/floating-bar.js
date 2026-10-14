// Floating bar: one rounded bar that floats above the edge. The apps' own
// icons stand free on it; a shape in the focused app's tone glides behind
// whichever app has the focus, and a line under each says what runs.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {SPRINGS, expressive, run, spring, springShare, stretch} from '../choreo.js';
import {HarborRunLine} from '../runline.js';
import {HarborShape} from '../shape.js';
import {COOKIE, SUNNY} from '../shapes.js';
import {settleMs} from '../spring.js';
import {Style, box, rectIn} from './base.js';

export class FloatingBarStyle extends Style {
    constructor(host) {
        super(host);
        this._focus = null;
        this._glide = null;
        this.glider = new HarborShape({size: this.slotSize});
        this.glider.set_pivot_point(0.5, 0.5);
        this.glider.set_scale(0, 0);
        this.glider.setShape(SUNNY, {animated: false});
        this.backdrop.add_child(this.glider);
    }

    buildRoot() {
        const vertical = this.host.vertical;
        const root = box(vertical, 'harbor-bar harbor-floating');
        this.apps = box(vertical, 'harbor-bar-apps');
        this.separator = new St.Widget({style_class: 'harbor-separator'});
        this.ends = box(vertical, 'harbor-bar-apps');
        // The separator pops up with the items around it.
        this.separator._harborItem = true;
        this.separator.set_pivot_point(0.5, 0.5);
        root.add_child(this.apps);
        root.add_child(this.separator);
        root.add_child(this.ends);
        return root;
    }

    get barRadius() {
        return this.px(32);
    }

    get barPadding() {
        return this.px(8);
    }

    // The colour of the focus shape behind an app.
    focusColor(button) {
        return this.toneColor(button.item.tone, 0.32);
    }

    fill(button) {
        const side = this.host.side;
        const vertical = this.host.vertical;
        // The run line sits between the icon and the screen edge.
        const content = box(!vertical, 'harbor-item-box');
        const slot = this.makeSlot(button);
        const run = new HarborRunLine({theme: this.host.theme, vertical, scale: this.s});
        if (side === 'left') {
            content.add_child(run);
            content.add_child(slot);
        } else {
            content.add_child(slot);
            content.add_child(run);
        }
        // Show apps and places carry no run line, but keep the same rhythm.
        if (button.kind !== 'app')
            run.opacity = 0;
        run.visible = button.kind !== 'show-apps';
        content.x_align = Clutter.ActorAlign.CENTER;
        content.y_align = Clutter.ActorAlign.CENTER;
        button.set_child(content);
        button.tileBin = slot;
        button.run = run;
        button.connect('notify::allocation', () => {
            if (button === this._focus)
                this._placeGlider();
        });
        this.host.decorate(button);
    }

    arrange({pinned, running, places, showApps}) {
        this.place(this.apps, [...pinned, ...running]);
        this.place(this.ends, [...places, showApps]);
        this.separator.visible = true;
        this.setFocus([...pinned, ...running].find(button => button.item.focused) ?? null);
    }

    paintRoot() {
        const roles = this.host.theme.roles;
        const vertical = this.host.vertical;
        const pad = this.barPadding;
        this.body.set_style(`padding: ${pad}px; spacing: ${this.px(4)}px;`);
        this.bar(this.body, this.tileStyle(roles.highest, this.barRadius, this.host.barAlpha));
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

    paint(button) {
        this.paintSlot(button);
        if (button.kind === 'app') {
            const item = button.item;
            button.run.set({windows: item.windows.length, focused: item.focused, playing: this.host.playing(item)});
            if (button === this._focus)
                this._paintGlider();
        }
        this.host.paintStatus(button);
    }

    // The focus shape

    setFocus(button) {
        if (button === this._focus)
            return;
        const before = this._focus;
        this._focus = button;
        before?.slot?.setBacked(false);
        if (!button) {
            this._glide?.stop();
            this._glide = null;
            spring(this.glider, {scale_x: 0, scale_y: 0}, {spring: SPRINGS.leave});
            return;
        }
        button.slot?.setBacked(true);
        this._paintGlider();
        // From nothing the shape grows in place; from another app it glides.
        if (!before || this.glider.scale_x < 0.1 || !expressive()) {
            this._glide?.stop();
            this._glide = null;
            this._placeGlider();
            spring(this.glider, {scale_x: 1, scale_y: 1}, {spring: SPRINGS.pop});
        } else {
            this._startGlide();
        }
    }

    _paintGlider() {
        const button = this._focus;
        if (!button)
            return;
        const attention = this.host.attentionFor(button);
        this.glider.setColor(attention ? this.host.theme.warn : this.focusColor(button));
    }

    // Where the focus shape belongs: centred on the focused app's slot.
    _gliderTarget() {
        const slot = this._focus?.slot;
        if (!slot)
            return null;
        const r = rectIn(slot, this.actor);
        if (!r)
            return null;
        const size = this.glider.width;
        return {x: Math.round(r.x + (r.width - size) / 2), y: Math.round(r.y + (r.height - size) / 2)};
    }

    _placeGlider() {
        if (this._glide)
            return;
        const to = this._gliderTarget();
        if (to)
            this.glider.set_position(to.x, to.y);
    }

    // The shape springs over to the new app and follows it if it moves on
    // the way (an app that just opened grows in at the same time).
    _startGlide() {
        this._glide?.stop();
        const from = {x: this.glider.x, y: this.glider.y};
        const length = settleMs(SPRINGS.glide);
        this.glider.setShape(COOKIE);
        this._glide = run(this.glider, length, ms => {
            const to = this._gliderTarget();
            if (!to)
                return;
            const share = ms >= stretch(length) ? 1 : springShare(ms, 0, SPRINGS.glide);
            this.glider.set_position(Math.round(from.x + (to.x - from.x) * share), Math.round(from.y + (to.y - from.y) * share));
        }, () => {
            this._glide = null;
            this.glider.setShape(SUNNY);
            this._placeGlider();
        });
    }

    layoutChanged() {
        super.layoutChanged();
        this._placeGlider();
    }

    // While the dock appears, the focus shape grows with its app.
    revealFrame() {
        const scale = this._focus?.scale_x ?? 0;
        if (!this._glide)
            this.glider.set_scale(scale, scale);
    }

    setAmbient(on) {
        this.glider.setSpin(on);
    }

    destroy() {
        this._glide?.stop();
        this._glide = null;
        this._focus = null;
        super.destroy();
    }
}
