// The top bar item: Harbor's mark alone. Resting the pointer on it shows a
// small look; a click opens the menu.

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import {HarborMark} from './mark.js';
import {Peek} from './peek.js';
import {setScheme} from './theme.js';

// Long enough that crossing the item on the way elsewhere shows nothing.
const HOVER_DELAY_MS = 300;

export const HarborIndicator = GObject.registerClass({GTypeName: 'HarborIndicator'},
class HarborIndicator extends PanelMenu.Button {
    _init(theme) {
        super._init(0.5, 'Harbor', false);
        this._theme = theme;
        this._pending = 0;
        this._snapshot = null;
        this._dockState = 'showing';

        const box = new St.BoxLayout({style_class: 'panel-status-indicators-box harbor-indicator'});
        this._mark = new HarborMark();
        box.add_child(this._mark);
        this.add_child(box);

        this.menu.box.add_style_class_name('harbor-popup');
        this._peek = new Peek(theme);
        this._theme.connectObject('changed', () => this._paint(), this);
        this._paint();

        this.menu.connect('open-state-changed', () => this._cancelPeek());
        this.connect('notify::hover', () => this._hoverChanged());
        this._destroyed = false;
        this.connect('destroy', () => {
            this._destroyed = true;
            this._cancelPeek();
            this._theme.disconnectObject(this);
            this._peek.destroy();
        });
    }

    // The popup's content, made by its owner.
    setContent(actor) {
        this.menu.box.add_child(actor);
    }

    update(snapshot, dockState) {
        // The shell may tear the panel down before Harbor is disabled.
        if (this._destroyed)
            return;
        this._snapshot = snapshot;
        this._dockState = dockState;
        this._mark.set({shown: dockState === 'showing', attention: snapshot.attention});
        this._peek.update(snapshot, dockState);
    }

    _hoverChanged() {
        this._cancelPeek();
        if (!this.hover || this.menu.isOpen)
            return;
        this._pending = GLib.timeout_add(GLib.PRIORITY_DEFAULT, HOVER_DELAY_MS, () => {
            this._pending = 0;
            if (this._snapshot && !this.menu.isOpen)
                this._peek.show(this);
            return GLib.SOURCE_REMOVE;
        });
    }

    _cancelPeek() {
        if (this._pending)
            GLib.source_remove(this._pending);
        this._pending = 0;
        this._peek.hide();
    }

    _paint() {
        setScheme(this.menu.box, this._theme.key);
    }
});
