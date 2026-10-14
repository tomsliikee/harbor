// What a dock decides and why, written to the journal while "debug" is set
// in settings.json:
//
//   journalctl -f -o cat /usr/bin/gnome-shell | grep Harbor

export function debug(dock, what, details = {}) {
    if (!dock.settings?.debug)
        return;
    const words = Object.entries(details).map(([key, value]) => `${key}=${format(value)}`).join(' ');
    console.log(`Harbor dock ${dock.monitorIndex}: ${what}${words ? ` ${words}` : ''}`);
}

function format(value) {
    if (value === null || value === undefined)
        return '-';
    if (typeof value === 'number')
        return Number.isInteger(value) ? `${value}` : value.toFixed(2);
    if (typeof value === 'object' && 'width' in value)
        return `${Math.round(value.x)},${Math.round(value.y)} ${Math.round(value.width)}x${Math.round(value.height)}`;
    return `${value}`;
}
