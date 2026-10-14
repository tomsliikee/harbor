// The docks: one on the main monitor, or one on each with "Every monitor".
// While Harbor runs, GNOME's own dash in the overview steps aside.

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {Dock} from './dock.js';

export class Docks {
    // shared: what every dock gets (see Dock).
    constructor(shared) {
        this._shared = shared;
        this._docks = [];
        this._dash = Main.overview.dash;
        this._dash.hide();
        // The overview may show the dash again when it opens.
        this._dash.connectObject('notify::visible', () => {
            if (this._dash.visible)
                this._dash.hide();
        }, this);
        Main.layoutManager.connectObject('monitors-changed', () => this._build(), this);
        this._build();
    }

    get all() {
        return this._docks;
    }

    // The dock state the top bar reports: the main monitor's.
    get state() {
        return this._docks[0]?.state ?? 'showing';
    }

    setSettings(settings) {
        const everyMonitor = settings.everyMonitor !== this._everyMonitor;
        if (everyMonitor) {
            this._build();
            return;
        }
        for (const dock of this._docks)
            dock.setSettings(settings);
    }

    update(snapshot) {
        for (const dock of this._docks)
            dock.update(snapshot);
    }

    repaint() {
        for (const dock of this._docks)
            dock.repaint();
    }

    windowsChanged() {
        for (const dock of this._docks)
            dock.windowsChanged();
    }

    _build() {
        this._clear();
        const settings = this._shared.settings();
        this._everyMonitor = settings.everyMonitor;
        const primary = Main.layoutManager.primaryIndex;
        const indexes = settings.everyMonitor
            ? [primary, ...Main.layoutManager.monitors.map(m => m.index).filter(i => i !== primary)]
            : [primary];
        this._docks = indexes.map(index => new Dock(index, this._shared));
        const snapshot = this._shared.model.snapshot;
        if (snapshot)
            this.update(snapshot);
    }

    _clear() {
        for (const dock of this._docks)
            dock.destroy();
        this._docks = [];
    }

    destroy() {
        this._clear();
        Main.layoutManager.disconnectObject(this);
        this._dash.disconnectObject(this);
        this._dash.show();
    }
}
