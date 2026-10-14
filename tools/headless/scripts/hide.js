export default async function ({extension, shot, sleep, note, moveTo, launch}) {
    await launch('org.gnome.Ptyxis.desktop');
    moveTo(640, 200);
    const dock = extension._docks.all[0];
    const c = dock._container;
    const say = step => note(`${step}: state=${dock.state} shown=${dock.shown} visible=${c.visible} op=${c.opacity} ty=${c.translation_y} hover=${c.hover} hov=${dock._hovering} rev=${dock._revealed} pos=${c.get_position()} size=${c.width}x${c.height}`);
    say('start');
    const win = global.display.list_all_windows().find(w => w.get_window_type() === 0);
    win.maximize();
    await sleep(1500);
    say('maximised');
    await shot('hide');
}
