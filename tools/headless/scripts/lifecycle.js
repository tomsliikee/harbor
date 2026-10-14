// Two monitors, the overview, and switching off and on through every style.
const STYLES = ['floating-bar', 'extended-bar', 'shape-stage', 'grouped-block', 'expressive-rail', 'quiet-handle',
    'loud-tile', 'mono-container', 'pebbles', 'workspace-split'];
export default async function ({extension, shot, sleep, note, moveTo, launch, set, Main}) {
    await launch('org.gnome.Ptyxis.desktop');
    moveTo(600, 300);
    note(`monitors=${Main.layoutManager.monitors.length} docks=${extension._docks.all.length}`);
    set('everyMonitor', true);
    await sleep(800);
    note(`every monitor: docks=${extension._docks.all.map(d => d.monitorIndex).join(',')}`);
    await shot('two-monitors');
    Main.overview.show();
    await sleep(1500);
    note(`overview: dash visible=${Main.overview.dash.visible} harbor shown=${extension._docks.all[0].shown}`);
    await shot('overview');
    Main.overview.hide();
    await sleep(1200);
    const before = global.stage.get_n_children();
    for (const style of STYLES) {
        set('style', style);
        await sleep(400);
        extension.disable();
        await sleep(100);
        extension.enable();
        await sleep(300);
    }
    extension.disable();
    await sleep(300);
    note(`after disable: dash visible=${Main.overview.dash.visible} chrome left=${Main.layoutManager._trackedActors.filter(a => a.actor.has_style_class_name?.('harbor-dock') || a.actor.has_style_class_name?.('harbor-handle')).length} panel item=${Boolean(Main.panel.statusArea['harbor@thomashaiden'])}`);
    extension.enable();
    await sleep(500);
    note(`stage children before=${before} after=${global.stage.get_n_children()}`);
}
