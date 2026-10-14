// What apps report about themselves: unread counts, progress and urgency
// over the LauncherEntry interface that Dash to Dock and Unity read, and
// whether a media player of the app is playing (MPRIS). Harbor shows it on
// the icons; it sends no notifications of its own.

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {EventEmitter} from 'resource:///org/gnome/shell/misc/signals.js';

import {SPRINGS, expressive, normal, run, spring} from './choreo.js';
import {appIdFromDesktopEntry, appIdFromUri} from './layout.js';
import {rgba, warn} from './palettes.js';
import {setSource} from './paint.js';
import {countBetween} from './spring.js';
import {text} from './text.js';
import * as Words from './words.js';

const MPRIS_PREFIX = 'org.mpris.MediaPlayer2.';
const MPRIS_PATH = '/org/mpris/MediaPlayer2';
const RING = 4;

// Progress as a ring around the icon: a track and an arc from the top.
const HarborRing = GObject.registerClass({GTypeName: 'HarborRing'},
class HarborRing extends St.DrawingArea {
    _init({theme}) {
        super._init({x_expand: true, y_expand: true, visible: false});
        this._theme = theme;
        this._progress = 0;
        this.connect('repaint', () => this._draw());
    }

    set(progress) {
        this._progress = Math.max(0, Math.min(1, progress));
        this.queue_repaint();
    }

    _draw() {
        const cr = this.get_context();
        const [width, height] = this.get_surface_size();
        const roles = this._theme.roles;
        const r = Math.min(width, height) / 2 - RING / 2;
        cr.setLineWidth(RING);
        cr.setLineCap(1);
        cr.arc(width / 2, height / 2, r, 0, 2 * Math.PI);
        setSource(cr, roles.pc);
        cr.stroke();
        if (this._progress > 0) {
            cr.arc(width / 2, height / 2, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * this._progress);
            setSource(cr, roles.primary);
            cr.stroke();
        }
        cr.$dispose();
    }
});

// The icon in an item's slot (or its tile).
function iconOf(button) {
    return button.tileBin?.icon ?? button.tileBin?.child ?? null;
}

const COUNT_MS = 400;

export class Status extends EventEmitter {
    constructor(theme) {
        super();
        this._theme = theme;
        this._entries = new Map();
        this._players = new Map();
        this._bus = Gio.DBus.session;
        this._launcher = this._bus.signal_subscribe(null, 'com.canonical.Unity.LauncherEntry', 'Update',
            null, null, Gio.DBusSignalFlags.NONE, (_c, sender, _path, _iface, _signal, params) => this._update(sender, params));
        this._owners = this._bus.signal_subscribe('org.freedesktop.DBus', 'org.freedesktop.DBus', 'NameOwnerChanged',
            '/org/freedesktop/DBus', null, Gio.DBusSignalFlags.NONE, (_c, _s, _p, _i, _sig, params) => {
                const [name, , owner] = params.deep_unpack();
                // An app that quits takes its counts with it.
                if (!owner && name.startsWith(':'))
                    this._dropSender(name);
                if (!name.startsWith(MPRIS_PREFIX))
                    return;
                if (owner)
                    this._watchPlayer(name);
                else
                    this._dropPlayer(name);
            });
        this._properties = this._bus.signal_subscribe(null, 'org.freedesktop.DBus.Properties', 'PropertiesChanged',
            MPRIS_PATH, null, Gio.DBusSignalFlags.NONE, (_c, sender) => this._refreshBySender(sender));
        this._bus.call('org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus', 'ListNames',
            null, null, Gio.DBusCallFlags.NONE, -1, null, (bus, result) => {
                try {
                    const [names] = bus.call_finish(result).deep_unpack();
                    names.filter(name => name.startsWith(MPRIS_PREFIX)).forEach(name => this._watchPlayer(name));
                } catch (e) {
                    logError(e, 'Harbor: cannot list media players');
                }
            });
    }

