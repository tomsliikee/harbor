import {CIRCLE, ladder, radiusAt, outline, between} from '../extension/lib/shapes.js';
import {test, equal, done} from './harness.js';

const round = points => points.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);

test('ladder by windows', () => equal([0, 1, 2, 3, 4, 9, -1].map(ladder),
    [CIRCLE, {n: 4, a: 0.14}, {n: 4, a: 0.32}, {n: 8, a: 0.20}, {n: 10, a: 0.30}, {n: 10, a: 0.30}, CIRCLE]));
test('a circle keeps its radius', () => equal(radiusAt(CIRCLE, 1.3), 1));
test('a lobe dips by a at its deepest', () => equal(Math.round(radiusAt({n: 4, a: 0.32}, Math.PI / 4) * 100), 68));
test('the outline starts at the top', () => equal(round(outline(CIRCLE, 10, 10, 10, 4))[0], [10, 0]));
test('a morph ends on its target', () => equal(
    round(between(CIRCLE, {n: 8, a: 0.2}, 0, 0, 5, 1, 16)),
    round(outline({n: 8, a: 0.2}, 0, 0, 5, 16))));
done('shapes');
