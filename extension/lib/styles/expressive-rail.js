// Expressive rail: a rail along the whole edge. The run line sits right at
// the screen edge, and the focused app unfolds into a pill that reaches
// out of the rail with its name and window count.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {SPATIAL, STATE_MS, ease} from '../motion.js';
import {HarborRunLine} from '../runline.js';
import {text} from '../text.js';
import * as Words from '../words.js';
import {ICON_SHARE} from './floating-bar.js';
import {Style, box} from './base.js';

export class ExpressiveRailStyle extends Style {
    constructor(host) {
        super(host);
        this._pillFor = null;
        this.pill = new St.Button({style_class: 'harbor-rail-pill', reactive: true, visible: false});
        const inner = new St.BoxLayout({style_class: 'harbor-rail-pill-box'});
        this.pillPlace = new St.Bin({width: this.px(48), height: this.px(48)});
        const words = new St.BoxLayout({style_class: 'harbor-rail-words'});
        this.pillName = text('nav-label');
        this.pillCount = text('label');
        words.add_child(this.pillName);
        words.add_child(this.pillCount);
        words.y_align = Clutter.ActorAlign.CENTER;
        inner.add_child(this.pillPlace);
        inner.add_child(words);
        this.pill.set_child(inner);
        this.pill.clip_to_allocation = true;
        this.pill.connect('clicked', () => this._pillFor?.emit('clicked', Clutter.BUTTON_PRIMARY));
        this.overlay.add_child(this.pill);
    }

    get reservesSpace() {
        return true;
    }

    get fullLength() {
        return true;
    }

    get edgeGap() {
        return 0;
    }

    get barColor() {
        return this.host.theme.roles.surf;
    }

    get depth() {
        return this.px(80);
    }

    buildRoot() {
        const vertical = this.host.vertical;
        const root = box(vertical, 'harbor-rail', {x_expand: true, y_expand: true});
        this.apps = box(vertical, '', {x_expand: !vertical, y_expand: vertical});
        this.ends = box(vertical);
        root.add_child(this.apps);
        root.add_child(this.ends);
        return root;
    }

    fill(button) {
        const vertical = this.host.vertical;
        const side = this.host.side;
        const content = box(!vertical, 'harbor-item-box');
        const size = button.kind === 'show-apps' ? this.host.iconPx + this.px(8) : this.host.iconPx;
        const tile = new St.Bin({
            width: size, height: size,
            child: button.kind === 'app'
                ? button.item.app.create_icon_texture(Math.round(size * ICON_SHARE))
                : new St.Icon({icon_name: button.kind === 'show-apps' ? 'view-app-grid-symbolic' : null, icon_size: Math.round(size * 0.42)}),
        });
        if (button.kind === 'place')
            button.placeIcon = tile.child;
        const run = new HarborRunLine({theme: this.host.theme, vertical, scale: this.s, focusedLength: this.px(24), runningLength: this.px(8)});
        run.opacity = button.kind === 'app' ? 255 : 0;
        // The line sits at the screen edge; the gap between grows with the rail.
        if (side === 'right') {
            content.add_child(tile);
            content.add_child(run);
        } else if (side === 'left') {
            content.add_child(run);
            content.add_child(tile);
        } else {
            content.add_child(tile);
            content.add_child(run);
        }
        content.set_style(`spacing: ${Math.round((this.depth - size - 6) / 2)}px;`);
        button.set_child(content);
        button.tileBin = tile;
        button.run = run;
        button.connect('notify::allocation', () => {
            if (button === this._pillFor)
                this._placePill();
        });
        this.host.decorate(button);
    }

    arrange({pinned, running, places, showApps}) {
        this.place(this.apps, [...pinned, ...running]);
        this.place(this.ends, [...places, showApps]);
        const focused = [...pinned, ...running].find(button => button.item.focused) ?? null;
        this._showPill(focused);
    }

    paintRoot() {
        const roles = this.host.theme.roles;
        const vertical = this.host.vertical;
        const monitor = this.host.monitor;
        const pad = this.px(16);
        const along = this.px(12);
        this.body.set_style(`background-color: ${roles.surf}; ${vertical ? `padding: ${along}px 0;` : `padding: 0 ${pad}px;`}` +
            `${vertical ? 'width' : 'height'}: ${this.depth}px;`);
        this.apps.set_style(`spacing: ${this.px(8)}px;`);
        this.ends.set_style(`spacing: ${this.px(8)}px;`);
        if (!monitor)
            return;
        this.pill.set_style(`background-color: ${roles.pc}; color: ${roles.onPc}; border-radius: ${this.px(28)}px; padding: ${this.px(4)}px;`);
        this.pillPlace.set_style(`background-color: ${roles.primary}; color: ${roles.onPrimary}; border-radius: ${this.px(24)}px;`);
        this.pill.get_child().set_style(`spacing: ${this.px(12)}px; padding-right: ${this.px(14)}px;`);
        this.pill.get_child().get_children()[1].set_style(`spacing: ${this.px(8)}px;`);
    }

    paint(button) {
        const roles = this.host.theme.roles;
        const item = button.item;
        if (button.kind === 'app') {
            const attention = this.host.attentionFor(button);
            button.tileBin.set_style(this.tileStyle(attention ? this.host.theme.warn : roles[item.tone], this.px(16)));
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
        if (button === this._pillFor)
            this._fillPill(button);
    }

    overlayMoved() {
        this._placePill();
    }

    _fillPill(button) {
        const item = button.item;
        this.pillName.text = item.name;
        this.pillCount.text = Words.windows(item.windows.length);
    }

    // The pill unfolds from the focused app's tile toward the screen.
    _showPill(button) {
        if (button === this._pillFor)
            return;
        this._pillFor = button;
        if (!button) {
            this.pill.visible = false;
            return;
        }
        this.pillPlace.set_child(button.item.app.create_icon_texture(this.px(30)));
        this._fillPill(button);
        this.pill.visible = true;
        this._placePill(true);
    }

    _placePill(unfold = false) {
        const button = this._pillFor;
        if (!button?.get_stage())
            return;
        const r = this.positionOf(button.tileBin);
        if (!r)
            return;
        const height = this.px(56);
        const [, natural] = this.pill.get_preferred_width(height);
        const side = this.host.side;
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        // Where the pill starts (a circle over the tile) and where it ends:
        // away from the edge on a side rail, rising and centred at the bottom.
        let y = cy - height / 2;
        let from = cx - height / 2;
        let to = from;
        if (side === 'right') {
            to = cx + height / 2 - natural;
        } else if (side === 'bottom') {
            y -= this.px(28);
            to = cx - natural / 2;
        }
        this.pill.set_height(height);
        this.pill.y = Math.round(y);
        if (unfold) {
            this.pill.x = Math.round(from);
            this.pill.width = height;
            ease(this.pill, {width: natural, x: Math.round(to)}, {duration: STATE_MS, mode: SPATIAL});
        } else {
            this.pill.x = Math.round(to);
            this.pill.width = natural;
        }
    }

    destroy() {
        this._pillFor = null;
        super.destroy();
    }
}
