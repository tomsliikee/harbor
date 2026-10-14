import * as Layout from '../extension/lib/layout.js';
import {test, equal, done} from './harness.js';

test('a tone is stable per app', () => equal(Layout.toneFor('org.gnome.Nautilus.desktop'), Layout.toneFor('org.gnome.Nautilus.desktop')));
test('tones spread', () => equal(new Set(['a.desktop', 'b.desktop', 'c.desktop', 'firefox.desktop', 'org.gnome.Ptyxis.desktop']
    .map(Layout.toneFor)).size > 1, true));
const dock = {x: 400, y: 820, width: 480, height: 80};
test('an overlapping window counts', () => equal(Layout.anyOverlaps(dock, [
    {rect: {x: 0, y: 0, width: 1280, height: 850}, minimized: false, skipTaskbar: false, onMonitor: true}]), true));
test('minimised, skipped and other monitors do not', () => equal(Layout.anyOverlaps(dock, [
    {rect: {x: 0, y: 0, width: 1280, height: 900}, minimized: true, skipTaskbar: false, onMonitor: true},
    {rect: {x: 0, y: 0, width: 1280, height: 900}, minimized: false, skipTaskbar: true, onMonitor: true},
    {rect: {x: 0, y: 0, width: 1280, height: 900}, minimized: false, skipTaskbar: false, onMonitor: false}]), false));
test('touching edges do not overlap', () => equal(Layout.intersects(dock, {x: 0, y: 0, width: 1280, height: 820}), false));
test('the empty last workspace hides', () => equal(Layout.shownWorkspaces([3, 2, 0, 0], 0, true), [0, 1]));
test('unless it is the active one', () => equal(Layout.shownWorkspaces([3, 0, 0], 2, true), [0, 1, 2]));
test('static workspaces all show', () => equal(Layout.shownWorkspaces([1, 0, 0, 0], 0, false), [0, 1, 2, 3]));
test('at most five, around the active one', () => equal(Layout.shownWorkspaces([1, 1, 1, 1, 1, 1, 1, 1], 6, true), [3, 4, 5, 6, 7]));
test('unity uri', () => equal([Layout.appIdFromUri('application://firefox.desktop'), Layout.appIdFromUri('file:///x')],
    ['firefox.desktop', null]));
test('mpris entry', () => equal(Layout.appIdFromDesktopEntry('spotify'), 'spotify.desktop'));
test('magnification', () => equal([0, 1, 2, 3, 0.5].map(d => Math.round(Layout.magnification(d) * 1000) / 1000),
    [1.45, 1.2, 1.08, 1, 1.325]));
test('from the middle outwards', () => equal([Layout.fromCenter(5), Layout.fromCenter(4), Layout.fromCenter(1)],
    [[2, 1, 0, 1, 2], [1, 0, 0, 1], [0]]));
const symbols = [
    {key: 'lo-writer', match: ['libreoffice-writer', 'libreoffice.writer']},
    {key: 'lo', match: ['libreoffice']},
    {key: 'zen', match: ['zen']},
    {key: 'folder', match: ['nautilus']},
];
test('a symbol by id', () => equal(['org.gnome.Nautilus.desktop', 'app.zen_browser.zen.desktop', 'gedit.desktop', '']
    .map(id => Layout.matchSymbol(id, symbols)), ['folder', 'zen', null, null]));
test('the longer match wins', () => equal(['libreoffice-writer.desktop', 'org.libreoffice.LibreOffice.writer.desktop',
    'libreoffice-calc.desktop'].map(id => Layout.matchSymbol(id, symbols)), ['lo-writer', 'lo-writer', 'lo']));
test('a word matches a whole piece only', () => equal(Layout.matchSymbol('org.zenith.App.desktop', symbols), null));
done('layout');
