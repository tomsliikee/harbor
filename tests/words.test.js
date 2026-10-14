import * as Words from '../extension/lib/words.js';
import {test, equal, done} from './harness.js';

test('windows', () => equal([0, 1, 3].map(Words.windows), ['0 windows', '1 window', '3 windows']));
test('badge caps at 99+', () => equal([0, 12, 99, 100].map(Words.badge), ['0', '12', '99', '99+']));
test('percent has a space', () => equal(Words.percent(0.64), '64 %'));
test('the most windows win', () => equal(Words.mostSentence([
    {name: 'Files', windows: 2, lastUsed: 5},
    {name: 'Terminal', windows: 3, lastUsed: 1},
]), 'Terminal has the most: 3'));
test('a tie goes to the one used last', () => equal(Words.mostLine([
    {name: 'Files', windows: 2, lastUsed: 1},
    {name: 'Mail', windows: 2, lastUsed: 9},
]), 'Mail, 2'));
test('nothing open', () => equal(Words.mostSentence([{name: 'Files', windows: 0, lastUsed: 1}]), 'Nothing open right now'));
test('across line', () => equal([Words.acrossLine(4, 2), Words.acrossLine(1, 1)],
    ['across 4 apps on 2 workspaces', 'across 1 app on 1 workspace']));
test('peek caption', () => equal(Words.peekCaption(7, 4), 'windows in 4 apps'));
test('workspace lines', () => equal([Words.workspaceLine(0, true), Words.workspaceTip(1, 3)],
    ['Workspace 1 · focused', 'Workspace 2 · 3 windows']));
done('words');
