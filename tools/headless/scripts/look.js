// Look switches: ink focus, a light dock on a dark desktop, the long
// handle. Meant for HARBOR_SCHEME=dark.
export default async function ({extension, shot, sleep, note, moveTo, launch, set}) {
    const dock = () => extension._docks.all[0];
    const style = () => dock()._style;
    await launch('org.gnome.TextEditor.desktop');
    moveTo(640, 200);
    await sleep(1500);
    const focus = () => style().glider?._color;
    note(`dark: scheme=${dock().theme.scheme} bar=${style().barColor} focus=${focus()}`);
    await shot('look-dark');
    set('inkFocus', false);
    await sleep(800);
    note(`ink off: focus=${focus()} primary=${dock().theme.roles.primary}`);
    set('inkFocus', true);
    set('lightDock', true);
    await sleep(1200);
    note(`light dock: scheme=${dock().theme.scheme} bar=${style().barColor} focus=${focus()} desktop=${extension._theme.scheme}`);
    await shot('look-light-dock');
    set('lightDock', false);
    await sleep(800);
    note(`back: scheme=${dock().theme.scheme}`);

    const win = global.display.list_all_windows().find(w => w.get_window_type() === 0);
    win.maximize();
    set('whenWindowClose', 'hide');
    await sleep(1800);
    const handle = dock()._handle;
    note(`handle: visible=${handle.visible} size=${handle.width}x${handle.height}`);
    set('longHandle', true);
    await sleep(800);
    note(`long handle: visible=${handle.visible} size=${handle.width}x${handle.height}`);
    await shot('look-long-handle');
}
