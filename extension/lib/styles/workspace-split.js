// Workspace split: three floating parts. The workspaces as segmented
// buttons, the apps (those with no window on this workspace fade back),
// and a large Show apps.

import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import St from 'gi://St';

import {shownWorkspaces} from '../layout.js';
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
        this.middle.add_child(this.apps);
        this.middle.add_child(this.separator);
        this.middle.add_child(this.ends);
        this.right = new St.Bin({style_class: 'harbor-split-part harbor-floating'});
        root.add_child(this.spaces);
        root.add_child(this.middle);
        root.add_child(this.right);
        this._spaceKey = '';
        return root;
    }

    get showAppsSize() {
        return this.px(72);
    }

    get showAppsRadius() {
        return this.px(24);
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
        const [w, h] = vertical ? [this.px(56), this.px(44)] : [this.px(44), this.px(56)];
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
        const part = `${this.tileStyle(roles.highest, this.px(32), this.host.barAlpha)} padding: ${pad}px;`;
        this.spaces.set_style(`${part} spacing: 2px;`);
        this.middle.set_style(`${part} spacing: ${this.px(6)}px;`);
        // Show apps is a part of its own; its tile is the whole part.
        this.right.set_style(`border-radius: ${this.showAppsRadius}px;`);
        this.apps.set_style(`spacing: ${this.px(6)}px;`);
        this.ends.set_style(`spacing: ${this.px(6)}px;`);
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
