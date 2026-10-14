// The symbol picker: every symbol Harbor ships, as tiles in the app's tone,
// with a search and "Automatic" to go back to the symbol found by id.

import Clutter from 'gi://Clutter';
import St from 'gi://St';

import {toneFor} from '../layout.js';
import {rgba} from '../palettes.js';
import {allSymbols, symbolGicon} from '../symbols.js';
import {rowGroup} from '../menu.js';
import {text} from '../text.js';

const COLUMNS = 5;
const TILE = 40;
const GLYPH = 20;
const GRID_HEIGHT = 264;
const TONE_TEXT = {pc: 'onPc', sc: 'onSc', tc: 'onTc'};

function words(entry) {
    return `${entry.key} ${entry.label}`.toLowerCase();
}

// appId: whose symbol; chosen: its key or null; automatic: the key found by
// id, or null. onPick(key) gets null for "Automatic".
export function symbolPicker({appId, name, chosen, automatic, theme, onPick}) {
    const roles = theme.roles;
    const tone = toneFor(appId);
    const root = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, style: 'spacing: 12px;', x_expand: true});

    const head = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, style_class: 'harbor-menu-head'});
    head.add_child(text('title-row', {text: `Symbol for ${name}`}));
    root.add_child(head);

    const search = new St.Entry({
        hint_text: 'Search symbols',
        can_focus: true,
        x_expand: true,
        style: `background-color: ${rgba(roles.high)}; color: ${roles.on}; border: none; border-radius: 20px; padding: 8px 14px;`,
    });
    search.hint_actor?.set_style(`color: ${roles.onVar};`);
    root.add_child(search);

    const automaticLabel = allSymbols().find(entry => entry.key === automatic)?.label;
    root.add_child(rowGroup([{
        title: 'Automatic',
        subtitle: automaticLabel ? `Found by the app: ${automaticLabel}` : 'The app\'s own symbol or icon',
        selected: !chosen,
        onClick: () => onPick(null),
    }]));

    const grid = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, style: 'spacing: 8px;', x_expand: true});
    const scroll = new St.ScrollView({
        child: grid,
        hscrollbar_policy: St.PolicyType.NEVER,
        vscrollbar_policy: St.PolicyType.AUTOMATIC,
        overlay_scrollbars: true,
        style: `height: ${GRID_HEIGHT}px;`,
        x_expand: true,
        x_align: Clutter.ActorAlign.CENTER,
    });
    root.add_child(scroll);
    const hovered = text('label', {styleClass: 'harbor-muted', text: ' '});
    root.add_child(hovered);

    const tiles = allSymbols().map(entry => {
        const selected = entry.key === chosen;
        const button = new St.Button({
            can_focus: true,
            reactive: true,
            track_hover: true,
            accessible_name: entry.label,
            width: TILE,
            height: TILE,
            style: selected
                ? `background-color: ${roles.primary}; color: ${roles.onPrimary}; border-radius: 14px;`
                : `background-color: ${rgba(roles[tone])}; color: ${roles[TONE_TEXT[tone]]}; border-radius: 12px;`,
            child: new St.Icon({gicon: symbolGicon(entry.key), icon_size: GLYPH}),
        });
        button.connect('clicked', () => onPick(entry.key));
        button.connect('notify::hover', () => {
            hovered.text = button.hover ? entry.label : ' ';
        });
        return {entry, button, words: words(entry)};
    });

    // Lays the tiles that match the search out in rows of COLUMNS.
    const flow = () => {
        const query = search.get_text().trim().toLowerCase();
        for (const row of grid.get_children()) {
            for (const child of row.get_children())
                row.remove_child(child);
            row.destroy();
        }
        let row = null;
        tiles.filter(tile => !query || tile.words.includes(query)).forEach((tile, i) => {
            if (i % COLUMNS === 0) {
                row = new St.BoxLayout({style: 'spacing: 8px;'});
                grid.add_child(row);
            }
            row.add_child(tile.button);
        });
        if (!row)
            grid.add_child(text('label', {styleClass: 'harbor-muted', text: 'No symbol by that name.'}));
    };
    search.clutter_text.connect('text-changed', flow);
    root.connect('destroy', () => {
        for (const tile of tiles) {
            if (!tile.button.get_parent())
                tile.button.destroy();
        }
    });
    flow();
    root.search = search;
    return root;
}
