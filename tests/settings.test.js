import {DEFAULTS, normalize, parse, isValid} from '../extension/lib/settings.js';
import {test, equal, done} from './harness.js';

test('nothing gives the defaults', () => equal(normalize(null), DEFAULTS));
test('broken JSON gives the defaults', () => equal(parse('{"style": '), DEFAULTS));
test('an array is no settings object', () => equal(normalize([1, 2]), DEFAULTS));
test('each key falls back on its own', () => {
    const settings = parse('{"style": "pebbles", "position": "top", "trashAndDrives": "yes", "everyMonitor": true}');
    equal([settings.style, settings.position, settings.trashAndDrives, settings.everyMonitor],
        ['pebbles', 'bottom', true, true]);
});
test('unknown keys are dropped', () => equal('extra' in parse('{"extra": 1}'), false));
test('validity per key', () => equal(
    [isValid('colour', 'pink'), isValid('colour', 'red'), isValid('countsOnIcons', false), isValid('nope', true)],
    [true, false, true, false]));

test('four sizes', () => equal(['small', 'huge', 'giant'].map(size => parse(`{"iconSize": "${size}"}`).iconSize), ['small', 'huge', 'medium']));
test('symbols keep only words per app', () => equal(
    parse('{"symbols": {"firefox.desktop": "zen", "x.desktop": 3, "y.desktop": ""}}').symbols, {'firefox.desktop': 'zen'}));
test('symbols must be an object', () => equal([parse('{"symbols": ["zen"]}').symbols, isValid('symbols', {'a.desktop': 'zen'}),
    isValid('symbols', {'a.desktop': 1}), isValid('symbolicIcons', false)], [{}, true, false, true]));
test('look switches', () => equal(
    [DEFAULTS.inkFocus, DEFAULTS.lightDock, DEFAULTS.longHandle, parse('{"lightDock": true, "inkFocus": 1}').lightDock,
        parse('{"inkFocus": 1}').inkFocus, isValid('longHandle', true), isValid('longHandle', 'yes')],
    [true, false, false, true, true, true, false]));
test('handles fall back per style', () => {
    const settings = parse('{"handles": {"pebbles": false, "loud-tile": "no"}}');
    equal([settings.handles.pebbles, settings.handles['loud-tile'], settings.handles['floating-bar']], [false, true, true]);
});
test('status and window list became the extended bar', () => equal(
    [parse('{"style": "status"}').style, parse('{"style": "window-list"}').style,
        parse('{"handles": {"window-list": false}}').handles['extended-bar'], 'status' in DEFAULTS.handles],
    ['extended-bar', 'extended-bar', false, false]));
test('a handles value must name every style', () => equal(
    [isValid('handles', {pebbles: false}), isValid('handles', DEFAULTS.handles), isValid('motionSpeed', 'slow')],
    [false, true, true]));

done('settings');
