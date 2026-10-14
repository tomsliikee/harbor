// What the dock, the top bar and the menu show, gathered in one place:
// pinned and running apps, their windows, focus, workspaces and attention.
// It listens to the shell and reports at most once per frame.

import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import {EventEmitter} from 'resource:///org/gnome/shell/misc/signals.js';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';

import {toneFor} from './layout.js';

// Windows a person would call "open": normal ones that do not ask to stay
// out of task lists. Dialogs belong to the window that opened them.
export function countable(window) {
    return !window.skip_taskbar && window.get_window_type() === Meta.WindowType.NORMAL;
}

export function windowsOf(app) {
    return app.get_windows().filter(countable);
}

export function wantsAttention(window) {
    return window.demands_attention || window.urgent;
}

export class Model extends EventEmitter {
    constructor() {
        super();
        this._appSystem = Shell.AppSystem.get_default();
        this._tracker = Shell.WindowTracker.get_default();
        this._favorites = AppFavorites.getAppFavorites();
        this._lastUsed = new Map();
        this._pending = 0;
        this._geometry = 0;
        this._windowSignals = new Map();
        this.snapshot = null;

        this._appSystem.connectObject(
            'app-state-changed', () => this.queue(),
            'installed-changed', () => this.queue(), this);
        this._favorites.connectObject('changed', () => this.queue(), this);
        this._tracker.connectObject(
            'notify::focus-app', () => this._focusChanged(),
            'tracked-windows-changed', () => this.queue(), this);
        global.display.connectObject(
            'window-created', (_display, window) => this._watch(window),
            'window-demands-attention', () => this.queue(),
            'window-marked-urgent', () => this.queue(),
            'window-entered-monitor', () => this.queue(),
            'window-left-monitor', () => this.queue(), this);
        global.workspace_manager.connectObject(
            'active-workspace-changed', () => this.queue(),
            'workspace-added', () => this.queue(),
            'workspace-removed', () => this.queue(), this);
        for (const actor of global.get_window_actors())
            this._watch(actor.meta_window);
        this._focusChanged();
        this.snapshot = this._gather();
    }

    // Asks for a new snapshot before the next frame; many signals in one
    // frame make one snapshot.
    queue() {
        if (this._pending)
            return;
        const laters = global.compositor.get_laters();
        this._pending = laters.add(Meta.LaterType.BEFORE_REDRAW, () => {
            this._pending = 0;
            this.snapshot = this._gather();
            this.emit('changed', this.snapshot);
            return false;
        });
    }

    destroy() {
        if (this._pending)
            global.compositor.get_laters().remove(this._pending);
        if (this._geometry)
            global.compositor.get_laters().remove(this._geometry);
        this._pending = 0;
        this._geometry = 0;
        for (const window of this._windowSignals.keys())
            window.disconnectObject(this);
        this._windowSignals.clear();
        this._appSystem.disconnectObject(this);
        this._favorites.disconnectObject(this);
        this._tracker.disconnectObject(this);
        global.display.disconnectObject(this);
        global.workspace_manager.disconnectObject(this);
        this.disconnectAll();
    }

    _watch(window) {
        if (this._windowSignals.has(window))
            return;
        this._windowSignals.set(window, true);
        window.connectObject(
            'unmanaged', () => {
                window.disconnectObject(this);
                this._windowSignals.delete(window);
                this.queue();
            },
            'workspace-changed', () => this.queue(),
            'notify::minimized', () => this.queue(),
            'notify::title', () => this.queue(),
            'notify::demands-attention', () => this.queue(),
            'notify::urgent', () => this.queue(),
            'notify::skip-taskbar', () => this.queue(),
            'position-changed', () => this._queueGeometry(),
            'size-changed', () => this._queueGeometry(),
            'notify::maximized-vertically', () => this._queueGeometry(), this);
        this.queue();
    }

    // Windows that only move tell the docks, not everyone.
    _queueGeometry() {
        if (this._geometry)
            return;
        this._geometry = global.compositor.get_laters().add(Meta.LaterType.BEFORE_REDRAW, () => {
            this._geometry = 0;
            this.emit('geometry');
            return false;
        });
    }

    _focusChanged() {
        const app = this._tracker.focus_app;
        if (app)
            this._lastUsed.set(app.get_id(), Date.now());
        this.queue();
    }

    _entry(app, pinned, focusApp) {
        const windows = windowsOf(app);
        const id = app.get_id();
        return {
            app,
            id,
            name: app.get_name(),
            pinned,
            running: app.state !== Shell.AppState.STOPPED,
            windows,
            focused: app === focusApp,
            tone: toneFor(id),
            attention: windows.some(wantsAttention),
            lastUsed: this._lastUsed.get(id) ?? 0,
        };
    }

    _gather() {
        const focusApp = this._tracker.focus_app;
        const pinned = this._favorites.getFavorites();
        const pinnedIds = new Set(pinned.map(app => app.get_id()));
        const running = this._appSystem.get_running().filter(app => !pinnedIds.has(app.get_id()));
        const apps = [
            ...pinned.map(app => this._entry(app, true, focusApp)),
            ...running.map(app => this._entry(app, false, focusApp)),
        ];

        const manager = global.workspace_manager;
        const counts = new Array(manager.n_workspaces).fill(0);
        let windowCount = 0;
        for (const entry of apps) {
            for (const window of entry.windows) {
                windowCount++;
                const workspace = window.get_workspace();
                if (workspace && !window.is_on_all_workspaces())
                    counts[workspace.index()]++;
            }
        }
        const withWindows = apps.filter(entry => entry.windows.length > 0);
        return {
            apps,
            focusApp,
            windowCount,
            appCount: withWindows.length,
            workspaceCounts: counts,
            usedWorkspaces: counts.filter(count => count > 0).length,
            activeWorkspace: manager.get_active_workspace_index(),
            attention: apps.some(entry => entry.attention),
        };
    }
}
