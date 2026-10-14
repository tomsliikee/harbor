// Status on the icons and the window list, then the extended bar with its
// status pills and a window list on hover.
export default async function ({extension, shot, sleep, note, moveTo, click, launch, set}) {
    await launch('org.gnome.Ptyxis.desktop');
    await launch('org.gnome.Ptyxis.desktop');
    await launch('org.gnome.Ptyxis.desktop', 3000);
    await launch('org.gnome.TextEditor.desktop');
    moveTo(640, 200);
    const status = extension._status;
    status.report('org.mozilla.firefox.desktop', {progress: 0.64, progressVisible: true});
    status.report('org.gnome.Calendar.desktop', {count: 12, countVisible: true});
    status.report('org.gnome.Loupe.desktop', {count: 140, countVisible: true});
    status.report('org.gnome.Ptyxis.desktop', {urgent: true});
    status.setPlaying('org.gnome.TextEditor.desktop', true);
    for (const w of global.display.list_all_windows())
        w.minimize();
    await sleep(1000);
    await shot('status');
    status.report('org.gnome.Ptyxis.desktop', {urgent: false});
    const dock = extension._docks.all[0];
    const ptyxis = dock.buttonFor('org.gnome.Ptyxis.desktop');
    await click(ptyxis);
    await sleep(800);
    await click(ptyxis);
    await sleep(1000);
    note(`list open=${dock._menu?.isOpen}`);
    await shot('window-list');

    dock._dropMenu();
    moveTo(640, 200);
    set('style', 'extended-bar');
    status.report('org.gnome.Ptyxis.desktop', {urgent: true});
    await sleep(1200);
    const extended = extension._docks.all[0];
    const style = extended._style;
    note(`extended: pills=${[...style._pills.values()].map(pill => pill.label.text).join(' | ')}`);
    await shot('extended-pills');
    const editor = extended.buttonFor('org.gnome.TextEditor.desktop');
    const [x, y] = editor.get_transformed_position();
    moveTo(x + editor.width / 2, y + editor.height / 2);
    await sleep(1200);
    note(`extended: hover list open=${extended._menu?.isOpen}`);
    await shot('extended-hover');
}
