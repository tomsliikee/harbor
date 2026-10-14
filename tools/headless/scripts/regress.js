// The cases the review found: fullscreen under Stay, the rail never making
// room, a hover list replaced by a click list, and the loud tile's list.
import Clutter from 'gi://Clutter';
export default async function ({extension, sleep, note, moveTo, move, click, launch, set}) {
    await launch('org.gnome.Ptyxis.desktop');
    await launch('org.gnome.Ptyxis.desktop', 3000);
    const dock = () => extension._docks.all[0];
    const c = () => dock()._container;
    set('whenWindowClose', 'stay');
    await sleep(800);
    const win = global.display.focus_window;
    win.make_fullscreen();
    await sleep(1200);
    dock()._evaluate();
    await sleep(300);
    log('HARBOR-STEP'); note(`stay + fullscreen: container visible=${c().visible} (want false)`);
    win.unmake_fullscreen();
    await sleep(1200);
    log('HARBOR-STEP'); note(`stay after fullscreen: visible=${c().visible} (want true)`);

    set('whenWindowClose', 'make-room');
    set('style', 'expressive-rail');
    await sleep(900);
    win.maximize();
    await sleep(1200);
    log('HARBOR-STEP'); note(`rail + make-room + maximised: shown=${dock().shown} state=${dock().state} (want true/showing)`);
    win.unmaximize();
    await sleep(600);

    set('style', 'window-list');
    for (const w of global.display.list_all_windows())
        w.minimize();
    await sleep(900);
    const ptyxis = dock().buttonFor('org.gnome.Ptyxis.desktop');
    move(ptyxis);
    await sleep(900);
    log('HARBOR-STEP'); note(`hover list open=${dock()._menu?.isOpen}`);
    await click(ptyxis);
    await sleep(800);
    await click(ptyxis);
    await sleep(800);
    log('HARBOR-STEP'); note(`after clicks: menu open=${dock()._menu?.isOpen}`);
    dock()._dropMenu();
    moveTo(640, 200);
    await sleep(600);

    set('style', 'loud-tile');
    await sleep(900);
    const style = dock()._style;
    log('HARBOR-STEP'); note(`loud tile focused=${style._focusedButton?.item.name}`);
    log('HARBOR-STEP loudclick'); await click(style.loud);
    await sleep(900);
    log('HARBOR-STEP'); note(`loud tile click: menu open=${dock()._menu?.isOpen} source is tile=${dock()._menu?.source === style.loud}`);
    dock()._dropMenu();

    // A count from a sender that goes away disappears with it.
    const status = extension._status;
    status._update(':1.999', new (imports.gi.GLib.Variant)('(sa{sv})', ['application://org.gnome.Calendar.desktop', {count: new imports.gi.GLib.Variant('x', 5), 'count-visible': new imports.gi.GLib.Variant('b', true)}]));
    log('HARBOR-STEP'); note(`count before=${status.entryFor({id: 'org.gnome.Calendar.desktop'})?.count}`);
    status._dropSender(':1.999');
    log('HARBOR-STEP'); note(`count after sender left=${status.entryFor({id: 'org.gnome.Calendar.desktop'})?.count ?? 'none'}`);
    log('HARBOR-STEP disable'); extension.disable();
    await sleep(300);
    extension.enable();
    await sleep(300);
    note('done');
}
