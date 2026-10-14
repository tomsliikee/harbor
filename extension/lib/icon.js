// An app's real icon, resting on a tile in the app's own tone.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {rgba} from './palettes.js';

const TONE_TEXT = {pc: 'onPc', sc: 'onSc', tc: 'onTc'};

export function toneStyle(roles, tone, radius) {
    return `background-color: ${rgba(roles[tone])}; color: ${roles[TONE_TEXT[tone]]}; border-radius: ${radius}px;`;
}

// size: the tile; iconSize: the icon on it.
export function appTile(app, {size, iconSize, radius, styleClass = ''}) {
    const tile = new St.Bin({
        style_class: `harbor-app-tile ${styleClass}`,
        width: size,
        height: size,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
        child: app.create_icon_texture(iconSize),
    });
    tile._harborRadius = radius;
    return tile;
}

export function paintTile(tile, roles, tone) {
    tile.set_style(toneStyle(roles, tone, tile._harborRadius));
}
