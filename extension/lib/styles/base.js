// What every dock style shares: one button per app, place and Show apps,
// kept across updates so hover and drags survive a change, and painted
// again whenever the colours change. A style decides how the buttons are
// arranged and drawn.
//
// A style's bars are not painted by the boxes that hold the buttons but by
// stand-ins on a layer behind them, so a bar can spread from a pill to its
// full length while the dock appears, and a shape can glide behind the
// icons from one app to the next.

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {HarborAppButton} from '../appbutton.js';
import {SPRINGS, expressive, spring} from '../choreo.js';
import {mix, rgba} from '../palettes.js';
import {BLOOM, COOKIE} from '../shapes.js';
import {HarborSlot} from '../slot.js';

export const TONE_TEXT = {pc: 'onPc', sc: 'onSc', tc: 'onTc'};

// A slot is this much larger than the icon in it, so a shape behind the
// icon shows around it.
const SLOT_SHARE = 1.16;

export function box(vertical, styleClass = '', params = {}) {
    return new St.BoxLayout({
        orientation: vertical ? Clutter.Orientation.VERTICAL : Clutter.Orientation.HORIZONTAL,
        style_class: styleClass,
        ...params,
    });
}

// Where an actor sits inside one of its ancestors, from the allocations
// alone (what the layout settled on, not where an animation has it now).
// Null when the ancestor is not above it or nothing is laid out yet.
export function rectIn(actor, ancestor) {
    let x = 0;
    let y = 0;
    for (let current = actor; current !== ancestor; current = current.get_parent()) {
        if (!current)
            return null;
        const allocation = current.get_allocation_box();
        x += allocation.x1;
        y += allocation.y1;
    }
    const allocation = actor.get_allocation_box();
    const r = {x, y, width: allocation.x2 - allocation.x1, height: allocation.y2 - allocation.y1};
    return Object.values(r).every(Number.isFinite) ? r : null;
}

// A layer for what reaches beyond the dock or lies behind it: it asks for
// no room, so a pill above an icon never makes the dock itself larger.
const HarborOverlay = GObject.registerClass({GTypeName: 'HarborOverlay'},
class HarborOverlay extends St.Widget {
    _init() {
        super._init({layout_manager: new Clutter.FixedLayout(), x_expand: true, y_expand: true});
    }

    vfunc_get_preferred_width() {
        return [0, 0];
    }

    vfunc_get_preferred_height() {
        return [0, 0];
    }
});

export class Style {
    constructor(host) {
        this.host = host;
        this._buttons = new Map();
        this._bars = new Map();
        this._built = false;
        this.body = this.buildRoot();
        this.backdrop = new HarborOverlay();
        this.overlay = new HarborOverlay();
        this.actor = new St.Widget({layout_manager: new Clutter.BinLayout(), x_expand: true, y_expand: true});
        this.actor.add_child(this.backdrop);
        this.actor.add_child(this.body);
        this.actor.add_child(this.overlay);
        // Floating things follow when the dock itself is laid out anew.
        this.overlay.connect('notify::allocation', () => this.overlayMoved());
        // At shell exit the actors go before Harbor is disabled; a button
        // held out of the body must not outlive them.
        this.actor.connect('destroy', () => {
            for (const button of this._buttons.values()) {
                if (!button.get_parent())
                    button.destroy();
            }
        });
        this.body.connect('notify::allocation', () => this.layoutChanged());
        this.host.theme.connectObject('changed', () => this.repaint(), this);
    }

    // Where a child of the body sits in the overlay's coordinates.
    overlayMoved() {}

    // The body was laid out anew: the bars and what lies on them follow.
    layoutChanged() {
        for (const ghost of this._bars.values())
            this._placeBar(ghost);
    }

    // Null while either is not laid out yet.
    positionOf(actor) {
        if (!actor.get_stage() || !this.overlay.get_stage())
            return null;
        const [ax, ay] = actor.get_transformed_position();
        const [ox, oy] = this.overlay.get_transformed_position();
        const [w, h] = actor.get_transformed_size();
        const r = {x: ax - ox, y: ay - oy, width: w, height: h};
        return Object.values(r).every(Number.isFinite) ? r : null;
    }

    // The style keeps room for itself at the edge even when windows could
    // use it (only the rail does).
    get reservesSpace() {
        return false;
    }

    // The style spans the whole edge instead of floating in its middle.
    get fullLength() {
        return false;
    }

    // Distance from the screen edge.
    get edgeGap() {
        return this.host.vertical ? 16 : 24;
    }

    get loudStatus() {
        return false;
    }

    get barColor() {
        return this.host.theme.roles.highest;
    }

    get s() {
        return this.host.scale;
    }

    px(value) {
        return Math.round(value * this.s);
    }

    get slotSize() {
        return Math.round(this.host.iconPx * SLOT_SHARE);
    }

    buildRoot() {
        throw new Error('A style builds its root');
    }

    // Creates the inside of a new button once.
    fill(_button) {}

    // Paints a button for its current item.
    paint(_button) {}

    // Places the buttons; groups: {pinned, running, places, showApps}.
    arrange(_groups) {}

