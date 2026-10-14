// Symbols: the right-click menu's picker, a search, a choice that is kept,
// "Automatic" again, and symbolic icons off.
import Clutter from 'gi://Clutter';
import St from 'gi://St';
export default async function ({extension, indicator, shot, sleep, note, moveTo, click, set}) {
    const dock = () => extension._docks.all[0];
    const files = 'org.gnome.Nautilus.desktop';
    const find = (actor, test) => {
        if (test(actor))
            return actor;
        for (const child of actor.get_children()) {
            const found = find(child, test);
            if (found)
                return found;
        }
        return null;
    };
    const glyph = () => dock()._style.buttonFor(files)?.glyph?.icon;
    const glyphName = () => glyph()?.gicon?.get_file?.()?.get_basename() ?? glyph()?.constructor.name;
    note(`automatic: ${glyphName()}`);
    moveTo(640, 300);
    await click(dock()._style.buttonFor(files), Clutter.BUTTON_SECONDARY);
    await sleep(700);
    const menu = dock()._menu;
    const row = find(menu.menu.box, a => a instanceof St.Button && a.accessible_name === 'Change symbol');
    note(`change row=${Boolean(row)}`);
    await click(row);
    await sleep(700);
    await shot('symbol-picker');
    const entry = find(menu.menu.box, a => a instanceof St.Entry);
    entry.set_text('zen');
    await sleep(400);
    await shot('symbol-picker-search');
    const zen = find(menu.menu.box, a => a instanceof St.Button && a.accessible_name === 'Zen' && a.mapped);
    note(`search shows zen=${Boolean(zen)}`);
    await click(zen);
    await sleep(1200);
    note(`kept: ${JSON.stringify(extension._settings.current.symbols)} menu open=${menu.isOpen}`);
    note(`now: ${glyphName()}`);
    indicator.menu.open();
    await sleep(900);
    await shot('symbol-topbar');
    indicator.menu.close();
    extension._setSymbol(files, null);
    await sleep(1200);
    note(`automatic again: ${JSON.stringify(extension._settings.current.symbols)} ${glyphName()}`);
    set('symbolicIcons', false);
    await sleep(1200);
    note(`symbolic off: ${glyphName()}`);
    await shot('symbol-off');
    set('symbolicIcons', true);
    await sleep(800);
    note('done');
}
