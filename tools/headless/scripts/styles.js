// Every style at the bottom, plus left and right for each, with windows open.
import GLib from 'gi://GLib';
const STYLES = ['floating-bar', 'shape-stage', 'grouped-block', 'expressive-rail', 'status', 'quiet-handle',
    'loud-tile', 'mono-container', 'window-list', 'pebbles', 'workspace-split'];
export default async function ({extension, shot, sleep, note, moveTo, move, launch, set}) {
    await launch('org.gnome.Ptyxis.desktop');
    await launch('org.gnome.Ptyxis.desktop');
    await launch('org.gnome.TextEditor.desktop', 3000);
    extension._status.report('org.gnome.Calendar.desktop', {count: 12, countVisible: true});
    extension._status.report('org.mozilla.firefox.desktop', {progress: 0.64, progressVisible: true});
    // Windows out of the way, the text editor keeps the focus.
    for (const w of global.display.list_all_windows()) {
        if (w.get_window_type() === 0)
            w.move_resize_frame(false, 80, 80, 500, 300);
    }
    const sides = (GLib.getenv('HARBOR_SIDES') ?? 'bottom').split(',');
    const only = GLib.getenv('HARBOR_ONLY');
    for (const style of only ? only.split(',') : STYLES) {
        set('style', style);
        for (const side of sides) {
            set('position', side);
            await sleep(900);
            moveTo(900, 120);
            await sleep(300);
            await shot(`style-${style}-${side}`);
            const d = extension._docks.all[0];
            const c = d._container;
            note(`${style}/${side}: state=${d.state} shown=${d.shown} vis=${c.visible} ty=${c.translation_y} op=${c.opacity} h=${c.height} y=${c.y} hov=${d._hovering} rev=${d._revealed}`);
        }
        if (style === 'pebbles' && sides.includes('bottom')) {
            const dock = extension._docks.all[0];
            const b = dock.buttonFor('org.gnome.Calendar.desktop');
            move(b);
            await sleep(500);
            await shot('style-pebbles-hover');
            const name = dock._style._name;
            note(`name visible=${name.visible} pos=${name.get_position()} size=${name.get_size()} text=${name.child.text} mapped=${name.mapped}`);
            moveTo(900, 120);
        }
        if (style === 'quiet-handle') {
            set('whenWindowClose', 'hide');
            await sleep(1500);
            await shot('style-quiet-handle-hidden');
            set('whenWindowClose', 'make-room');
        }
    }
    note('done');
}