    paintRoot() {}

    // Turns slowly while nothing happens ("Always moving").
    setAmbient(_on) {}

    // The buttons of the apps, in dock order, for drops.
    appButtons() {
        return [...this._buttons.values()].filter(button => button.kind === 'app' && button.get_parent() && !button._leaving);
    }

    // The button of one app, if it shows here.
    buttonFor(appId) {
        return this._buttons.get(`app:${appId}`) ?? null;
    }

    update(snapshot) {
        this.snapshot = snapshot;
        const seen = new Set();
        const entering = [];
        const take = (key, kind, item, styleClass) => {
            seen.add(key);
            let button = this._buttons.get(key);
            if (!button) {
                button = new HarborAppButton({kind, item, host: this.host, styleClass});
                button.set_pivot_point(0.5, 0.5);
                this._buttons.set(key, button);
                this.fill(button);
                button.connect('notify::pressed', () => button.slot?.setPressed(button.pressed));
                if (this._built)
                    entering.push(button);
            } else {
                button.setItem(item);
            }
            return button;
        };
        const apps = this.host.appsFor(snapshot);
        const groups = {
            pinned: apps.filter(entry => entry.pinned).map(entry => take(`app:${entry.id}`, 'app', entry)),
            running: apps.filter(entry => !entry.pinned).map(entry => take(`app:${entry.id}`, 'app', entry)),
            places: this.host.places().map(place => take(`place:${place.id}`, 'place', place)),
            showApps: take('show-apps', 'show-apps', {name: 'Show apps'}, 'harbor-show-apps'),
        };
        for (const [key, button] of this._buttons) {
            if (!seen.has(key)) {
                this._buttons.delete(key);
                this.leave(button);
            }
        }
        this.arrange(groups);
        this.repaint();
        for (const button of entering)
            this.enter(button);
        this._built = true;
    }

    repaint() {
        this.paintRoot();
        for (const button of this._buttons.values())
            this.paint(button);
    }

    // A new app grows in: its neighbours move apart, then it pops up.
    enter(button) {
        if (!expressive() || !this.host.shown || !button.get_parent())
            return;
        const vertical = this.host.vertical;
        const length = vertical ? 'height' : 'width';
        const [, natural] = vertical ? button.get_preferred_height(-1) : button.get_preferred_width(-1);
        button.set_scale(0, 0);
        button[length] = 0;
        spring(button, {[length]: natural}, {
            spring: SPRINGS.spread,
            onDone: () => {
                if (!button._leaving)
                    button[length] = -1;
            },
        });
        spring(button, {scale_x: 1, scale_y: 1}, {spring: SPRINGS.pop, delay: 60});
    }

    // An app that went shrinks away and its neighbours close up.
    leave(button) {
        button._leaving = true;
        button.reactive = false;
        if (!expressive() || !this.host.shown || !button.get_parent()) {
            button.destroy();
            return;
        }
        const length = this.host.vertical ? 'height' : 'width';
        spring(button, {scale_x: 0, scale_y: 0}, {spring: SPRINGS.leave});
        spring(button, {[length]: 0}, {spring: SPRINGS.leave, delay: 40, onDone: () => button.destroy()});
    }

    // Moves children into a container in the given order, reusing them. A
    // button on its way out keeps its place while it shrinks.
    place(container, children) {
        const order = [...children];
        container.get_children().forEach((child, index) => {
            if (child._leaving)
                order.splice(Math.min(index, order.length), 0, child);
        });
        order.forEach((child, index) => {
            const parent = child.get_parent();
            if (parent !== container) {
                parent?.remove_child(child);
                container.insert_child_at_index(child, index);
            } else {
                container.set_child_at_index(child, index);
            }
        });
    }

    hovered(button, hover) {
        button.slot?.setHover(hover && !button._leaving);
    }

    destroy() {
        this.host.theme.disconnectObject(this);
        // A button can be out of the body (the loud tile holds the focused
        // app's place), so each goes on its own.
        for (const button of this._buttons.values())
            button.destroy();
        this._buttons.clear();
        this._bars.clear();
        this.actor.destroy();
    }

    // Slots

    // The place of an item: its icon, or the glyph of a place or Show apps.
    makeSlot(button, {size = this.slotSize, iconSize = this.host.iconPx, solid = null, shadow = false} = {}) {
        const glyph = Math.round(iconSize * 0.5);
        let icon;
        if (button.kind === 'app') {
            icon = this.appIcon(button, iconSize);
        } else if (button.kind === 'show-apps') {
            icon = new St.Icon({icon_name: 'view-app-grid-symbolic', icon_size: glyph});
            solid ??= {form: COOKIE, hoverForm: BLOOM, scale: 0.86, hoverScale: 0.96};
        } else {
            icon = new St.Icon({icon_size: glyph});
            button.placeIcon = icon;
        }
        const slot = new HarborSlot({size, icon, side: this.host.side, lift: this.px(4), solid, shadow});
        button.slot = slot;
        button.icon = icon;
        return slot;
    }

