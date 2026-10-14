// The window list: instead of pictures of windows, their titles, where
// they are, and a way to close each.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {DockMenu, column, rowGroup} from './menu.js';
import {windowsOf} from './model.js';
import {text} from './text.js';
import * as Words from './words.js';

const NOTE = 'Middle-click the icon for a new window.';

export function windowList(button, side, theme, {hover = false} = {}) {
    const entry = button.item;
    const menu = new DockMenu(button, side, theme, {styleClass: 'harbor-menu harbor-window-list', grab: !hover});
    const windows = windowsOf(entry.app);
    const focus = global.display.focus_window;

    const head = new St.BoxLayout({style_class: 'harbor-menu-head harbor-list-head'});
    head.add_child(text('title-row', {text: entry.name}));
    const count = text('label', {styleClass: 'harbor-muted', text: Words.windows(windows.length)});
    count.y_align = Clutter.ActorAlign.CENTER;
    head.add_child(count);
    menu.content.add_child(head);

    const rows = windows.map(window => {
        const focused = window === focus;
        const close = new St.Button({
            style_class: 'harbor-close',
            child: new St.Icon({icon_name: 'window-close-symbolic', icon_size: 16}),
            can_focus: true,
            y_align: Clutter.ActorAlign.CENTER,
            accessible_name: 'Close',
        });
        close.connect('clicked', () => {
            window.delete(global.get_current_time());
            menu.close();
        });
        const workspace = window.get_workspace()?.index() ?? 0;
        return {
            title: window.get_title() || entry.name,
            subtitle: Words.workspaceLine(workspace, focused),
            selected: focused,
            trailing: close,
            onClick: () => {
                menu.close();
                Main.activateWindow(window);
            },
        };
    });
    menu.content.add_child(rowGroup(rows));
    const note = column('harbor-list-note');
    note.add_child(text('aside', {styleClass: 'harbor-muted', wrap: true, text: NOTE}));
    menu.content.add_child(note);
    return menu;
}
