import GLib from 'gi://GLib';
export default async function ({extension, sleep, note, set, launch}) {
    await launch('org.gnome.Ptyxis.desktop');
    for (const style of (GLib.getenv('HARBOR_ONLY') ?? 'floating-bar').split(',')) {
        set('style', style);
        await sleep(700);
        log(`HARBOR-STEP disable ${style}`);
        extension.disable();
        await sleep(200);
        log(`HARBOR-STEP enable ${style}`);
        extension.enable();
        await sleep(500);
    }
    note('done');
}