    // An app's icon as this style shows it.
    appIcon(button, iconSize) {
        return button.item.app.create_icon_texture(iconSize);
    }

    // An app's tone, pulled toward primary so it stands out from a light
    // bar (the containers are nearly as light as the bar itself).
    toneColor(tone, strength) {
        const theme = this.host.theme;
        const roles = theme.roles;
        return mix(roles[tone], roles.primary, theme.scheme === 'light' ? strength : strength * 0.8);
    }

    // The colour of an item's shape: its tone for an app.
    slotColor(button) {
        const roles = this.host.theme.roles;
        if (button.kind === 'app')
            return this.toneColor(button.item.tone, 0.18);
        return button.kind === 'show-apps' ? roles.tc : roles.high;
    }

    // The colour of a glyph on its shape (or on the bar).
    glyphColor(button) {
        const roles = this.host.theme.roles;
        return button.kind === 'show-apps' ? roles.onTc : roles.onVar;
    }

    paintSlot(button) {
        const slot = button.slot;
        slot.paint(this.slotColor(button), this.host.theme.warn);
        slot.setAttention(button.kind === 'app' && this.host.attentionFor(button));
        if (button.kind === 'place') {
            button.placeIcon.icon_name = button.item.iconName ?? null;
            if (button.item.gicon)
                button.placeIcon.gicon = button.item.gicon;
        }
        if (button.kind !== 'app')
            button.icon.set_style(`color: ${this.glyphColor(button)};`);
    }

    // Bars

    // Has `part` painted as a bar with the given CSS (colour, corners,
    // shadow), on the layer behind the buttons.
    bar(part, css) {
        let ghost = this._bars.get(part);
        if (!ghost) {
            ghost = new St.Widget({style_class: 'harbor-bar-ghost'});
            // The bar's shadow goes with its paint.
            if (part.has_style_class_name('harbor-floating')) {
                part.remove_style_class_name('harbor-floating');
                ghost.add_style_class_name('harbor-floating');
            }
            ghost.part = part;
            ghost.spread = this.host.revealShare;
            this._bars.set(part, ghost);
            this.backdrop.insert_child_at_index(ghost, 0);
            part.connect('notify::allocation', () => this._placeBar(ghost));
            part.connect('notify::visible', () => this._placeBar(ghost));
        }
        ghost.css = css;
        ghost.radius = Number(/border-radius:\s*(\d+)px/.exec(css)?.[1] ?? 0);
        ghost.set_style(css);
        ghost.rounded = null;
        this._placeBar(ghost);
    }

    _placeBar(ghost) {
        const r = rectIn(ghost.part, this.actor);
        ghost.visible = Boolean(r) && ghost.part.visible && r.width > 0 && r.height > 0;
        if (!ghost.visible)
            return;
        ghost.rect = r;
        this._spreadBar(ghost);
    }

    // A bar at `spread` 0 is a pill in its middle, at 1 its whole length.
    _spreadBar(ghost) {
        const r = ghost.rect;
        if (!r)
            return;
        const vertical = this.host.vertical;
        const along = vertical ? r.height : r.width;
        const across = vertical ? r.width : r.height;
        const pill = Math.min(along, across * 1.6);
        const length = Math.max(0, Math.round(pill + (along - pill) * ghost.spread));
        if (vertical) {
            ghost.set_position(r.x, Math.round(r.y + (r.height - length) / 2));
            ghost.set_size(r.width, length);
        } else {
            ghost.set_position(Math.round(r.x + (r.width - length) / 2), r.y);
            ghost.set_size(length, r.height);
        }
        // A pill is round at its ends; the bar gets its own corners back as
        // it spreads.
        const pillness = 1 - Math.max(0, Math.min(1, ghost.spread));
        const radius = Math.round(ghost.radius + (across / 2 - ghost.radius) * pillness);
        if (radius !== ghost.rounded) {
            ghost.rounded = radius;
            ghost.set_style(`${ghost.css} border-radius: ${radius}px;`);
        }
    }

    setSpread(ghost, share) {
        ghost.spread = share;
        this._spreadBar(ghost);
    }

    // Appearing

    // What appears one after another: groups (from the middle outwards),
    // each a bar or two and the items on them.
    revealGroups() {
        return [{bars: this.visibleBars(), items: this.revealItems()}];
    }

    visibleBars() {
        return [...this._bars.values()].filter(ghost => ghost.part.visible);
    }

    // The items in the order they stand.
    revealItems(root = this.body) {
        const items = [];
        const walk = actor => {
            for (const child of actor.get_children()) {
                if (!child.visible)
                    continue;
                if (child instanceof HarborAppButton || child._harborItem) {
                    if (!child._leaving)
                        items.push(child);
                } else {
                    walk(child);
                }
            }
        };
        walk(root);
        return items;
    }

    // Time between two items popping up, at normal speed.
    get itemStep() {
        return 25;
    }

    // Called on every frame of appearing and going.
    revealFrame() {}

    // Helpers for painting.
    tileStyle(background, radius, alpha = 1) {
        return `background-color: ${rgba(background, alpha)}; border-radius: ${radius}px;`;
    }
}
