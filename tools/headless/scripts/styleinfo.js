// The style list's words: the sentence under the chosen style, and the
// card beside the menu while the pointer rests on a style.
export default async function ({indicator, extension, shot, sleep, note, moveTo, move, launch, set, desktop}) {
    await launch('org.gnome.TextEditor.desktop');
    moveTo(100, 400);
    indicator.menu.open();
    await sleep(800);
    const popup = extension._popup;
    popup._setOverflow(true);
    await sleep(900);
    const list = popup._styleList;
    const rows = Object.fromEntries(list._rows.map(entry => [entry.style, entry]));
    popup.actor.vadjustment.value = 0;
    list.get_transformed_position();
    await sleep(200);
    // Scroll the list into view.
    const [, listY] = list.get_transformed_position();
    popup.actor.vadjustment.value = Math.max(0, listY - 200);
    await sleep(400);
    await shot('styleinfo-chosen');
    const r = rows['floating-bar'];
    note(`row ${r.row.width}x${r.row.height} pref=${r.row.get_preferred_height(r.row.width)} short ${r.short.width}x${r.short.height} pref=${r.short.get_preferred_height(r.short.width)} box pref=${r.row.get_child().get_preferred_height(r.row.get_child().width)}`);
    for (let a = r.row; a && a !== popup.actor; a = a.get_parent())
        note(`  ${a.constructor.name} ${a.style_class ?? ''} h=${a.height} pref=${a.get_preferred_height(a.width)}`);
    note(`chosen short visible=${rows['floating-bar'].short.visible} other=${rows['grouped-block'].short.visible}`);
    move(rows['grouped-block'].row);
    await sleep(200);
    note(`after 200 ms card visible=${list._card.actor.visible}`);
    await sleep(500);
    await shot('styleinfo-hover-grouped');
    note(`card visible=${list._card.actor.visible} at ${list._card.actor.x},${list._card.actor.y} ${list._card.actor.width}x${list._card.actor.height}`);
    move(rows['expressive-rail'].row);
    await sleep(400);
    await shot('styleinfo-hover-rail');
    set('style', 'pebbles');
    await sleep(500);
    note(`pebbles short visible=${rows.pebbles.short.visible}, floating=${rows['floating-bar'].short.visible}`);
    move(rows.pebbles.row);
    await sleep(600);
    await shot('styleinfo-pebbles');
    moveTo(100, 400);
    await sleep(500);
    note(`pointer away: card visible=${list._card.actor.visible}`);
    move(rows['shape-stage'].row);
    await sleep(700);
    desktop.set_string('color-scheme', 'prefer-dark');
    await sleep(600);
    await shot('styleinfo-dark');
    indicator.menu.close();
    await sleep(500);
    note(`menu closed: card visible=${list._card.actor.visible}`);
    note('done');
}
