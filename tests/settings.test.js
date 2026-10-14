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

test('the old huge size is large now', () => equal(parse('{"iconSize": "huge"}').iconSize, 'large'));
test('handles fall back per style', () => {
    const settings = parse('{"handles": {"pebbles": false, "status": "no"}}');
    equal([settings.handles.pebbles, settings.handles.status, settings.handles['floating-bar']], [false, true, true]);
});
test('a handles value must name every style', () => equal(
    [isValid('handles', {pebbles: false}), isValid('handles', DEFAULTS.handles), isValid('motionSpeed', 'slow')],
    [false, true, true]));

done('settings');
