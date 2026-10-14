// The picture at the top of the README: the dock and the menu, no windows.
export default async function ({extension, indicator, shot, sleep, moveTo, launch}) {
    await launch('org.gnome.Ptyxis.desktop');
    await launch('org.gnome.Ptyxis.desktop');
    await launch('org.gnome.TextEditor.desktop', 3000);
    for (const w of global.display.list_all_windows())
        w.minimize();
    extension._status.report('org.gnome.Calendar.desktop', {count: 3, countVisible: true});
    moveTo(640, 300);
    indicator.menu.open();
    await sleep(1200);
    await shot('hero');
}
