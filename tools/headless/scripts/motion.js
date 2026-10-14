// Expressive motion frame by frame: the dock appearing and going in slow
// motion for several styles, the hover shape, the focus gliding, a start
// and an app that wants attention.
//
//   HARBOR_ONLY="floating-bar pebbles" limits the styles.
import GLib from 'gi://GLib';

const SLOW = 8;
// Real milliseconds at 8× slow motion; about an eighth of that at normal.
const APPEAR = [0, 400, 800, 1300, 1900, 2700, 3800, 6400];
const GO = [0, 600, 1200, 1800, 2500, 3200];

export default async function ({extension, shot, sleep, note, moveTo, move, click, launch, set}) {
    const choreo = await import(`file://${extension.path}/lib/choreo.js`);
    const slow = on => choreo.setMotion({expressiveMotion: true, speed: on ? SLOW : 1});
    const dock = () => extension._docks.all[0];
    await launch('org.gnome.Ptyxis.desktop');
    await launch('org.gnome.TextEditor.desktop');
    moveTo(640, 200);
    set('whenWindowClose', 'hide');
    set('handles', Object.fromEntries(Object.keys(extension._settings.current.handles).map(id => [id, false])));
    await sleep(1500);

    const only = (GLib.getenv('HARBOR_ONLY') ?? '').split(' ').filter(Boolean);
    const styles = only.length ? only : ['floating-bar', 'pebbles', 'workspace-split', 'expressive-rail', 'grouped-block'];
    for (const style of styles) {
        set('style', style);
        await sleep(2600);
        dock()._revealed = false;
        dock()._evaluate({animated: false});
        await sleep(500);
        note(`${style}: before appear shown=${dock().shown} visible=${dock()._container.visible}`);
        slow(true);
        dock().reveal();
        // Stays until it is told to go.
        dock()._clearTimers();
        let last = 0;
        for (const at of APPEAR) {
            await sleep(at - last);
            last = at;
            await shot(`appear-${style}-${String(at).padStart(4, '0')}`);
        }
        await sleep(1500);
        slow(false);
        await sleep(300);
        // Go: drop the reveal and let it leave.
        slow(true);
        dock()._revealed = false;
        dock()._hovering = false;
        dock()._evaluate();
        last = 0;
        for (const at of GO) {
            await sleep(at - last);
            last = at;
            await shot(`go-${style}-${String(at).padStart(4, '0')}`);
        }
        await sleep(1200);
        slow(false);
        note(`${style}: after go shown=${dock().shown} visible=${dock()._container.visible}`);
    }

    // States, on the floating bar shown for good.
    set('style', 'floating-bar');
    set('whenWindowClose', 'stay');
    await sleep(2500);
    const editor = dock().buttonFor('org.gnome.TextEditor.desktop');
    const terminal = dock().buttonFor('org.gnome.Ptyxis.desktop');
    // Focus moves from the editor to the terminal.
    slow(true);
    const ptyxis = global.display.list_all_windows().find(w => w.get_wm_class()?.includes('Ptyxis'));
    ptyxis?.activate(global.get_current_time());
    for (const at of [0, 500, 1000, 1800]) {
        await sleep(at ? 500 : 0);
        await shot(`glide-${at}`);
    }
    await sleep(3000);
    slow(false);
    move(editor);
    await sleep(700);
    await shot('hover');
    moveTo(640, 200);
    await sleep(500);
    // A start: Calendar has no window yet.
    const calendar = dock().buttonFor('org.gnome.Calendar.desktop');
    calendar.markLaunching?.();
    await sleep(450);
    await shot('launch-a');
    await sleep(450);
    await shot('launch-b');
    // Attention and a count.
    extension._status.report('org.gnome.Ptyxis.desktop', {urgent: true, count: 3, countVisible: true});
    await sleep(1800);
    await shot('attention');
    note(`terminal attention=${dock().attentionFor(terminal)}`);
    extension._status.report('org.gnome.Ptyxis.desktop', {urgent: false, count: 12, countVisible: true});
    await sleep(150);
    await shot('count-pop');
    await sleep(1000);
    note('done');
}