    destroy() {
        this._bus.signal_unsubscribe(this._launcher);
        this._bus.signal_unsubscribe(this._owners);
        this._bus.signal_unsubscribe(this._properties);
        this._players.clear();
        this.disconnectAll();
    }

    _dropSender(sender) {
        let changed = false;
        for (const [id, entry] of this._entries) {
            if (entry.sender === sender) {
                this._entries.delete(id);
                changed = true;
            }
        }
        if (changed)
            this.emit('changed');
    }

    _update(sender, params) {
        const [uri, properties] = params.deep_unpack();
        const id = appIdFromUri(uri);
        if (!id)
            return;
        const entry = this._entries.get(id) ?? {count: 0, countVisible: false, progress: 0, progressVisible: false, urgent: false};
        entry.sender = sender;
        for (const [key, value] of Object.entries(properties)) {
            const v = value.deep_unpack();
            if (key === 'count')
                entry.count = Number(v);
            else if (key === 'count-visible')
                entry.countVisible = Boolean(v);
            else if (key === 'progress')
                entry.progress = Number(v);
            else if (key === 'progress-visible')
                entry.progressVisible = Boolean(v);
            else if (key === 'urgent')
                entry.urgent = Boolean(v);
        }
        this._entries.set(id, entry);
        this.emit('changed');
    }

    // Tests and the headless shell hand states in this way, too.
    report(id, values) {
        this._entries.set(id, {count: 0, countVisible: false, progress: 0, progressVisible: false, urgent: false, ...values});
        this.emit('changed');
    }

    setPlaying(id, playing) {
        this._players.set(`test:${id}`, {owner: null, id, playing});
        this.emit('changed');
    }

    _watchPlayer(name) {
        this._bus.call(name, MPRIS_PATH, 'org.freedesktop.DBus.Properties', 'GetAll',
            new GLib.Variant('(s)', ['org.mpris.MediaPlayer2']), null, Gio.DBusCallFlags.NONE, -1, null, (bus, result) => {
                let entry = null;
                try {
                    const [props] = bus.call_finish(result).deep_unpack();
                    entry = props.DesktopEntry?.deep_unpack() ?? null;
                } catch {
                    return;
                }
                this._bus.call('org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus', 'GetNameOwner',
                    new GLib.Variant('(s)', [name]), null, Gio.DBusCallFlags.NONE, -1, null, (b, r) => {
                        let owner = null;
                        try {
                            [owner] = b.call_finish(r).deep_unpack();
                        } catch {}
                        this._players.set(name, {owner, id: appIdFromDesktopEntry(entry), playing: false});
                        this._refresh(name);
                    });
            });
    }

    _dropPlayer(name) {
        if (this._players.delete(name))
            this.emit('changed');
    }

    _refreshBySender(sender) {
        for (const [name, player] of this._players) {
            if (player.owner === sender)
                this._refresh(name);
        }
    }

    _refresh(name) {
        this._bus.call(name, MPRIS_PATH, 'org.freedesktop.DBus.Properties', 'Get',
            new GLib.Variant('(ss)', ['org.mpris.MediaPlayer2.Player', 'PlaybackStatus']), null,
            Gio.DBusCallFlags.NONE, -1, null, (bus, result) => {
                const player = this._players.get(name);
                if (!player)
                    return;
                try {
                    const [value] = bus.call_finish(result).deep_unpack();
                    player.playing = value.deep_unpack() === 'Playing';
                } catch {
                    player.playing = false;
                }
                this.emit('changed');
            });
    }

    // What the dock asks

    // A style that shows status loudly shows it even with the switch off.
    _on(dock) {
        return dock.settings.countsOnIcons || dock.loudStatus;
    }

    entryFor(item) {
        return this._entries.get(item.id) ?? null;
    }

    attention(item, dock) {
        if (!this._on(dock))
            return false;
        return item.attention || (this.entryFor(item)?.urgent ?? false);
    }

