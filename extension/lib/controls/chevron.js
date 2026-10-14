// The small round button that reveals what is folded away below it. Its
// arrow turns half a circle once that is open.

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Graphene from 'gi://Graphene';
import St from 'gi://St';

import {ease} from '../motion.js';

const ICON = 16;

export const HarborChevron = GObject.registerClass({GTypeName: 'HarborChevron'},
class HarborChevron extends St.Button {
    _init({accessibleName, styleClass = 'harbor-chevron'}) {
        this._icon = new St.Icon({
            icon_name: 'pan-down-symbolic',
            icon_size: ICON,
            pivot_point: new Graphene.Point({x: 0.5, y: 0.5}),
        });
        super._init({
            style_class: styleClass,
            child: this._icon,
            can_focus: true,
            x_align: Clutter.ActorAlign.CENTER,
            accessible_name: accessibleName,
        });
    }

    setOpen(open, {animated = true} = {}) {
        const angle = open ? 180 : 0;
        if (animated)
            ease(this._icon, {rotation_angle_z: angle});
        else
            this._icon.rotation_angle_z = angle;
    }
});
