import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {HarborIndicator} from './lib/indicator.js';
import {Model} from './lib/model.js';
import {SettingsStore} from './lib/settings.js';
import {ThemeController} from './lib/theme.js';

// Harbor is a whole dock on its own: it needs nothing from Dash to Dock or
// any other extension, only GNOME Shell.
export default class HarborExtension extends Extension {
    enable() {
        this._settings = new SettingsStore(settings => this._settingsChanged(settings));
        this._theme = new ThemeController(this._settings.current.colour);
        this._model = new Model();

        this._indicator = new HarborIndicator(this._theme);
        // Directly left of the system menu.
        const rightBox = Main.panel._rightBox;
        const systemMenu = Main.panel.statusArea.quickSettings?.container;
        const position = Math.max(0, rightBox.get_children().indexOf(systemMenu));
        Main.panel.addToStatusArea(this.uuid, this._indicator, position, 'right');

        this._model.connect('changed', () => this._render());
        this._render();
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
        this._model.destroy();
        this._model = null;
        this._theme.destroy();
        this._theme = null;
        this._settings.destroy();
        this._settings = null;
    }

    _dockState() {
        return 'showing';
    }

    _render() {
        this._indicator.update(this._model.snapshot, this._dockState());
    }

    _settingsChanged(settings) {
        this._theme.setColour(settings.colour);
        this._render();
    }
}
