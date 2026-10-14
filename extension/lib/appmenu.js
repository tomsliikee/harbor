// The right-click menu of an app: its own actions, a new window, pinning,
// and quitting, laid out like the rest of Harbor.

import Shell from 'gi://Shell';

import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';

import {symbolPicker} from './controls/symbolpicker.js';
import {DockMenu, column, rowGroup} from './menu.js';
import {symbolKeyFor} from './symbols.js';
import {text} from './text.js';
import * as Words from './words.js';

// Pinning here changes the dock in front of the person, so the shell's
// "pinned" notification would only repeat it; the quiet calls are used.
export function pin(appId, position = -1) {
    const favorites = AppFavorites.getAppFavorites();
    if (!favorites.isFavorite(appId))
        favorites._addFavorite(appId, position);
}

export function unpin(appId) {
    AppFavorites.getAppFavorites()._removeFavorite(appId);
}

export function move(appId, position) {
    AppFavorites.getAppFavorites().moveFavoriteToPos(appId, position);
}

// settings: the current settings; onSymbol(appId, key) keeps a chosen
// symbol (null: automatic).
export function appMenu(button, side, theme, {settings, onSymbol} = {}) {
    const entry = button.item;
    const app = entry.app;
    const menu = new DockMenu(button, side, theme);
    const close = then => (...args) => {
        menu.close();
        then(...args);
    };

    const head = column('harbor-menu-head');
    head.add_child(text('title-row', {text: entry.name}));
    if (entry.windows.length > 0)
        head.add_child(text('label', {styleClass: 'harbor-muted', text: Words.windows(entry.windows.length)}));
    menu.content.add_child(head);

    const rows = [];
    const appInfo = app.get_app_info();
    const actions = appInfo?.list_actions() ?? [];
    for (const action of actions) {
        rows.push({
            title: appInfo.get_action_name(action),
            onClick: close(() => app.launch_action(action, global.get_current_time(), -1)),
        });
    }
    if (app.can_open_new_window() && !actions.includes('new-window'))
        rows.push({title: 'New window', onClick: close(() => app.open_new_window(-1))});
    if (!app.is_window_backed()) {
        const id = app.get_id();
        rows.push(entry.pinned
            ? {title: 'Unpin from the dock', onClick: close(() => unpin(id))}
            : {title: 'Pin to the dock', onClick: close(() => pin(id))});
    }
    if (app.state === Shell.AppState.RUNNING)
        rows.push({title: entry.windows.length > 1 ? `Quit all ${entry.windows.length} windows` : 'Quit', onClick: close(() => app.request_quit())});
    menu.content.add_child(rowGroup(rows));
    if (settings?.symbolicIcons && onSymbol) {
        const id = app.get_id();
        menu.content.add_child(rowGroup([{
            title: 'Change symbol',
            onClick: () => showPicker(menu, theme, {
                appId: id,
                name: entry.name,
                chosen: settings.symbols[id] ?? null,
                automatic: symbolKeyFor(id),
                onPick: close(key => onSymbol(id, key)),
            }),
        }]));
    }
    return menu;
}

// The menu turns into the picker in place.
function showPicker(menu, theme, options) {
    menu.content.destroy_all_children();
    const picker = symbolPicker({theme, ...options});
    menu.content.add_child(picker);
    picker.search.grab_key_focus();
}

export function placeMenu(button, side, theme, {onOpen, onEject}) {
    const place = button.item;
    const menu = new DockMenu(button, side, theme);
    const head = column('harbor-menu-head');
    head.add_child(text('title-row', {text: place.name}));
    menu.content.add_child(head);
    const rows = [{title: 'Open', onClick: () => {
        menu.close();
        onOpen(place);
    }}];
    if (place.mount) {
        rows.push({title: place.mount.can_eject() ? 'Eject' : 'Unmount', onClick: () => {
            menu.close();
            onEject(place);
        }});
    }
    menu.content.add_child(rowGroup(rows));
    return menu;
}
