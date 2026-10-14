// Whether the computer runs on battery, from UPower. "Always moving" rests
// then. Without UPower it counts as on mains.

import Gio from 'gi://Gio';

import {EventEmitter} from 'resource:///org/gnome/shell/misc/signals.js';

export class Power extends EventEmitter {
    constructor() {
        super();
        this.onBattery = false;
        this._proxy = null;
        Gio.DBusProxy.new_for_bus(Gio.BusType.SYSTEM, Gio.DBusProxyFlags.NONE, null,
            'org.freedesktop.UPower', '/org/freedesktop/UPower', 'org.freedesktop.UPower', null, (_source, result) => {
                try {
                    this._proxy = Gio.DBusProxy.new_for_bus_finish(result);
                } catch (e) {
                    logError(e, 'Harbor: no UPower');
                    return;
                }
                if (this._destroyed) {
                    this._proxy = null;
                    return;
                }
                this._proxy.connectObject('g-properties-changed', () => this._read(), this);
                this._read();
            });
    }

    _read() {
        const onBattery = Boolean(this._proxy?.get_cached_property('OnBattery')?.unpack());
        if (onBattery === this.onBattery)
            return;
        this.onBattery = onBattery;
        this.emit('changed');
    }

    destroy() {
        this._destroyed = true;
        this._proxy?.disconnectObject(this);
        this._proxy = null;
        this.disconnectAll();
    }
}
