// How the dock behaves since Harbor 2: making room for the app in front
// only, coming back from the edge without a push, the handle per style,
// a new look showing itself, see-through, and windows minimising into
// their icon.
import Clutter from 'gi://Clutter';

export default async function ({extension, shot, sleep, note, moveTo, move, click, launch, set}) {
    const dock = () => extension._docks.all[0];
    const say = step => {
        const d = dock();
        note(`${step}: state=${d.state} shown=${d.shown} visible=${d._container.visible} edge=${d._edge.visible} handle=${d._handle.visible}`);
    };
    await launch('org.gnome.TextEditor.desktop');
    await launch('org.gnome.Ptyxis.desktop', 3000);
    moveTo(640, 200);
    const editor = global.display.list_all_windows().find(w => w.get_wm_class()?.includes('TextEditor'));
    const terminal = global.display.list_all_windows().find(w => w.get_wm_class()?.includes('Ptyxis'));

    // Make room: a maximised window behind does not count, the one in front does.
    editor.maximize();
    terminal.activate(global.get_current_time());
    terminal.unmaximize();
    terminal.move_resize_frame(false, 100, 100, 500, 300);
    await sleep(1200);
    say('editor maximised behind a small terminal (want showing)');
    editor.activate(global.get_current_time());
    await sleep(1200);
    say('editor maximised in front (want making-room)');
    await shot('behave-making-room');

    // The edge: resting the pointer on the last row under the dock.
    moveTo(640, 799);
    await sleep(80);
    say('edge touched, 80 ms (want still away)');
    await sleep(400);
    say('edge rested on (want showing)');
    moveTo(640, 200);
    await sleep(2800);
    say('pointer gone again (want making-room)');

    // The handle, on by default for every style; hovering brings the dock.
    await shot('behave-handle');
    move(dock()._handle);
    await sleep(500);
    say('handle hovered (want showing)');
    moveTo(640, 200);
    await sleep(2800);
    set('handleHover', false);
    move(dock()._handle);
    await sleep(500);
    say('handle hovered, hover off (want making-room)');
    await click(dock()._handle);
    await sleep(500);
    say('handle clicked (want showing)');
    moveTo(640, 200);
    await sleep(2800);

    // Switching style from the quiet handle while away.
    set('style', 'quiet-handle');
    await sleep(3000);
    say('quiet handle, away');
    set('style', 'pebbles');
    await sleep(700);
    say('switched to pebbles (want showing: it shows itself)');
    await shot('behave-switched');
    await sleep(2800);
    say('pebbles after a while (want making-room, handle)');
    const handles = {...extension._settings.current.handles, pebbles: false};
    set('handles', handles);
    await sleep(300);
    say('pebbles handle off (want handle=false, edge=true)');

    // See-through.
    set('style', 'floating-bar');
    set('whenWindowClose', 'stay');
    set('seeThrough', true);
    await sleep(1500);
    const ghost = [...dock()._style._bars.values()][0];
    note(`see-through bar: ${ghost?.get_style()}`);
    await shot('behave-see-through');
    set('seeThrough', false);

    // Minimising flies into the icon.
    await sleep(500);
    const [ok, rect] = editor.get_icon_geometry();
    const button = dock().buttonFor('org.gnome.TextEditor.desktop');
    const [bx, by] = button.get_transformed_position();
    note(`icon geometry ok=${ok} at ${rect.x},${rect.y} ${rect.width}x${rect.height}; button at ${Math.round(bx)},${Math.round(by)}`);

    // A new app grows in.
    await launch('org.gnome.Calculator.desktop', 400);
    await shot('behave-enter-a');
    await sleep(500);
    await shot('behave-enter-b');
    note(`calculator button=${Boolean(dock().buttonFor('org.gnome.Calculator.desktop'))}`);

    // Without expressive motion the dock moves as before.
    set('expressiveMotion', false);
    set('whenWindowClose', 'hide');
    await sleep(800);
    dock().reveal();
    await sleep(400);
    say('calm reveal (want showing)');
    const scales = dock()._style.revealItems().map(item => item.scale_x.toFixed(2));
    note(`calm item scales: ${[...new Set(scales)].join(',')}`);
    note('done');
}
