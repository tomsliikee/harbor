// Workspace split: three floating parts. The workspaces as segmented
// buttons, the apps (those with no window on this workspace fade back),
// and a large Show apps.

import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import St from 'gi://St';

import {shownWorkspaces} from '../layout.js';
import {BLOOM, COOKIE} from '../shapes.js';
import {text} from '../text.js';
import * as Words from '../words.js';
import {FloatingBarStyle} from './floating-bar.js';
import {box} from './base.js';

const ELSEWHERE_OPACITY = 140;

export class WorkspaceSplitStyle extends FloatingBarStyle {
    buildRoot() {
        const vertical = this.host.vertical;
        const root = box(vertical, 'harbor-split');
        this.spaces = box(vertical, 'harbor-split-part harbor-floating');
        this.middle = box(vertical, 'harbor-split-part harbor-floating');
        this.apps = box(vertical);
        this.separator = new St.Widget();
        this.ends = box(vertical);
        this.separator._harborItem = true;
        this.separator.set_pivot_point(0.5, 0.5);
        this.middle.add_child(this.apps);
        this.middle.add_child(this.separator);
        this.middle.add_child(this.ends);
        this.right = new St.Bin({style_class: 'harbor-split-part'});
        root.add_child(this.spaces);
        root.add_child(this.middle);
        root.add_child(this.right);
        this._spaceKey = '';
        return root;
    }

    // Parts appear one after another: the workspaces, the apps, Show apps.
    revealGroups() {
        const ghost = part => [this._bars.get(part)].filter(bar => bar && part.visible);
        return [
            {bars: ghost(this.spaces), items: this.spaces.get_children()},
            {bars: ghost(this.middle), items: this.revealItems(this.middle)},
            {bars: [], items: this.revealItems(this.right)},
        ];
    }

    // Show apps is a part of its own, as deep as the others.
    makeSlot(button, options = {}) {
        if (button.kind !== 'show-apps')
            return super.makeSlot(button, options);
        return super.makeSlot(button, {
            ...options,
            size: this.slotSize + 6 + 2 * this.px(8),
            solid: {form: COOKIE, hoverForm: BLOOM, scale: 0.94, hoverScale: 1},
        });
    }

    arrange({pinned, running, places, showApps}) {
        this.place(this.apps, [...pinned, ...running]);
        this.place(this.ends, places);
        this.separator.visible = places.length > 0;
        if (showApps.get_parent() !== this.right) {
            showApps.get_parent()?.remove_child(showApps);
            this.right.set_child(showApps);
        }
        showApps.run.visible = false;
        this.setFocus([...pinned, ...running].find(button => button.item.focused) ?? null);
        this._syncSpaces();
    }

    _syncSpaces() {
        const snapshot = this.snapshot;
        if (!snapshot)
            return;
        const shown = shownWorkspaces(snapshot.workspaceCounts, snapshot.activeWorkspace, Meta.prefs_get_dynamic_workspaces());
        const key = `${shown.join(',')}|${snapshot.activeWorkspace}|${snapshot.workspaceCounts.join(',')}`;
        if (key === this._spaceKey)
            return;
        this._spaceKey = key;
        this.spaces.destroy_all_children();
        shown.forEach((index, i) => {
            const label = text('body-strong', {text: `${index + 1}`});
            label.x_align = Clutter.ActorAlign.CENTER;
            const segment = new St.Button({style_class: 'harbor-space', child: label, can_focus: true, reactive: true, track_hover: true});
            segment.workspace = index;
            segment.set_pivot_point(0.5, 0.5);
            segment.place = shown.length === 1 ? 'only' : i === 0 ? 'first' : i === shown.length - 1 ? 'last' : 'middle';
            segment.connect('clicked', () => {
                global.workspace_manager.get_workspace_by_index(index)?.activate(global.get_current_time());
            });
            segment.connect('notify::hover', () => {
                if (segment.hover)
                    this.host.tooltip.showSoon(segment, this.host.side, {italic: Words.workspaceTip(index, snapshot.workspaceCounts[index] ?? 0)});
                else
                    this.host.tooltip.hide();
            });
            this.spaces.add_child(segment);
        });
        this._paintSpaces();
    }

    _paintSpaces() {
        const roles = this.host.theme.roles;
        const vertical = this.host.vertical;
        const outer = this.px(22);
        const inner = this.px(8);
        // As deep as an app with its run line, so the parts line up.
        const across = this.slotSize + 6;
        const along = Math.round(this.slotSize * 0.62);
        const [w, h] = vertical ? [across, along] : [along, across];
        for (const segment of this.spaces.get_children()) {
            const active = segment.workspace === this.snapshot.activeWorkspace;
            const first = segment.place === 'first' || segment.place === 'only';
            const last = segment.place === 'last' || segment.place === 'only';
            const radii = active
                ? [outer, outer, outer, outer]
                : vertical
                    ? [first ? outer : inner, first ? outer : inner, last ? outer : inner, last ? outer : inner]
                    : [first ? outer : inner, last ? outer : inner, last ? outer : inner, first ? outer : inner];
            segment.set_size(w, h);
            segment.set_style(`border-radius: ${radii.map(r => `${r}px`).join(' ')};` +
                `background-color: ${active ? roles.primary : roles.pc}; color: ${active ? roles.onPrimary : roles.onPc};`);
        }
    }

    paintRoot() {
        const roles = this.host.theme.roles;
        const pad = this.px(8);
        this.body.set_style(`spacing: ${this.px(8)}px;`);
        const look = this.tileStyle(roles.highest, this.px(32), this.host.barAlpha);
        this.spaces.set_style(`padding: ${pad}px; spacing: 2px;`);
        this.middle.set_style(`padding: ${pad}px; spacing: ${this.px(4)}px;`);
        this.bar(this.spaces, look);
        this.bar(this.middle, look);
        // Show apps is a part of its own: its shape is the whole part.
        this.apps.set_style(`spacing: ${this.px(2)}px;`);
        this.ends.set_style(`spacing: ${this.px(2)}px;`);
        if (this.host.vertical)
            this.separator.set_size(this.px(36), 1);
        else
            this.separator.set_size(1, this.px(36));
        this.separator.set_style(`background-color: ${roles.outVar};`);
        this.separator.x_align = Clutter.ActorAlign.CENTER;
        this.separator.y_align = Clutter.ActorAlign.CENTER;
        if (this.snapshot)
            this._paintSpaces();
    }

    paint(button) {
        super.paint(button);
        if (button.kind !== 'app')
            return;
        const active = this.snapshot.activeWorkspace;
        const here = button.item.windows.some(window => window.get_workspace()?.index() === active || window.is_on_all_workspaces());
        button.opacity = here ? 255 : ELSEWHERE_OPACITY;
    }
}
