// The dock with the floating bar: resting, a tooltip, and making room.
export default async function ({extension, shot, sleep, note, moveTo, move, launch, set, Main}) {
    await launch('org.gnome.TextEditor.desktop');
    await launch('org.gnome.Ptyxis.desktop');
    await launch('org.gnome.Ptyxis.desktop');
    moveTo(640, 200);
    for (const w of global.display.list_all_windows())
        w.minimize();
    await sleep(800);
    note(`state=${extension._docks.state}`);
    await shot('dock-floating');
    const dock = extension._docks.all[0];
    const button = dock._style.buttonFor('org.mozilla.firefox.desktop');
    move(button);
    await sleep(900);
    await shot('dock-tooltip');
    moveTo(640, 200);
    const win = global.display.list_all_windows().find(w => w.get_wm_class()?.includes('Ptyxis') || w.title);
    win.unminimize();
    win.maximize();
    await sleep(1200);
    const c = dock._container;
    note(`after maximise state=${extension._docks.state} shown=${dock.shown} visible=${c.visible} op=${c.opacity} ty=${c.translation_y} hov=${dock._hovering} rev=${dock._revealed}`);
    await shot('dock-making-room');
    moveTo(640, 799);
    await sleep(100);
    dock.reveal();
    await sleep(600);
    note(`revealed state=${extension._docks.state}`);
    await shot('dock-revealed');
    for (const side of ['left', 'right']) {
        set('position', side);
        await sleep(800);
        moveTo(640, 200);
        dock.reveal();
        await sleep(600);
        await shot(`dock-${side}`);
    }
    set('position', 'bottom');
    set('whenWindowClose', 'stay');
    await sleep(900);
    note(`stay state=${extension._docks.state}`);
    await shot('dock-stay');
}
