// What a click on an app does. There is no setting for it: the dock looks
// at the app and picks the one useful thing.

import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {windowsOf} from './model.js';

// entry: a model entry. onList(entry) shows the window list.
export function primary(entry, {onList}) {
    const {app} = entry;
    const windows = windowsOf(app);
    if (app.state === Shell.AppState.STOPPED || windows.length === 0) {
        app.activate();
        return 'launched';
    }
    if (!entry.focused) {
        // The shell keeps an app's windows in the order they were used.
        Main.activateWindow(windows[0]);
        return 'focused';
    }
    if (windows.length === 1) {
        windows[0].minimize();
        return 'minimised';
    }
    onList(entry);
    return 'listed';
}

export function newWindow(entry) {
    entry.app.open_new_window(-1);
}

// Each turn of the wheel brings the next of the app's windows forward.
export function cycle(entry, direction) {
    const windows = windowsOf(entry.app).sort((a, b) => a.get_stable_sequence() - b.get_stable_sequence());
    if (windows.length === 0)
        return;
    const focus = global.display.focus_window;
    const current = windows.indexOf(focus);
    const next = current < 0 ? 0 : (current + direction + windows.length) % windows.length;
    Main.activateWindow(windows[next]);
}
