// What every dock style shares: one button per app, place and Show apps,
// kept across updates so hover and drags survive a change, and painted
// again whenever the colours change. A style decides how the buttons are
// arranged and drawn.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {HarborAppButton} from '../appbutton.js';
import {rgba} from '../palettes.js';

export const TONE_TEXT = {pc: 'onPc', sc: 'onSc', tc: 'onTc'};

export function box(vertical, styleClass = '', params = {}) {
    return new St.BoxLayout({
        orientation: vertical ? Clutter.Orientation.VERTICAL : Clutter.Orientation.HORIZONTAL,
        style_class: styleClass,
        ...params,
    });
}

export class Style {
    constructor(host) {
        this.host = host;
        this._buttons = new Map();
        this.actor = this.buildRoot();
        this.host.theme.connectObject('changed', () => this.repaint(), this);
    }

    // The style keeps room for itself at the edge even when windows could
    // use it (only the rail does).
    get reservesSpace() {
        return false;
    }

    // The style spans the whole edge instead of floating in its middle.
    get fullLength() {
        return false;
    }

    // Distance from the screen edge.
    get edgeGap() {
        return this.host.vertical ? 16 : 24;
    }

    // Whether the bar's background follows nearby windows (85 % / 100 %).
    get hasBar() {
        return true;
    }

    get s() {
        return this.host.scale;
    }

    px(value) {
        return Math.round(value * this.s);
    }

    buildRoot() {
        throw new Error('A style builds its root');
    }

    // Creates the inside of a new button once.
    fill(_button) {}

    // Paints a button for its current item.
    paint(_button) {}

    // Places the buttons; groups: {pinned, running, places, showApps}.
    arrange(_groups) {}

    paintRoot() {}

    // The buttons of the apps, in dock order, for drops.
    appButtons() {
        return [...this._buttons.values()].filter(button => button.kind === 'app' && button.get_parent());
    }

    // The button of one app, if it shows here.
    buttonFor(appId) {
        return this._buttons.get(`app:${appId}`) ?? null;
    }

    update(snapshot) {
        this.snapshot = snapshot;
        const seen = new Set();
        const take = (key, kind, item, styleClass) => {
            seen.add(key);
            let button = this._buttons.get(key);
            if (!button) {
                button = new HarborAppButton({kind, item, host: this.host, styleClass});
                this._buttons.set(key, button);
                this.fill(button);
            } else {
                button.setItem(item);
            }
            return button;
        };
        const apps = this.host.appsFor(snapshot);
        const groups = {
            pinned: apps.filter(entry => entry.pinned).map(entry => take(`app:${entry.id}`, 'app', entry)),
            running: apps.filter(entry => !entry.pinned).map(entry => take(`app:${entry.id}`, 'app', entry)),
            places: this.host.places().map(place => take(`place:${place.id}`, 'place', place)),
            showApps: take('show-apps', 'show-apps', {name: 'Show apps'}, 'harbor-show-apps'),
        };
        for (const [key, button] of this._buttons) {
            if (!seen.has(key)) {
                this._buttons.delete(key);
                button.destroy();
            }
        }
        this.arrange(groups);
        this.repaint();
    }

    repaint() {
        this.paintRoot();
        for (const button of this._buttons.values())
            this.paint(button);
    }

    // Moves children into a container in the given order, reusing them.
    place(container, children) {
        children.forEach((child, index) => {
            const parent = child.get_parent();
            if (parent !== container) {
                parent?.remove_child(child);
                container.insert_child_at_index(child, index);
            } else {
                container.set_child_at_index(child, index);
            }
        });
    }

    destroy() {
        this.host.theme.disconnectObject(this);
        this._buttons.clear();
        this.actor.destroy();
    }

    // Helpers for painting.
    tileStyle(background, radius, alpha = 1) {
        return `background-color: ${rgba(background, alpha)}; border-radius: ${radius}px;`;
    }
}
