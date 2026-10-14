// Decisions the dock makes by itself, as plain functions of plain data.

const TONES = ['pc', 'sc', 'tc'];

// An app keeps its tone wherever it sits: the tone comes from its id.
export function toneFor(appId) {
    let hash = 0;
    for (const char of appId ?? '')
        hash = (hash * 31 + char.codePointAt(0)) >>> 0;
    return TONES[hash % TONES.length];
}

// Rectangles are {x, y, width, height}.
export function intersects(a, b) {
    return a.x < b.x + b.width && b.x < a.x + a.width &&
        a.y < b.y + b.height && b.y < a.y + a.height;
}

// windows: [{rect, minimized, skipTaskbar, onMonitor}]
export function anyOverlaps(dockRect, windows) {
    return windows.some(w => !w.minimized && !w.skipTaskbar && w.onMonitor && intersects(dockRect, w.rect));
}

// How far each of n items in a row is from the middle, in steps: items
// appear from the middle outwards. [0..n) → 0 for the middle one(s).
export function fromCenter(n) {
    const middle = (n - 1) / 2;
    return Array.from({length: n}, (_, i) => Math.floor(Math.abs(i - middle)));
}

// Which workspaces the split style shows: the used ones and the active
// one, without the empty one GNOME keeps at the end, at most `max`,
// centred on the active one. counts: windows per workspace.
export function shownWorkspaces(counts, active, dynamic, max = 5) {
    let last = counts.length - 1;
    if (dynamic) {
        while (last > 0 && last !== active && counts[last] === 0)
            last--;
    }
    const all = [];
    for (let i = 0; i <= last; i++)
        all.push(i);
    if (all.length <= max)
        return all;
    let start = Math.max(0, active - Math.floor(max / 2));
    start = Math.min(start, all.length - max);
    return all.slice(start, start + max);
}

// "application://org.gnome.Nautilus.desktop" → "org.gnome.Nautilus.desktop"
export function appIdFromUri(uri) {
    const match = /^application:\/\/(.+)$/.exec(uri ?? '');
    if (!match)
        return null;
    return match[1].endsWith('.desktop') ? match[1] : `${match[1]}.desktop`;
}

// MPRIS names its desktop entry without the suffix.
export function appIdFromDesktopEntry(entry) {
    if (!entry)
        return null;
    return entry.endsWith('.desktop') ? entry : `${entry}.desktop`;
}

// The hover magnification of the pebbles: the pebble under the pointer
// grows most, its neighbours less, smoothly by distance in pebble widths.
export function magnification(distance) {
    const d = Math.abs(distance);
    if (d >= 3)
        return 1;
    const steps = [1.45, 1.2, 1.08, 1];
    const lower = Math.floor(d);
    const t = d - lower;
    return steps[lower] + (steps[lower + 1] - steps[lower]) * t;
}

// The pieces of an app id: "org.libreoffice.LibreOffice.writer.desktop"
// → ["org", "libreoffice", "libreoffice", "writer"].
export function idPieces(appId) {
    return appId.toLowerCase().replace(/\.desktop$/, '').split(/[.\-_]/).filter(Boolean);
}

// The key of the first symbol whose match fits the id, or null. A match
// with a dot, dash or underscore must be the end of the id, a plain word one
// of its pieces; the longer kind is tried first, so "libreoffice-writer"
// wins over "libreoffice".
export function matchSymbol(appId, entries) {
    if (!appId)
        return null;
    const id = appId.toLowerCase().replace(/\.desktop$/, '');
    for (const entry of entries) {
        for (const match of entry.match) {
            if (/[.\-_]/.test(match) && (id === match || id.endsWith(`.${match}`)))
                return entry.key;
        }
    }
    const pieces = new Set(idPieces(appId));
    for (const entry of entries) {
        if (entry.match.some(match => !/[.\-_]/.test(match) && pieces.has(match)))
            return entry.key;
    }
    return null;
}

// Whether a mark on these colours ([r, g, b] in 0–255) should be dark: only
// on white or nearly white, by relative luminance.
export const BRIGHT_SURFACE = 0.6;

export function darkOn(colors) {
    if (colors.length === 0)
        return false;
    const linear = c => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const luminance = colors
        .map(([r, g, b]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b))
        .reduce((sum, value) => sum + value, 0) / colors.length;
    return luminance > BRIGHT_SURFACE;
}

// Spreads pills along a line so none overlap: each wants to stand centred
// at `centre` and is `length` long; pills that would touch move apart as a
// group, `gap` apart, the group as close to their wishes as it gets.
// Returns each pill's start, in the order given.
export function spreadApart(pills, gap) {
    const order = pills.map((pill, index) => ({...pill, index})).sort((a, b) => a.centre - b.centre);
    const groups = [];
    for (const pill of order) {
        groups.push(group([pill], gap));
        while (groups.length > 1) {
            const last = groups[groups.length - 1];
            const before = groups[groups.length - 2];
            if (before.start + before.length + gap <= last.start)
                break;
            groups.splice(-2, 2, group([...before.pills, ...last.pills], gap));
        }
    }
    const starts = new Array(pills.length);
    for (const {pills: members, start} of groups) {
        let at = start;
        for (const pill of members) {
            starts[pill.index] = at;
            at += pill.length + gap;
        }
    }
    return starts;
}

// A row of pills side by side, its start the mean of what each pill wishes.
function group(pills, gap) {
    let offset = 0;
    let wish = 0;
    for (const pill of pills) {
        wish += pill.centre - pill.length / 2 - offset;
        offset += pill.length + gap;
    }
    return {pills, length: offset - gap, start: wish / pills.length};
}
