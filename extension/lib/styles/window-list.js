// Window list: the floating bar, but the list of an app's windows opens as
// soon as the pointer rests on an app that has any, not only on a click.

import GLib from 'gi://GLib';

import {FloatingBarStyle} from './floating-bar.js';

const HOVER_MS = 400;

export class WindowListStyle extends FloatingBarStyle {
    constructor(host) {
        super(host);
        this._pending = 0;
    }

    // The tooltip would only repeat the list's head.
    get hoverLists() {
        return true;
    }

    hovered(button, hover) {
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

    destroy() {
        if (this._pending)
            GLib.source_remove(this._pending);
        this._pending = 0;
        super.destroy();
    }
}
