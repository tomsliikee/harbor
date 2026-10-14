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

done('settings');
