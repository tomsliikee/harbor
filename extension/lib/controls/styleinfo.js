// What each dock style is about, in words: one sentence under the chosen
// style, and a longer card beside the menu while the pointer rests on a
// style in the list.

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {ease} from '../motion.js';
import {setScheme} from '../theme.js';
import {text} from '../text.js';

// short: one sentence for the chosen row. about: the card's text.
// suits: who the style is for.
export const STYLE_INFO = {
    'floating-bar': {
        short: 'One floating bar; a shape glides to the app in front.',
        about: 'The everyday dock. One rounded bar floats a little above the screen edge and carries the apps\' own icons, large and free, with no tile around them. Behind the app in front sits a soft shape in that app\'s tone; when you switch apps, it glides over and changes its form on the way. A line under each icon says what runs: a long bar for the app in front, a short one for a running app, dots for two or three windows and a small wave while an app plays sound. Places and Show apps wait at the end, after a thin divider.',
        suits: 'For everyday use, when the dock should be calm but alive.',
    },
    'extended-bar': {
        short: 'The floating bar that says more: status in words, windows on hover.',
        about: 'The floating bar with two extras. Above an app that downloads something or wants your attention stands a small pill that says so in words, such as "40 % downloaded" or "Wants attention"; the pills stay even when Counts on icons is switched off. And as soon as the pointer rests on an app that has windows, the list of its windows opens by itself, so you can pick the exact window without a click. Everything else works like the floating bar.',
        suits: 'For following downloads and messages, and for apps with many windows.',
    },
    'shape-stage': {
        short: 'Every app stands on a shape that gains points with its windows.',
        about: 'Here the shape is the message. Every app stands on an expressive shape of its own, and that shape is the run indicator: a plain circle while the app is closed, and more points the more windows it has open, so one glance shows where the work piles up. The app in front stands on a larger stage in the primary container colour, running apps on the secondary one. Resting the pointer on an app turns its stage into a cookie.',
        suits: 'For seeing at a glance how many windows each app has.',
    },
    'grouped-block': {
        short: 'Three named groups: pinned, also running, and places.',
        about: 'No shared bar: the dock splits into three blocks with their names above them, Pinned, Also running and Places, so you always know whether an app belongs to the dock or only runs for now. Each app sits on a segment of its own; the app in front turns fully round and fills with primary. When the dock appears, the groups arrive one after the other.',
        suits: 'For keeping your own apps apart from the ones passing through.',
    },
    'expressive-rail': {
        short: 'A rail along the edge; the app in front unfolds with its name.',
        about: 'The loudest way to say which app has the focus. A rail runs along the whole screen edge, with the run lines right at the edge. The app in front does not stay an icon: it unfolds into a pill that reaches out of the rail and shows its name and how many windows it has. Switching apps folds one pill away and springs the next one open. When the dock appears, the rail rises in the middle and spreads to the full width.',
        suits: 'For big screens, and for knowing what is in front without looking for it.',
    },
    'quiet-handle': {
        short: 'A compact, calm bar made for hiding away.',
        about: 'The quiet one. A compact bar with less padding and softer corners that draws little attention and is made to be away most of the time. While it is away, a thin handle stays at the edge; rest the pointer on it, or click it when Show on hover is off, and the dock comes back. The icons keep the same size as in every other style; only the frame around them is smaller.',
        suits: 'For small screens, and for anyone who wants the dock out of the way.',
    },
    'loud-tile': {
        short: 'A large tile leads the bar with the app in front and its windows.',
        about: 'The floating bar led by a loud tile. The tile at the start belongs to the app in front and shows its window count in large numbers; with no app in front, it counts all open windows instead. The free icons follow on the bar. The dock becomes a small dashboard of what you are working on.',
        suits: 'For working with many windows of one app.',
    },
    'mono-container': {
        short: 'One colour for every icon; closed apps fade back.',
        about: 'Calm and uniform. The bar is a round container in the primary container colour, and every icon is drawn as a symbol in one colour, so your accent colour leads and not the app logos. Running apps show at full strength, closed ones fade back, and a primary shape glides behind the app in front.',
        suits: 'For a tidy desktop in a single colour.',
    },
    'pebbles': {
        short: 'No bar: every app is a pebble that grows near the pointer.',
        about: 'The playful one. There is no bar at all; every app floats as a pebble of its own in its tone. The pebbles near the pointer grow like under a magnifier, and the one right under it turns into a cookie with the app\'s name above it. When the dock appears, the pebbles pop up one by one from the middle outwards.',
        suits: 'For a light dock that leaves the wallpaper free.',
    },
    'workspace-split': {
        short: 'Workspaces, apps and a large Show apps in three parts.',
        about: 'The dock for workspaces. It floats in three parts: the workspaces as numbered buttons, the apps in the middle, and a large Show apps at the end. Apps without a window on the current workspace fade back, so you see what belongs here. Click a number to go to that workspace.',
        suits: 'For working across several workspaces.',
    },
};

