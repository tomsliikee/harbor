// The shipped catalog against real app ids.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {matchSymbol} from '../extension/lib/layout.js';
import {test, equal, done} from './harness.js';

const root = GLib.path_get_dirname(GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0]));
const folder = Gio.File.new_for_path(`${root}/extension/symbols`);
const catalog = JSON.parse(new TextDecoder().decode(folder.get_child('catalog.json').load_contents(null)[1]));

test('every symbol has its file', () => equal(
    catalog.filter(entry => !folder.get_child(`harbor-${entry.key}-symbolic.svg`).query_exists(null)).map(entry => entry.key), []));
test('keys are unique', () => equal(new Set(catalog.map(entry => entry.key)).size, catalog.length));

const expected = {
    'org.gnome.Nautilus.desktop': 'folder',
    'org.gnome.Ptyxis.desktop': 'terminal',
    'org.gnome.Calendar.desktop': 'calendar',
    'org.gnome.TextEditor.desktop': 'text',
    'org.gnome.Loupe.desktop': 'image',
    'org.gnome.Settings.desktop': 'settings',
    'org.mozilla.firefox.desktop': 'firefox',
    'firefox.desktop': 'firefox',
    'app.zen_browser.zen.desktop': 'zen',
    'com.anthropic.claude.desktop': 'claude',
    'claude-desktop.desktop': 'claude',
    'libreoffice-writer.desktop': 'libreoffice-writer',
    'org.libreoffice.LibreOffice.calc.desktop': 'libreoffice-calc',
    'libreoffice-startcenter.desktop': 'libreoffice',
    'com.github.GitHubDesktop.desktop': 'github',
    'google-chrome.desktop': 'chrome',
    'com.spotify.Client.desktop': 'spotify',
    'com.discordapp.Discord.desktop': 'discord',
    'org.signal.Signal.desktop': 'signal',
    'md.obsidian.Obsidian.desktop': 'obsidian',
    'com.valvesoftware.Steam.desktop': 'steam',
    'codium.desktop': 'vscodium',
    'org.gnome.Geary.desktop': 'mail',
    'org.mozilla.Thunderbird.desktop': 'thunderbird',
    'org.gnome.Software.desktop': 'software',
    'org.gimp.GIMP.desktop': 'gimp',
};
test('common apps find their symbol', () => {
    const got = Object.fromEntries(Object.keys(expected).map(id => [id, matchSymbol(id, catalog)]));
    equal(got, expected);
});
done('symbols');
