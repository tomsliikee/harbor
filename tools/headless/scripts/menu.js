// The menu: closed settings, open settings, the style list unfolded, a
// colour picked, and the dark scheme.
export default async function ({indicator, extension, shot, sleep, note, moveTo, launch, set, desktop}) {
    await launch('org.gnome.TextEditor.desktop');
    await launch('org.gnome.Ptyxis.desktop');
    await launch('org.gnome.Ptyxis.desktop');
    moveTo(100, 400);
    indicator.menu.open();
    await sleep(800);
    await shot('menu');
    const popup = extension._popup;
    popup._setOverflow(true);
    await sleep(900);
    await shot('menu-settings');
    popup._styleList.setOpen(true);
    await sleep(600);
    popup.actor.vadjustment.value = popup.actor.vadjustment.upper;
    await sleep(300);
    await shot('menu-settings-bottom');
    set('position', 'left');
    set('iconSize', 'large');
    set('style', 'pebbles');
    await sleep(500);
    popup.actor.vadjustment.value = 300;
    await sleep(300);
    await shot('menu-settings-changed');
    desktop.set_string('color-scheme', 'prefer-dark');
    set('colour', 'green');
    await sleep(600);
    await shot('menu-dark-green');
    note(JSON.stringify(extension._settings.current));
}
