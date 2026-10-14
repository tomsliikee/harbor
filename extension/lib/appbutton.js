// HarborAppButton: one item in the dock. It knows what a click, a middle
// click, a right click and the wheel do, names itself on hover and can be
// dragged; how it looks is up to the style that fills it.

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as DND from 'resource:///org/gnome/shell/ui/dnd.js';

import * as Actions from './actions.js';
import * as Words from './words.js';

export const HarborAppButton = GObject.registerClass({GTypeName: 'HarborAppButton'},
class HarborAppButton extends St.Button {
    // kind: 'app', 'place' or 'show-apps'. host: the dock that owns it.
    _init({kind, item, host, styleClass = ''}) {
        super._init({
            style_class: `harbor-item ${styleClass}`,
            button_mask: St.ButtonMask.ONE | St.ButtonMask.TWO | St.ButtonMask.THREE,
            can_focus: true,
            reactive: true,
            track_hover: true,
        });
        this.kind = kind;
        this.item = item;
        this._host = host;
        this._delegate = this;
        this._dragging = false;
        if (kind === 'app') {
            this.app = item.app;
            this._draggable = DND.makeDraggable(this, {timeoutThreshold: 200});
            this._draggable.connect('drag-begin', () => {
                this._dragging = true;
                this._host.dragBegin(this);
            });
            this._draggable.connect('drag-cancelled', () => this._host.dragCancelled(this));
            this._draggable.connect('drag-end', () => {
                this._dragging = false;
                this._host.dragEnd(this);
            });
        }
        this.accessible_name = this._name();
        this.connect('clicked', (_button, mouse) => this._clicked(mouse));
        this.connect('notify::hover', () => this._hoverChanged());
        this.connect('scroll-event', (_actor, event) => this._scrolled(event));
        this.connect('destroy', () => this._host.tooltip.hide());
    }

    setItem(item) {
        this.item = item;
        if (this.kind === 'app')
            this.app = item.app;
        this.accessible_name = this._name();
    }

    // The drag shows the app's icon, at the size the dock shows it.
    getDragActor() {
        return this.app.create_icon_texture(this._host.iconPx);
    }

    getDragActorSource() {
        return this;
    }

    _name() {
        if (this.kind === 'show-apps')
            return 'Show apps';
        return this.item.name;
    }

    _clicked(mouse) {
        this._host.tooltip.hide();
        if (this.kind === 'show-apps') {
            this._host.showApps();
            return;
        }
        if (this.kind === 'place') {
            if (mouse === Clutter.BUTTON_SECONDARY)
                this._host.openPlaceMenu(this);
            else
                this._host.openPlace(this.item);
            return;
        }
        if (mouse === Clutter.BUTTON_SECONDARY)
            this._host.openAppMenu(this);
        else if (mouse === Clutter.BUTTON_MIDDLE)
            Actions.newWindow(this.item);
        else
            Actions.primary(this.item, {onList: () => this._host.showWindowList(this)});
    }

    _scrolled(event) {
        if (this.kind !== 'app' || this.item.windows.length === 0)
            return Clutter.EVENT_PROPAGATE;
        const direction = event.get_scroll_direction();
        if (direction === Clutter.ScrollDirection.UP || direction === Clutter.ScrollDirection.LEFT)
            Actions.cycle(this.item, -1);
        else if (direction === Clutter.ScrollDirection.DOWN || direction === Clutter.ScrollDirection.RIGHT)
            Actions.cycle(this.item, 1);
        return Clutter.EVENT_STOP;
    }

    _hoverChanged() {
        this._host.hovered(this, this.hover);
        if (!this.hover || this._dragging) {
            this._host.tooltip.hide();
            return;
        }
        if (this._host.tooltipsHeld)
            return;
        this._host.tooltip.showSoon(this, this._host.side, this.tooltipText());
    }

    tooltipText() {
        if (this.kind === 'app') {
            const count = this.item.windows.length;
            return {title: this.item.name, detail: count > 0 ? Words.windows(count) : ''};
        }
        return {title: this._name()};
    }
});
