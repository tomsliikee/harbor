// Blur My Shell behind the bars: run with Blur My Shell loaded, e.g.
//   HARBOR_WITH="blur-my-shell@aunetx=$HOME/.local/share/gnome-shell/extensions/blur-my-shell@aunetx"
// One blur per bar with the bar's corners, half see-through, following
// Blur My Shell's window opacity, the pipeline per dock scheme, switching
// off, and Blur My Shell going away and coming back.
const UUID = 'blur-my-shell@aunetx';

export default async function ({extension, shot, sleep, note, moveTo, launch, set, Main}) {
    const dock = () => extension._docks.all[0];
    const style = () => dock()._style;
    const blurs = () => [...style()._blurs.entries()];
    const report = label => {
        const list = blurs().map(([ghost, blur]) =>
            `${Math.round(blur.holder.width)}x${Math.round(blur.holder.height)}@r${ghost.rounded} v=${blur.holder.visible} p=${blur._pipelineId}`);
        note(`${label}: available=${extension._blur.available} blurred=${dock().blurred} alpha=${dock().barAlpha.toFixed(3)} bars=${style()._bars.size} blurs=[${list.join(', ')}] scheme=${dock().theme.scheme}`);
    };
    await launch('org.gnome.TextEditor.desktop');
    moveTo(640, 200);
    await sleep(2500);
    report('start');
    await shot('blur-floating');

    for (const name of ['grouped-block', 'workspace-split', 'pebbles']) {
        set('style', name);
        await sleep(1500);
        report(name);
        await shot(`blur-${name}`);
    }
    set('style', 'floating-bar');
    await sleep(1500);

    const windows = extension._blur._windows;
    set('blurFollow', true);
    await sleep(500);
    report('follow');
    windows?.set_int('opacity', 200);
    await sleep(500);
    report('follow 200');
    set('blurFollow', false);
    await sleep(500);
    report('follow off');

    const dockSettings = extension._blur._windows;
    dockSettings?.set_boolean('pipeline-auto-mode', true);
    set('dockScheme', 'light');
    await sleep(800);
    report('auto mode, light dock');
    await shot('blur-light-dock');
    set('dockScheme', 'dark');
    await sleep(800);
    report('auto mode, dark dock');
    await shot('blur-dark-dock');
    // Liquid glass for applications reaches the dock; a window lies
    // behind the dock so the glass has something to bend.
    dockSettings?.set_string('pipeline-dark', 'pipeline_liquid_glass');
    const win = global.display.list_all_windows().find(w => w.get_window_type() === 0);
    set('whenWindowClose', 'stay');
    win?.move_frame(true, 340, 520);
    await sleep(1000);
    report('liquid glass');
    await shot('blur-liquid-glass');
    set('dockScheme', 'auto');
    set('whenWindowClose', 'make-room');
    win?.move_frame(true, 300, 100);
    dockSettings?.set_boolean('pipeline-auto-mode', false);
    await sleep(500);

    set('blur', false);
    await sleep(500);
    report('blur off');
    set('blur', true);
    await sleep(500);
    report('blur on');

    Main.extensionManager.disableExtension(UUID);
    await sleep(1000);
    report('bms disabled');
    note(`menu rows: blur=${extension._popup._blurRows.visible} seeThrough=${extension._popup._rows.seeThrough.visible}`);
    Main.extensionManager.enableExtension(UUID);
    await sleep(1500);
    report('bms enabled');
    note(`menu rows: blur=${extension._popup._blurRows.visible} seeThrough=${extension._popup._rows.seeThrough.visible}`);

    extension.disable();
    await sleep(300);
    extension.enable();
    await sleep(1500);
    report('harbor again');
}
