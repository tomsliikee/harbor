// HarborSegmented: the design system's ButtonGroup. The chosen segment
// turns fully round and fills with primary; radius and colour travel.

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {STATE_MS, animate} from '../motion.js';
import {mix} from '../palettes.js';
import {text} from '../text.js';

const HEIGHT = 40;
const OUTER = 20;
const INNER = 8;

function radiiFor(index, count) {
    const first = index === 0;
    const last = index === count - 1;
    return [first ? OUTER : INNER, last ? OUTER : INNER, last ? OUTER : INNER, first ? OUTER : INNER];
}

export const HarborSegmented = GObject.registerClass({GTypeName: 'HarborSegmented'},
class HarborSegmented extends St.BoxLayout {
    // choices: [{value, caption}]
    _init({theme, choices, onPick, accessibleName = ''}) {
        super._init({style_class: 'harbor-segments', x_expand: true, accessible_name: accessibleName});
        this.layout_manager.homogeneous = true;
        this._theme = theme;
        this._chosen = null;
        this._segments = choices.map(({value, caption}, index) => {
            const label = text('segment', {text: caption});
            label.x_align = Clutter.ActorAlign.CENTER;
            const button = new St.Button({
                style_class: 'harbor-segment',
                child: label,
                can_focus: true,
                x_expand: true,
                height: HEIGHT,
                accessible_name: caption,
            });
            button.connect('clicked', () => onPick(value));
            this.add_child(button);
            return {value, button, radii: radiiFor(index, choices.length), progress: 0, tween: null};
        });
        this._theme.connectObject('changed', () => this._paintAll(), this);
        this.connect('destroy', () => {
            this._theme.disconnectObject(this);
            for (const segment of this._segments)
                segment.tween?.stop();
        });
        this._paintAll();
    }

    select(value, {animated = true} = {}) {
        if (value === this._chosen)
            return;
        this._chosen = value;
        for (const segment of this._segments) {
            const target = segment.value === value ? 1 : 0;
            segment.tween?.stop();
            segment.tween = null;
            if (!animated || segment.progress === target) {
                segment.progress = target;
                this._paint(segment);
                continue;
            }
            const from = segment.progress;
            segment.tween = animate(segment.button, STATE_MS, t => {
                segment.progress = from + (target - from) * t;
                this._paint(segment);
            });
        }
    }

    _paintAll() {
        for (const segment of this._segments)
            this._paint(segment);
    }

    _paint(segment) {
        const roles = this._theme.roles;
        const t = segment.progress;
        const radii = segment.radii.map(r => Math.round(r + (OUTER - r) * t));
        segment.button.set_style(
            `border-radius: ${radii.map(r => `${r}px`).join(' ')};` +
            `background-color: ${mix(roles.pc, roles.primary, t)};` +
            `color: ${mix(roles.onPc, roles.onPrimary, t)};`);
    }
});