// The pointer may cross rows on its way elsewhere; only a rest shows the card.
const SHOW_DELAY_MS = 350;
// Moving from one row to the next keeps the card instead of blinking.
const HIDE_DELAY_MS = 150;
const GAP = 12;
const EDGE = 8;
const FADE_MS = 160;
const RISE = 8;

export class StyleInfoCard {
    // names: the styles' names; mini(style): a small drawing of a style.
    constructor({theme, names, mini}) {
        this._theme = theme;
        this._names = names;
        this._mini = mini;
        this._style = null;
        this._showing = 0;
        this._hiding = 0;
        this.actor = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'harbor-style-info',
            reactive: false,
            visible: false,
            opacity: 0,
        });
        const head = new St.BoxLayout({style_class: 'harbor-style-info-head'});
        this._drawing = new St.Bin();
        this._name = text('title-row');
        head.add_child(this._drawing);
        head.add_child(this._name);
        this._about = text('body', {wrap: true});
        this._suits = text('aside', {styleClass: 'harbor-muted', wrap: true});
        this.actor.add_child(head);
        this.actor.add_child(this._about);
        this.actor.add_child(this._suits);
        Main.layoutManager.uiGroup.add_child(this.actor);
        this._theme.connectObject('changed', () => setScheme(this.actor, this._theme.key), this);
        setScheme(this.actor, this._theme.key);
    }

    // row: the style's row in the menu; the card stands beside the menu.
    showSoon(style, row) {
        this._cancel();
        const delay = this.actor.visible ? 0 : SHOW_DELAY_MS;
        this._showing = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
            this._showing = 0;
            this._show(style, row);
            return GLib.SOURCE_REMOVE;
        });
    }

    hideSoon() {
        if (this._showing)
            GLib.source_remove(this._showing);
        this._showing = 0;
        if (this._hiding || !this.actor.visible)
            return;
        this._hiding = GLib.timeout_add(GLib.PRIORITY_DEFAULT, HIDE_DELAY_MS, () => {
            this._hiding = 0;
            this.hide();
            return GLib.SOURCE_REMOVE;
        });
    }

    hide() {
        this._cancel();
        this._style = null;
        if (!this.actor.visible)
            return;
        ease(this.actor, {opacity: 0}, {duration: FADE_MS, onComplete: () => (this.actor.visible = false)});
    }

    destroy() {
        this._cancel();
        this._theme.disconnectObject(this);
        this.actor.destroy();
    }

    _cancel() {
        for (const id of [this._showing, this._hiding]) {
            if (id)
                GLib.source_remove(id);
        }
        this._showing = 0;
        this._hiding = 0;
    }

    _show(style, row) {
        if (!row.get_stage())
            return;
        const info = STYLE_INFO[style];
        if (style !== this._style) {
            this._style = style;
            this._drawing.get_child()?.destroy();
            this._drawing.set_child(this._mini(style));
            this._name.text = this._names[style];
            this._about.text = info.about;
            this._suits.text = info.suits;
        }
        // Beside the menu, on the side with more room, level with the row.
        const menu = menuOf(row);
        const [mx] = menu.get_transformed_position();
        const [mw] = menu.get_transformed_size();
        const [, ry] = row.get_transformed_position();
        const [, rh] = row.get_transformed_size();
        const monitor = Main.layoutManager.findMonitorForActor(row) ?? Main.layoutManager.primaryMonitor;
        const [, w] = this.actor.get_preferred_width(-1);
        const [, h] = this.actor.get_preferred_height(w);
        const leftOfMenu = mx + mw / 2 > monitor.x + monitor.width / 2;
        let left = leftOfMenu ? mx - w - GAP : mx + mw + GAP;
        left = Math.max(monitor.x + EDGE, Math.min(left, monitor.x + monitor.width - w - EDGE));
        const top = Math.max(monitor.y + Main.panel.height + EDGE,
            Math.min(ry + rh / 2 - h / 2, monitor.y + monitor.height - h - EDGE));
        const wasVisible = this.actor.visible && this.actor.opacity > 0;
        Main.layoutManager.uiGroup.set_child_above_sibling(this.actor, null);
        if (wasVisible) {
            ease(this.actor, {x: Math.round(left), y: Math.round(top), opacity: 255}, {duration: FADE_MS});
            return;
        }
        this.actor.set_position(Math.round(left), Math.round(top) + RISE);
        this.actor.visible = true;
        ease(this.actor, {y: Math.round(top), opacity: 255}, {duration: FADE_MS});
    }
}

// The menu's box around a row, or the row itself when it stands alone.
function menuOf(actor) {
    for (let parent = actor; parent; parent = parent.get_parent()) {
        if (parent.has_style_class_name?.('harbor-popup'))
            return parent;
    }
    return actor;
}
