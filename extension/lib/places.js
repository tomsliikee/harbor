// The places at the end of the dock: plugged-in and network drives, and
// the trash, empty or full. A click opens them in the file manager.

import Gio from 'gi://Gio';

import {EventEmitter} from 'resource:///org/gnome/shell/misc/signals.js';

const TRASH = 'trash:///';
const NETWORK = ['smb', 'sftp', 'ftp', 'dav', 'davs', 'nfs', 'afp'];

function wanted(mount) {
    if (mount.is_shadowed())
        return false;
    const root = mount.get_root();
    if (NETWORK.includes(root.get_uri_scheme()))
        return true;
    return mount.can_eject() || mount.can_unmount() && (mount.get_drive()?.is_removable() ?? false);
}

export class Places extends EventEmitter {
    constructor() {
        super();
        this.list = [];
        this._monitor = Gio.VolumeMonitor.get();
        this._monitor.connectObject(
            'mount-added', () => this._refresh(),
            'mount-removed', () => this._refresh(),
            'mount-changed', () => this._refresh(), this);
        this._trash = Gio.File.new_for_uri(TRASH);
        this._trashFull = false;
        try {
            this._trashMonitor = this._trash.monitor_directory(Gio.FileMonitorFlags.NONE, null);
            this._trashMonitor.connect('changed', () => this._refresh());
        } catch {
            this._trashMonitor = null;
        }
        this._refresh();
    }

    destroy() {
        this._monitor.disconnectObject(this);
        this._trashMonitor?.cancel();
        this.disconnectAll();
    }

    _refresh() {
        try {
            const info = this._trash.query_info('trash::item-count', Gio.FileQueryInfoFlags.NONE, null);
            this._trashFull = info.get_attribute_uint32('trash::item-count') > 0;
        } catch {
            this._trashFull = false;
        }
        const drives = this._monitor.get_mounts().filter(wanted).map(mount => ({
            id: `mount:${mount.get_root().get_uri()}`,
            name: mount.get_name(),
            gicon: mount.get_symbolic_icon(),
            uri: mount.get_root().get_uri(),
            mount,
        }));
        this.list = [
            ...drives,
            {
                id: 'trash',
                name: 'Trash',
                iconName: this._trashFull ? 'user-trash-full-symbolic' : 'user-trash-symbolic',
                uri: TRASH,
                full: this._trashFull,
            },
        ];
        this.emit('changed');
    }
}

export function open(place) {
    try {
        Gio.AppInfo.launch_default_for_uri(place.uri, global.create_app_launch_context(0, -1));
    } catch (e) {
        logError(e, `Harbor: cannot open ${place.uri}`);
    }
}

export function eject(place) {
    const mount = place.mount;
    if (!mount)
        return;
    const operation = new Gio.MountOperation();
    const done = (source, result) => {
        try {
            source[mount.can_eject() ? 'eject_with_operation_finish' : 'unmount_with_operation_finish'](result);
        } catch (e) {
            if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.FAILED_HANDLED))
                logError(e, 'Harbor: cannot eject');
        }
    };
    if (mount.can_eject())
        mount.eject_with_operation(Gio.MountUnmountFlags.NONE, operation, null, done);
    else
        mount.unmount_with_operation(Gio.MountUnmountFlags.NONE, operation, null, done);
}

