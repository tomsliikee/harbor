// The dock styles by their setting id.

import {FloatingBarStyle} from './floating-bar.js';

const STYLES = {
    'floating-bar': FloatingBarStyle,
};

export function makeStyle(id, host) {
    const Style = STYLES[id] ?? FloatingBarStyle;
    return new Style(host);
}
