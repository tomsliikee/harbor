// Status: the floating bar with status said out loud. Above an app that
// downloads or wants attention stands a small pill that says so, and that
// stays even with "Counts on icons" switched off.

import St from 'gi://St';

import {text} from '../text.js';
import * as Words from '../words.js';
import {FloatingBarStyle} from './floating-bar.js';

const GAP = 6;

export class StatusStyle extends FloatingBarStyle {
    constructor(host) {
        super(host);
        this._pills = new Map();
    }

    get loudStatus() {
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
            });
            button.connect('notify::allocation', () => this._place(button));
        }
        pill.label.text = sentence;
        const roles = this.host.theme.roles;
        pill.set_style(`background-color: ${roles.on}; color: ${roles.bright};`);
        this._place(button);
    }

    overlayMoved() {
        for (const button of this._pills.keys())
            this._place(button);
    }

    _place(button) {
        const pill = this._pills.get(button);
        if (!pill || !button.get_stage())
            return;
        const r = this.positionOf(button);
        if (!r)
            return;
        const [, w] = pill.get_preferred_width(-1);
        const [, h] = pill.get_preferred_height(w);
        const side = this.host.side;
        if (side === 'bottom')
            pill.set_position(Math.round(r.x + r.width / 2 - w / 2), Math.round(r.y - h - GAP - this.barPadding));
        else if (side === 'left')
            pill.set_position(Math.round(r.x + r.width + GAP + this.barPadding), Math.round(r.y + r.height / 2 - h / 2));
        else
            pill.set_position(Math.round(r.x - w - GAP - this.barPadding), Math.round(r.y + r.height / 2 - h / 2));
    }
}
