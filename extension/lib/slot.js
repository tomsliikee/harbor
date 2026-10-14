// HarborSlot: the place of one item in the dock. The app's own icon stands
// in it, large and free; a shape behind it only shows a state: the pointer
// resting on it, the app starting, or the app asking for attention.
//
// A solid slot keeps its shape all the time (Show apps, a pebble, a stage);
// its state then changes the shape's form and size instead.

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {SPRINGS, expressive, spring, stopSprings} from './choreo.js';
import {HarborShape} from './shape.js';
import {CIRCLE, COOKIE} from './shapes.js';

// One beat of a starting app.
const LAUNCH_MS = 900;
// A waiting app wiggles this often, for this long.
const ATTENTION_MS = 4000;
const WIGGLE_MS = 600;
const WIGGLE_DEGREES = 9;
const HOVER_ALPHA = 0.7;
const WAIT_ALPHA = 0.6;

export const HarborSlot = GObject.registerClass({GTypeName: 'HarborSlot'},
class HarborSlot extends St.Widget {
    // side: the dock's edge, so the icon lifts away from it. lift: px.
    // solid: {form, hoverForm, scale, hoverScale} for a shape that stays.
    _init({size, icon, side, lift = 4, solid = null, shadow = false}) {
        super._init({
            layout_manager: new Clutter.BinLayout(),
            width: size,
            height: size,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._side = side;
        this._lift = lift;
        this._solid = solid ? {form: CIRCLE, hoverForm: COOKIE, scale: 1, hoverScale: 1, ...solid} : null;
        this._hover = false;
        this._launching = false;
        this._attention = false;
        this._backed = false;
        this._color = '#000000';
        this._warn = '#000000';
        this._loop = null;
        this._beat = -1;

        this.shape = new HarborShape({size, shadow, x_align: Clutter.ActorAlign.CENTER, y_align: Clutter.ActorAlign.CENTER});
        this.shape.set_pivot_point(0.5, 0.5);
        this.icon = icon;
        icon.x_align = Clutter.ActorAlign.CENTER;
        icon.y_align = Clutter.ActorAlign.CENTER;
        icon.set_pivot_point(0.5, 0.5);
        this.add_child(this.shape);
        this.add_child(icon);
        this.set_pivot_point(0.5, 0.5);
        this.connect('destroy', () => {
            this._loop?.stop();
            this._loop = null;
        });
        this._sync(false);
    }

    // color: the shape's colour; warn: its colour while the app waits.
    paint(color, warn) {
        this._color = color;
        this._warn = warn;
        if (!this._loop)
            this.shape.setColor(...this._colorNow());
    }

    // A solid slot's form and size at rest, e.g. a stage that grows.
    setRest(rest, {animated = true} = {}) {
        if (!this._solid)
            return;
        const before = JSON.stringify(this._solid);
        Object.assign(this._solid, rest);
        if (JSON.stringify(this._solid) !== before)
            this._sync(animated);
    }

    setHover(on) {
        if (this._hover === on)
            return;
        this._hover = on;
        this._sync();
    }

    // Something behind the slot already shows the state (the focus shape),
    // so hovering only lifts the icon.
    setBacked(on) {
        if (this._backed === on)
            return;
        this._backed = on;
        this._sync();
    }

    setLaunching(on) {
        if (this._launching === on)
            return;
        this._launching = on;
        this._sync();
    }

    setAttention(on) {
        if (this._attention === on)
            return;
        this._attention = on;
        this._sync();
    }

    // A press pushes the slot in; letting go springs it back past its size.
    setPressed(on) {
        const scale = on ? 0.9 : 1;
        spring(this, {scale_x: scale, scale_y: scale}, {spring: on ? SPRINGS.press : SPRINGS.release});
    }

    _liftOffset(distance) {
        return {
            bottom: [0, -distance],
            left: [distance, 0],
            right: [-distance, 0],
        }[this._side] ?? [0, -distance];
    }

    _waiting() {
        return this._attention && !this._launching;
    }

    _colorNow() {
        if (this._waiting())
            return [this._warn, this._solid ? 1 : WAIT_ALPHA];
        return [this._color, this._solid ? 1 : HOVER_ALPHA];
    }

    _sync(animated = true) {
        const shape = this.shape;
        const solid = this._solid;
        shape.setColor(...this._colorNow());
        const hover = this._hover && !this._backed;
        let form = hover ? COOKIE : CIRCLE;
        if (solid)
            form = this._hover ? solid.hoverForm : solid.form;
        shape.setShape(form, {animated: animated && expressive()});
        this._syncLoop();
        if (this._loop)
            return;
        let scale = hover || this._launching || this._attention ? 1 : 0;
        if (solid)
            scale = this._hover ? solid.hoverScale : solid.scale;
        const [x, y] = this._liftOffset(this._hover ? this._lift : 0);
        if (animated) {
            spring(shape, {scale_x: scale, scale_y: scale}, {spring: SPRINGS.hover});
            spring(this.icon, {translation_x: x, translation_y: y}, {spring: SPRINGS.hover});
        } else {
            stopSprings(shape);
            stopSprings(this.icon, ['translation_x', 'translation_y']);
            shape.set_scale(scale, scale);
            this.icon.translation_x = x;
            this.icon.translation_y = y;
        }
    }

    // Starting and waiting move all the time, on one looping timeline.
    _syncLoop() {
        const wanted = (this._launching || this._attention) && expressive();
        if (Boolean(this._loop) === wanted)
            return;
        if (!wanted) {
            this._loop.stop();
            this._loop = null;
            this.icon.rotation_angle_z = 0;
            return;
        }
        stopSprings(this.shape);
        stopSprings(this.icon, ['translation_x', 'translation_y']);
        const start = GLib.get_monotonic_time();
        this._beat = -1;
        this._loop = new Clutter.Timeline({actor: this, duration: 1000, repeat_count: -1});
        this._loop.connect('new-frame', () => this._frame((GLib.get_monotonic_time() - start) / 1000));
        this._loop.start();
    }

    _frame(ms) {
        const rest = this._solid?.scale ?? 1;
        if (this._launching) {
            // The shape breathes and changes between circle and cookie on
            // every beat; the icon hops away from the edge.
            const phase = (ms % LAUNCH_MS) / LAUNCH_MS;
            const beat = Math.floor(ms / LAUNCH_MS);
            if (beat !== this._beat) {
                this._beat = beat;
                this.shape.setShape(beat % 2 ? COOKIE : CIRCLE);
            }
            const breath = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
            const scale = rest * (0.8 + 0.2 * breath);
            this.shape.set_scale(scale, scale);
            const [x, y] = this._liftOffset(this._lift * 1.6 * Math.abs(Math.sin(Math.PI * phase)));
            this.icon.translation_x = x;
            this.icon.translation_y = y;
            this.icon.rotation_angle_z = 0;
            return;
        }
        // Waiting: a short wiggle every few seconds, and a slow pulse.
        const into = ms % ATTENTION_MS;
        this.icon.rotation_angle_z = into < WIGGLE_MS
            ? WIGGLE_DEGREES * Math.sin(into / WIGGLE_MS * 4 * Math.PI) * (1 - into / WIGGLE_MS)
            : 0;
        const pulse = 0.5 - 0.5 * Math.cos(2 * Math.PI * ms / 1600);
        const scale = rest * (0.9 + 0.1 * pulse);
        this.shape.set_scale(scale, scale);
        this.shape.setColor(this._warn, this._solid ? 0.7 + 0.3 * pulse : 0.4 + 0.3 * pulse);
    }
});