    playing(item) {
        for (const player of this._players.values()) {
            if (player.playing && player.id === item.id)
                return true;
        }
        return false;
    }

    // A new count pops the badge and counts up to itself.
    _count(layer, text) {
        if (layer.shown === text)
            return;
        const before = layer.shown;
        layer.shown = text;
        layer.counter?.stop();
        layer.counter = null;
        if (before === null || !expressive()) {
            layer.count.text = text;
            if (before === null && expressive()) {
                layer.badge.set_scale(0, 0);
                spring(layer.badge, {scale_x: 1, scale_y: 1}, {spring: SPRINGS.pop});
            }
            return;
        }
        layer.badge.set_scale(1.3, 1.3);
        spring(layer.badge, {scale_x: 1, scale_y: 1}, {spring: SPRINGS.pop});
        layer.counter = run(layer.badge, COUNT_MS, ms => {
            layer.count.text = countBetween(before, text, Math.min(1, normal(ms) / COUNT_MS));
        }, () => {
            layer.counter = null;
            layer.count.text = text;
        });
    }

    // Adds a layer over an app's tile for the ring and the count.
    decorate(button, dock) {
        if (button.kind !== 'app' || !button.tileBin)
            return;
        const tile = button.tileBin;
        const parent = tile.get_parent();
        const index = parent.get_children().indexOf(tile);
        const stack = new St.Widget({layout_manager: new Clutter.BinLayout(), x_align: tile.x_align, y_align: tile.y_align});
        parent.remove_child(tile);
        stack.add_child(tile);
        const ring = new HarborRing({theme: this._theme});
        stack.add_child(ring);
        const count = text('badge-number');
        count.x_align = Clutter.ActorAlign.CENTER;
        const badge = new St.Bin({
            style_class: 'harbor-badge',
            child: count,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.START,
            x_expand: true,
            y_expand: true,
            visible: false,
        });
        stack.add_child(badge);
        parent.insert_child_at_index(stack, index);
        button.statusLayer = {stack, ring, badge, count, shown: null, counter: null};
        badge.set_pivot_point(0.5, 0.5);
        iconOf(button)?.set_pivot_point(0.5, 0.5);
        badge.translation_x = Math.round(6 * dock.scale);
        badge.translation_y = -Math.round(6 * dock.scale);
    }

    paint(button, dock) {
        const layer = button.statusLayer;
        if (!layer || button.kind !== 'app')
            return;
        const roles = this._theme.roles;
        const entry = this._on(dock) ? this.entryFor(button.item) : null;
        const counted = entry?.countVisible && entry.count > 0;
        layer.badge.visible = Boolean(counted);
        if (counted) {
            this._count(layer, Words.badge(entry.count));
            layer.badge.set_style(
                `background-color: ${roles.primary}; color: ${roles.onPrimary};` +
                `border: 2px solid ${rgba(dock.barColor ?? roles.highest)};`);
        }
        const progress = Boolean(entry?.progressVisible);
        layer.ring.visible = progress;
        if (progress)
            layer.ring.set(entry.progress);
        if (!counted)
            layer.shown = null;
        // The ring takes room, so the icon steps back by 8 px.
        const icon = iconOf(button);
        const size = button.tileBin.width || dock.iconPx;
        const shrink = progress ? (size - 8) / size : 1;
        if (icon) {
            icon.scale_x = shrink;
            icon.scale_y = shrink;
        }
        // The halo follows a rounded tile; a style that paints a shape
        // shows attention in the shape's colour instead.
        const style = button.tileBin.get_style() ?? '';
        if (this.attention(button.item, dock) && style.includes('border-radius') && !style.includes('box-shadow'))
            button.tileBin.set_style(`${style} box-shadow: 0 0 0 4px ${rgba(warn[this._theme.scheme], 0.33)}; color: ${warn.on};`);
    }
}
