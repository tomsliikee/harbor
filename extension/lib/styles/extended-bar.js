// Extended bar: the floating bar that says more. Above an app that
// downloads or wants attention stands a small pill that says so, also with
// "Counts on icons" switched off, and resting on an app with windows opens
// its window list without a click.

import GLib from 'gi://GLib';
import St from 'gi://St';

import {text} from '../text.js';
import * as Words from '../words.js';
import {spreadApart} from '../layout.js';
import {rectIn} from './base.js';
import {FloatingBarStyle} from './floating-bar.js';

const GAP = 6;
// Between two pills of neighbouring apps.
const APART = 6;
const HOVER_MS = 400;

export class ExtendedBarStyle extends FloatingBarStyle {
    constructor(host) {
        super(host);
        this._pills = new Map();
        this._pending = 0;
    }

    get loudStatus() {
        return true;
    }

    // The tooltip would only repeat the list's head.
    get hoverLists() {
        return true;
    }

    // What the pill above an app says, if anything.
    sentence(button) {
        const status = this.host.status;
        const entry = status?.entryFor(button.item);
        if (status?.attention(button.item, this.host))
            return 'Wants attention';
        if (entry?.progressVisible)
            return `${Words.percent(entry.progress)} downloaded`;
        return '';
    }

    paint(button) {
        super.paint(button);
        if (button.kind !== 'app')
            return;
        const sentence = this.sentence(button);
        let pill = this._pills.get(button);
        if (!sentence) {
            pill?.destroy();
            this._pills.delete(button);
            this._arrange();
            return;
        }
        if (!pill) {
            const label = text('aside');
            pill = new St.Bin({style_class: 'harbor-status-pill', child: label});
            pill.label = label;
            this.overlay.add_child(pill);
            this._pills.set(button, pill);
            button.connect('destroy', () => {
                this._pills.get(button)?.destroy();
                this._pills.delete(button);
                this._arrange();
            });
            button.connect('notify::allocation', () => this._arrange());
        }
        pill.label.text = sentence;
        const roles = this.host.theme.roles;
        // In the bar's colour with a thin rim, so it reads on dark and light ground.
        pill.set_style(`background-color: ${this.barColor}; color: ${roles.on}; border: 1px solid ${roles.outVar};`);
        this._arrange();
    }

    hovered(button, hover) {
        super.hovered(button, hover);
        if (this._pending)
            GLib.source_remove(this._pending);
        this._pending = 0;
        if (!hover || button.kind !== 'app' || button.item.windows.length === 0)
            return;
        this._pending = GLib.timeout_add(GLib.PRIORITY_DEFAULT, HOVER_MS, () => {
            this._pending = 0;
            if (button.hover)
                this.host.showWindowList(button, {hover: true});
            return GLib.SOURCE_REMOVE;
        });
    }

    overlayMoved() {
        this._arrange();
    }

    // Each pill stands over its app, beside the bar; neighbours keep apart.
    _arrange() {
        const side = this.host.side;
        const along = side === 'bottom' ? 'x' : 'y';
        const placed = [];
        for (const [button, pill] of this._pills) {
            if (!button.get_stage())
                continue;
            const r = rectIn(button, this.actor);
            if (!r)
                continue;
            const [, w] = pill.get_preferred_width(-1);
            const [, h] = pill.get_preferred_height(w);
            placed.push({pill, r, w, h,
                centre: along === 'x' ? r.x + r.width / 2 : r.y + r.height / 2,
                length: along === 'x' ? w : h});
        }
        const starts = spreadApart(placed, APART);
        placed.forEach(({pill, r, w, h}, i) => {
            const start = Math.round(starts[i]);
            if (side === 'bottom')
                pill.set_position(start, Math.round(r.y - h - GAP - this.barPadding));
            else if (side === 'left')
                pill.set_position(Math.round(r.x + r.width + GAP + this.barPadding), start);
            else
                pill.set_position(Math.round(r.x - w - GAP - this.barPadding), start);
        });
    }

    destroy() {
        if (this._pending)
            GLib.source_remove(this._pending);
        this._pending = 0;
        super.destroy();
    }
}
