// Grouped block: no shared bar, but three named groups: what is pinned,
// what else runs, and the places. The focused app's segment turns fully
// round and fills with ink (or primary, with "Ink focus" off).

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {fromCenter} from '../layout.js';
import {text} from '../text.js';
import {Style, box} from './base.js';

// The group names stand over the wallpaper, so they keep one light grey.
const NAME_COLOR = '#c5c5d6';
const NAMES = {pinned: 'Pinned', running: 'Also running', places: 'Places'};

export class GroupedBlockStyle extends Style {
    buildRoot() {
        const vertical = this.host.vertical;
        const root = box(vertical, 'harbor-groups');
        this.groups = {};
        for (const key of ['pinned', 'running', 'places']) {
            const column = box(true, 'harbor-group-column');
            const name = text('label', {text: NAMES[key]});
            name.set_pivot_point(0.5, 0.5);
            const row = box(vertical, 'harbor-group');
            column.add_child(name);
            column.add_child(row);
            root.add_child(column);
            this.groups[key] = {column, name, row};
        }
        return root;
    }

    // On a side dock the segments lie down, so the dock fits the screen.
    get segment() {
        const slot = this.slotSize;
        return this.host.vertical
            ? {width: slot + this.px(16), height: slot + this.px(12)}
            : {width: slot + this.px(8), height: slot + this.px(18)};
    }

    fill(button) {
        const {width, height} = this.segment;
        const content = box(true, 'harbor-segment-box', {width, height});
        const tile = this.makeSlot(button);
        const dots = new St.Widget({x_align: Clutter.ActorAlign.CENTER, layout_manager: new Clutter.BoxLayout({spacing: this.px(3)})});
        content.add_child(tile);
        content.add_child(dots);
        button.set_child(content);
        button.tileBin = tile;
        button.dots = dots;
        this.host.decorate(button);
    }

    // The groups appear one after another, from the middle one out.
    revealGroups() {
        const columns = Object.values(this.groups).filter(group => group.column.visible);
        const ranks = fromCenter(columns.length);
        return columns.map((group, i) => ({
            bars: [],
            items: [group.name, ...this.revealItems(group.row)],
            rank: ranks[i],
        }));
    }

    get itemStep() {
        return 35;
    }

    arrange({pinned, running, places, showApps}) {
        const lists = {pinned, running, places: [...places, showApps]};
        for (const [key, buttons] of Object.entries(lists)) {
            const group = this.groups[key];
            this.place(group.row, buttons);
            group.column.visible = buttons.length > 0;
            buttons.forEach((button, i) => (button._corner = buttons.length === 1 ? 'only' : i === 0 ? 'first' : i === buttons.length - 1 ? 'last' : 'middle'));
        }
    }

    paintRoot() {
        const vertical = this.host.vertical;
        this.body.set_style(`spacing: ${this.px(12)}px;`);
        for (const group of Object.values(this.groups)) {
            group.column.set_style(`spacing: ${this.px(6)}px;`);
            group.row.set_style(`spacing: ${this.px(4)}px;`);
            group.name.set_style(`color: ${NAME_COLOR}; padding-left: ${this.px(12)}px;`);
            group.name.visible = !vertical;
        }
    }

    radii(button, focused) {
        const outer = this.px(24);
        const inner = this.px(8);
        if (focused)
            return [outer, outer, outer, outer];
        const vertical = this.host.vertical;
        const first = button._corner === 'first' || button._corner === 'only';
        const last = button._corner === 'last' || button._corner === 'only';
        // Top-left, top-right, bottom-right, bottom-left.
        return vertical
            ? [first ? outer : inner, first ? outer : inner, last ? outer : inner, last ? outer : inner]
            : [first ? outer : inner, last ? outer : inner, last ? outer : inner, first ? outer : inner];
    }

    paint(button) {
        const roles = this.host.theme.roles;
        const item = button.item;
        const focused = button.kind === 'app' && item.focused;
        const attention = button.kind === 'app' && this.host.attentionFor(button);
        const background = attention ? this.host.theme.warn : focused ? this.focusInk().fill : roles.bright;
        const radii = this.radii(button, focused).map(r => `${r}px`).join(' ');
        const pad = this.host.vertical ? this.px(6) : this.px(8);
        // Each segment casts its own shadow, so it pops up with it.
        button.set_style(`background-color: ${background}; border-radius: ${radii}; padding: ${pad}px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.16);`);
        this.paintSlot(button);
        if (focused)
            button.slot.paint(roles.bright, this.host.theme.warn);
        const count = button.kind === 'app' ? Math.min(3, item.windows.length) : 0;
        button.dots.destroy_all_children();
        for (let i = 0; i < count; i++) {
            const dot = new St.Widget({width: this.px(5), height: this.px(5)});
            dot.set_style(`background-color: ${focused ? this.focusInk().on : roles.onVar}; border-radius: ${this.px(3)}px;`);
            button.dots.add_child(dot);
        }
        button.dots.height = this.px(5);
        this.host.paintStatus(button);
    }
}
