// Clicks: launch, focus, minimise; the right-click menu; a drag to reorder.
import Clutter from 'gi://Clutter';
export default async function ({extension, shot, sleep, note, moveTo, click, launch}) {
    const dock = extension._docks.all[0];
    const snap = () => extension._model.snapshot;
    const info = id => {
        const e = snap().apps.find(a => a.id === id);
        return e ? `${e.windows.length} windows focused=${e.focused} minimised=${e.windows.map(w => w.minimized)}` : 'none';
    };
    const editor = 'org.gnome.TextEditor.desktop';
    await click(dock._style.buttonFor(editor));
    await sleep(3000);
    note(`after click on stopped editor: ${info(editor)}`);
    await click(dock._style.buttonFor(editor));
    await sleep(800);
    note(`after click on focused editor (1 window): ${info(editor)}`);
    await click(dock._style.buttonFor(editor));
    await sleep(800);
    note(`after click on minimised editor: ${info(editor)}`);
    moveTo(640, 300);
    await click(dock._style.buttonFor(editor), Clutter.BUTTON_SECONDARY);
    await sleep(800);
    await shot('appmenu');
    note(`menu open=${dock._menu?.isOpen}`);
    dock._menu?.close();
    await sleep(500);
    const before = snap().apps.filter(a => a.pinned).map(a => a.id.split('.').at(-2)).join(',');
    // A drop handled the way DND hands it over: the placeholder index, then the drop.
    const source = dock._style.buttonFor('org.gnome.Settings.desktop');
    dock._dropIndex = 0;
    dock.acceptDrop(source);
    await sleep(600);
    const after = snap().apps.filter(a => a.pinned).map(a => a.id.split('.').at(-2)).join(',');
    note(`pinned before: ${before}\npinned after:  ${after}`);
    extension.disable();
    await sleep(300);
    note(`disabled: dash visible=${global.stage.get_children().length > 0 && imports.ui ? '' : ''}${(await import('resource:///org/gnome/shell/ui/main.js')).overview.dash.visible}`);
    extension.enable();
    await sleep(800);
    note(`enabled again: docks=${extension._docks.all.length}`);
    await shot('reenabled');
}
