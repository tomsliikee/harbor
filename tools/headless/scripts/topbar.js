// The top bar: the mark, the look on hover, and the states.
export default async function ({indicator, extension, shot, sleep, note, move, moveTo, launch}) {
    await launch('org.gnome.TextEditor.desktop');
    await launch('org.gnome.Ptyxis.desktop');
    await launch('org.gnome.Ptyxis.desktop');
    note(`windows=${extension._model.snapshot.windowCount}`);
    moveTo(640, 400);
    await sleep(300);
    await shot('topbar-showing');
    move(indicator);
    await sleep(900);
    await shot('topbar-peek');
    moveTo(640, 400);
    await sleep(400);
    extension._dockState = () => 'hidden';
    extension._render();
    await sleep(300);
    await shot('topbar-hidden');
}
