import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {ExtensionState} from 'resource:///org/gnome/shell/misc/extensionUtils.js';

import * as Actions from './lib/actions.js';
import {Docks} from './lib/docks.js';
import {HarborIndicator} from './lib/indicator.js';
import {Model} from './lib/model.js';
import {Places} from './lib/places.js';
import {Popup} from './lib/popup.js';
import {SettingsStore} from './lib/settings.js';
import {ThemeController} from './lib/theme.js';

const DASH_TO_DOCK = 'dash-to-dock@micxgx.gmail.com';

// Harbor is a whole dock on its own: it needs nothing from Dash to Dock or
// any other extension, only GNOME Shell.
export default class HarborExtension extends Extension {
    enable() {
        this._idle = 0;
        this._settings = new SettingsStore(settings => this._settingsChanged(settings));
        this._theme = new ThemeController(this._settings.current.colour);
        this._model = new Model();
        this._places = new Places();
        this._docks = new Docks({
            theme: this._theme,
            model: this._model,
            places: this._places,
            status: null,
            settings: () => this._settings.current,
            onState: () => this._queueRender(),
            showWindowList: null,
        });

        this._indicator = new HarborIndicator(this._theme);
        this._popup = new Popup({
            theme: this._theme,
            settings: this._settings,
            onActivate: entry => this._activate(entry),
            onClose: () => this._indicator.menu.close(),
        });
        this._indicator.setContent(this._popup.actor);
        this._indicator.menu.connect('open-state-changed', (_menu, open) => {
            if (open)
                this._popup.opened();
        });
        Main.extensionManager.connectObject('extension-state-changed', () => this._checkDashToDock(), this);
        this._checkDashToDock();
        // Directly left of the system menu.
        const rightBox = Main.panel._rightBox;
        const systemMenu = Main.panel.statusArea.quickSettings?.container;
        const position = Math.max(0, rightBox.get_children().indexOf(systemMenu));
        Main.panel.addToStatusArea(this.uuid, this._indicator, position, 'right');

        this._model.connect('changed', () => this._render());
        this._model.connect('geometry', () => this._docks.windowsChanged());
        this._places.connect('changed', () => this._docks.update(this._model.snapshot));
        this._render();
    }

    disable() {
        Main.extensionManager.disconnectObject(this);
        if (this._idle)
            GLib.source_remove(this._idle);
        this._idle = 0;
        this._docks.destroy();
        this._docks = null;
        this._places.destroy();
        this._places = null;
        this._indicator.destroy();
        this._popup = null;
        this._indicator = null;
        this._model.destroy();
        this._model = null;
        this._theme.destroy();
        this._theme = null;
        this._settings.destroy();
        this._settings = null;
    }

    _dockState() {
        return this._docks?.state ?? 'showing';
    }

    _render() {
        // The shell may tear its panel down at exit before Harbor is disabled.
        if (this._indicator._destroyed)
            return;
        const snapshot = this._model.snapshot;
        this._docks.update(snapshot);
        this._indicator.update(snapshot, this._dockState());
        this._popup.update(snapshot);
    }

    // A dock that shows or hides changes only the mark, once per round.
    _queueRender() {
        if (this._idle || !this._indicator)
            return;
        this._idle = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this._idle = 0;
            if (this._indicator && !this._indicator._destroyed)
                this._indicator.update(this._model.snapshot, this._dockState());
            return GLib.SOURCE_REMOVE;
        });
    }

    _activate(entry) {
        Actions.primary(entry, {onList: () => Actions.cycle(entry, 1)});
    }

    _checkDashToDock() {
        this._popup.setDashToDock(Main.extensionManager.lookup(DASH_TO_DOCK)?.state === ExtensionState.ACTIVE);
    }

    _settingsChanged(settings) {
        this._theme.setColour(settings.colour);
        this._popup.setSettings(settings);
        this._docks.setSettings(settings);
        this._render();
    }
}
