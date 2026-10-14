// Quiet handle: a compact, calmer bar with less padding and softer corners.
// It is the style made for hiding away; its handle is on by default, as
// every style's is, and can be switched off like theirs.

import {FloatingBarStyle} from './floating-bar.js';

export class QuietHandleStyle extends FloatingBarStyle {
    get barRadius() {
        return this.px(26);
    }

    get barPadding() {
        return this.px(4);
    }
}
