// Quiet handle: a compact bar, one size smaller than set; when it is away,
// a thin handle stays at the edge to bring it back.

import {ICON_SIZES} from '../settings.js';

// One step below each icon size.
const SMALLER = [32, 40, 48, 56];
import {FloatingBarStyle} from './floating-bar.js';

export class QuietHandleStyle extends FloatingBarStyle {
    get tile() {
        return SMALLER[ICON_SIZES.indexOf(this.host.settings.iconSize)] ?? 40;
    }

    get showAppsSize() {
        return this.tile + this.px(4);
    }

    get showAppsRadius() {
        return this.px(16);
    }

    get barRadius() {
        return this.px(28);
    }

    get barPadding() {
        return this.px(6);
    }

    // The dock keeps a handle while it is away.
    get handle() {
        return true;
    }
}
