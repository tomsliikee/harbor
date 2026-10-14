// The five colour styles. Each is Material 3's SchemeVibrant (contrast 0)
// of one seed, worked out ahead with @material/material-color-utilities;
// blue is the design system's own palette. Code reads roles, never hex.

export const COLOURS = ['blue', 'violet', 'green', 'orange', 'pink'];

export const palettes = {
    blue: {
        light: {primary: '#0045fc', onPrimary: '#ffffff', pc: '#dee1ff', onPc: '#0033c2', sc: '#e5deff', onSc: '#474364', tc: '#eedbff', onTc: '#523d6c', surf: '#edecfb', bright: '#fbf8ff', high: '#e7e7f5', highest: '#e2e1ef', low: '#f3f2ff', on: '#191b25', onVar: '#444654', outline: '#757685', outVar: '#c5c5d6'},
        dark: {primary: '#b9c3ff', onPrimary: '#00228b', pc: '#0033c2', onPc: '#dee1ff', sc: '#474364', onSc: '#e5deff', tc: '#523d6c', onTc: '#eedbff', surf: '#1d1f29', bright: '#373843', high: '#282934', highest: '#33343f', low: '#191b25', on: '#e2e1ef', onVar: '#c5c5d6', outline: '#8e909f', outVar: '#444654'},
    },
    violet: {
        light: {primary: '#7706ff', onPrimary: '#ffffff', pc: '#eaddff', onPc: '#5a00c6', sc: '#f2daff', onSc: '#523f5f', tc: '#ffd5ff', onTc: '#5e3962', surf: '#f3ebfa', bright: '#fef7ff', high: '#ede5f4', highest: '#e8dfee', low: '#f9f1ff', on: '#1d1a24', onVar: '#4a4453', outline: '#7b7484', outVar: '#ccc3d5'},
        dark: {primary: '#d2bbff', onPrimary: '#3f008e', pc: '#5a00c6', onPc: '#eaddff', sc: '#523f5f', onSc: '#f2daff', tc: '#5e3962', onTc: '#ffd5ff', surf: '#221e28', bright: '#3c3743', high: '#2c2833', highest: '#37333e', low: '#1d1a24', on: '#e8dfee', onVar: '#ccc3d5', outline: '#958e9e', outVar: '#4a4453'},
    },
    green: {
        light: {primary: '#006e2e', onPrimary: '#ffffff', pc: '#67ff8d', onPc: '#005321', sc: '#c1ecd4', onSc: '#284e3c', tc: '#aaf0df', onTc: '#005045', surf: '#e6f1e3', bright: '#f2fcee', high: '#e1ebdd', highest: '#dbe5d7', low: '#ecf7e8', on: '#151e15', onVar: '#3e4a3d', outline: '#6e7a6c', outVar: '#bdcaba'},
        dark: {primary: '#00e468', onPrimary: '#003915', pc: '#005321', onPc: '#67ff8d', sc: '#284e3c', onSc: '#c1ecd4', tc: '#005045', onTc: '#aaf0df', surf: '#192219', bright: '#323c32', high: '#232c23', highest: '#2e372e', low: '#151e15', on: '#dbe5d7', onVar: '#bdcaba', outline: '#879485', outVar: '#3e4a3d'},
    },
    orange: {
        light: {primary: '#ab3500', onPrimary: '#ffffff', pc: '#ffdbd0', onPc: '#832700', sc: '#ffdcc5', onSc: '#633e22', tc: '#ffddb6', onTc: '#633f06', surf: '#ffe9e3', bright: '#fff8f6', high: '#ffe2da', highest: '#f9ddd4', low: '#fff1ed', on: '#271813', onVar: '#58423a', outline: '#8c7169', outVar: '#dfc0b6'},
        dark: {primary: '#ffb59c', onPrimary: '#5c1900', pc: '#832700', onPc: '#ffdbd0', sc: '#633e22', onSc: '#ffdcc5', tc: '#633f06', onTc: '#ffddb6', surf: '#2b1c17', bright: '#47352f', high: '#362621', highest: '#42312b', low: '#271813', on: '#f9ddd4', onVar: '#dfc0b6', outline: '#a78b82', outVar: '#58423a'},
    },
    pink: {
        light: {primary: '#ba005b', onPrimary: '#ffffff', pc: '#ffd9e1', onPc: '#8f0044', sc: '#ffdad7', onSc: '#663b39', tc: '#ffdbcf', onTc: '#6e3824', surf: '#ffe8ec', bright: '#fff8f8', high: '#fce2e6', highest: '#f6dce1', low: '#fff0f2', on: '#26181b', onVar: '#564146', outline: '#897176', outVar: '#ddbfc5'},
        dark: {primary: '#ffb1c4', onPrimary: '#65002e', pc: '#8f0044', onPc: '#ffd9e1', sc: '#663b39', onSc: '#ffdad7', tc: '#6e3824', onTc: '#ffdbcf', surf: '#2a1c1f', bright: '#453538', high: '#352629', highest: '#413034', low: '#26181b', on: '#f6dce1', onVar: '#ddbfc5', outline: '#a48a8f', outVar: '#564146'},
    },
};

// Fixed, they do not follow the style.
export const warn = {light: '#f2b600', dark: '#f5cc4a', on: '#3a2c00'};

// An unknown colour falls back to blue, so a broken setting still draws.
export function palette(colour, scheme) {
    return palettes[colour]?.[scheme] ?? palettes.blue[scheme];
}

// "#rrggbb" to [r, g, b] in 0–1, for Cairo.
export function rgb(hex) {
    const value = Number.parseInt(hex.slice(1), 16);
    return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

// "#rrggbb" plus an alpha 0–1 as CSS rgba(), for set_style().
export function rgba(hex, alpha = 1) {
    const [r, g, b] = rgb(hex).map(channel => Math.round(channel * 255));
    return `rgba(${r},${g},${b},${alpha})`;
}

// A colour on the way from one hex to another, for colour transitions that
// are drawn or set in code.
export function mix(from, to, t) {
    const a = rgb(from);
    const b = rgb(to);
    const k = Math.max(0, Math.min(1, t));
    const channels = a.map((value, i) => Math.round((value + (b[i] - value) * k) * 255));
    return `#${channels.map(value => value.toString(16).padStart(2, '0')).join('')}`;
}
