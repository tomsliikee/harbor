// What stands for an app: its symbol or its real icon, resting on a tile
// in the app's own tone.

import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import St from 'gi://St';

import {rgb, rgba} from './palettes.js';
import {symbolFor} from './symbols.js';

// A symbol fills half its tile, as in the design; a real icon more.
export const GLYPH_SHARE = 0.5;
const REAL_SHARE = 0.7;
const TINTED_SHARE = 0.58;

function coglColor(hex) {
    const [r, g, b] = rgb(hex).map(channel => Math.round(channel * 255));
    return new Cogl.Color({red: r, green: g, blue: b, alpha: 255});
}

// The app's glyph for a tile of `tile` px. With symbolic icons on it is the
// app's symbol, or, if it has none, its real icon in one colour (tint);
// otherwise its real icon. {icon, tint, symbolic}
export function appGlyph(app, tile, {symbolicIcons = true, symbols = {}} = {}) {
    if (!symbolicIcons)
        return {icon: app.create_icon_texture(Math.round(tile * REAL_SHARE)), tint: null, symbolic: false};
    const gicon = symbolFor(app, symbols);
    if (gicon)
        return {icon: new St.Icon({gicon, icon_size: Math.round(tile * GLYPH_SHARE)}), tint: null, symbolic: true};
    const icon = app.create_icon_texture(Math.round(tile * TINTED_SHARE));
    const tint = new Clutter.ColorizeEffect();
    icon.add_effect(tint);
    return {icon, tint, symbolic: true};
}

// Paints a glyph from appGlyph; a real icon keeps its own colours.
export function paintGlyph(glyph, color) {
    if (!glyph?.symbolic)
        return;
    glyph.icon.set_style(`color: ${color};`);
    glyph.tint?.set_tint(coglColor(color));
}

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
