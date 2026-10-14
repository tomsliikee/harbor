// The dock styles by their setting id.

import {ExpressiveRailStyle} from './expressive-rail.js';
import {ExtendedBarStyle} from './extended-bar.js';
import {FloatingBarStyle} from './floating-bar.js';
import {GroupedBlockStyle} from './grouped-block.js';
import {LoudTileStyle} from './loud-tile.js';
import {MonoContainerStyle} from './mono-container.js';
import {PebblesStyle} from './pebbles.js';
import {QuietHandleStyle} from './quiet-handle.js';
import {ShapeStageStyle} from './shape-stage.js';
import {WorkspaceSplitStyle} from './workspace-split.js';

const STYLES = {
    'floating-bar': FloatingBarStyle,
    'extended-bar': ExtendedBarStyle,
    'shape-stage': ShapeStageStyle,
    'grouped-block': GroupedBlockStyle,
    'expressive-rail': ExpressiveRailStyle,
    'quiet-handle': QuietHandleStyle,
    'loud-tile': LoudTileStyle,
    'mono-container': MonoContainerStyle,
    'pebbles': PebblesStyle,
    'workspace-split': WorkspaceSplitStyle,
};

export function makeStyle(id, host) {
    const Style = STYLES[id] ?? FloatingBarStyle;
    return new Style(host);
}
