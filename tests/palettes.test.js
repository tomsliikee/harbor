import {COLOURS, palettes, mix, rgba} from '../extension/lib/palettes.js';
import {test, equal, done} from './harness.js';

test('five colours in two schemes with the same roles', () => {
    const roles = Object.keys(palettes.blue.light).sort().join();
    equal(COLOURS.every(c => ['light', 'dark'].every(s => Object.keys(palettes[c][s]).sort().join() === roles)), true);
});
test('mix ends', () => equal([mix('#000000', '#ffffff', 0), mix('#000000', '#ffffff', 1), mix('#000000', '#ffffff', 0.5)],
    ['#000000', '#ffffff', '#808080']));
test('rgba', () => equal(rgba('#0045fc', 0.5), 'rgba(0,69,252,0.5)'));
done('palettes');
