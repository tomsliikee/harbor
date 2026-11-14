// A blur behind the dock's bars, drawn by Blur My Shell while it is enabled.
//
// Harbor paints no blur of its own: it borrows Blur My Shell's pipeline
// (the one chosen for applications, as Lantern does, liquid glass
// included) and its rounded corners. Without Blur My Shell nothing here is
// made. This reaches into Blur My Shell's modules, which are not an API: if
// they change shape, the blur is left out and Harbor carries on.

import Gio from 'gi://Gio';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {EventEmitter} from 'resource:///org/gnome/shell/misc/signals.js';

const UUID = 'blur-my-shell@aunetx';
const WINDOWS_SCHEMA = 'org.gnome.shell.extensions.blur-my-shell.applications';
// ExtensionState.ENABLED, as Blur My Shell itself compares it.
const ENABLED = 1;
// All four corners, in Blur My Shell's corner policy.
const ALL_CORNERS = 0;

// Whether Blur My Shell is there to blur, and what it would blur with.
// One for all docks; emits "changed" when any of it changes.
export class BlurMyShell extends EventEmitter {
    constructor() {
        super();
        this._pipelineClass = null;
        this._windows = null;
        // Bumped on every change, so a slow import cannot land late.
        this._generation = 0;
        Main.extensionManager.connectObject('extension-state-changed', (_m, extension) => {
            if (extension.uuid === UUID)
                this._sync();
        }, this);
        this._sync();
    }

    get available() {
        return Boolean(this._pipelineClass && global.blur_my_shell?._effects_manager);
    }

    // The pipeline for a dock in "light" or "dark": Blur My Shell's own
    // choice for applications (where liquid glass is picked), per scheme
    // when its auto mode is on. Its Dash to Dock choice is left alone: it
    // is a plain blur unless changed, and Dash to Dock is off anyway.
    pipelineFor(scheme) {
        const settings = this._windows;
        if (!settings)
            return 'pipeline_default';
        if (settings.get_boolean('pipeline-auto-mode'))
            return settings.get_string(scheme === 'light' ? 'pipeline-light' : 'pipeline-dark') || 'pipeline_default';
        return settings.get_string('pipeline') || 'pipeline_default';
    }

    // The opacity Blur My Shell gives windows, from 0 to 1.
    get opacity() {
        const value = this._windows?.get_int('opacity') ?? 255;
        return Math.min(255, Math.max(0, value)) / 255;
    }

    // A new pipeline on `container` and the actor it draws into, or nulls
    // while there is none to have.
    makePipeline(container, scheme, radius) {
        if (!this.available)
            return [null, null];
        const bms = global.blur_my_shell;
        const pipeline = new this._pipelineClass(bms._effects_manager, bms._pipelines_manager, this.pipelineFor(scheme), {
            corner_radius: radius,
            get_corners: () => ALL_CORNERS,
        });
        const actor = pipeline.attach_to_container(container, 'harbor-blur');
        return [pipeline, actor];
    }

    _sync() {
        const extension = Main.extensionManager.lookup(UUID);
        if (extension?.state === ENABLED && global.blur_my_shell) {
            this._load(extension).catch(error => {
                console.warn(`Harbor: no blur from Blur My Shell: ${error.message}`);
                this._drop();
            });
        } else {
            this._drop();
        }
    }

    async _load(extension) {
        if (this._pipelineClass)
            return;
        const generation = ++this._generation;
        const uri = extension.dir.resolve_relative_path('render/dynamic_surface.js').get_uri();
        const {DynamicPipeline} = await import(uri);
        if (generation !== this._generation || this._pipelineClass)
            return;
        if (typeof DynamicPipeline !== 'function')
            throw new Error('render/dynamic_surface.js has no DynamicPipeline');
        const source = this._schemaSource(extension);
        this._windows = this._open(source, WINDOWS_SCHEMA);
        for (const key of ['opacity', 'pipeline', 'pipeline-auto-mode', 'pipeline-light', 'pipeline-dark'])
            this._windows?.connectObject(`changed::${key}`, () => this.emit('changed'), this);
        this._pipelineClass = DynamicPipeline;
        this.emit('changed');
    }

    // Blur My Shell's schemas ship with the extension, not in the system.
    _schemaSource(extension) {
        const dir = extension.dir.get_child('schemas');
        const parent = Gio.SettingsSchemaSource.get_default();
        return dir.query_exists(null)
            ? Gio.SettingsSchemaSource.new_from_directory(dir.get_path(), parent, false)
            : parent;
    }

    _open(source, id) {
        const schema = source?.lookup(id, true);
        return schema ? new Gio.Settings({settings_schema: schema}) : null;
    }

    _drop() {
        this._generation++;
        this._windows?.disconnectObject(this);
        this._windows = null;
        const had = Boolean(this._pipelineClass);
        this._pipelineClass = null;
        if (had)
            this.emit('changed');
    }

    destroy() {
        Main.extensionManager.disconnectObject(this);
        this._drop();
        this.disconnectAll();
    }
}

// The blur behind one bar: a layer just below the bar's stand-in that
// follows its place, size, corners, visibility and fade.
export class BarBlur {
    // ghost: the bar's stand-in (see Style.bar); scheme: 'light' | 'dark'.
    constructor(blur, ghost, scheme) {
        this._ghost = ghost;
        this.holder = new St.Widget({reactive: false});
        ghost.get_parent().insert_child_below(this.holder, ghost);
        this._pipelineId = blur.pipelineFor(scheme);
        [this._pipeline, this._actor] = blur.makePipeline(this.holder, scheme, this._radius());
        // Only the fade comes from the bar's own signals; place, size and
        // corners come from follow(), called where the bar is placed,
        // because a bar's position and style are notified while it is laid
        // out, too late to move anything in that frame.
        this._radiusNow = null;
        this._ghostIds = [ghost.connect('notify::opacity', () => (this.holder.opacity = ghost.opacity))];
        this.follow();
    }

    // Takes the bar's place, size, visibility, fade and corners.
    follow() {
        const ghost = this._ghost;
        // What the bar was given, not what it was last laid out at.
        this.holder.set_position(ghost.fixed_x, ghost.fixed_y);
        this.holder.set_size(ghost.natural_width, ghost.natural_height);
        // Blur My Shell sizes its actor when the holder is laid out, which
        // is too late for that frame; given the same size now, its own
        // call changes nothing.
        this._actor?.set_size(Math.max(1, ghost.natural_width), Math.max(1, ghost.natural_height));
        this.holder.visible = ghost.visible;
        this.holder.opacity = ghost.opacity;
        const radius = this._radius();
        if (radius !== this._radiusNow) {
            this._radiusNow = radius;
            this._pipeline?.set_corner_radius(radius);
        }
    }

    // The bar's corners as they are now (a pill while it spreads).
    _radius() {
        return this._ghost.rounded ?? this._ghost.radius ?? 0;
    }

    setPipeline(id) {
        if (id === this._pipelineId)
            return;
        this._pipelineId = id;
        this._pipeline?.change_pipeline_to(id);
    }

    destroy() {
        for (const id of this._ghostIds)
            this._ghost.disconnect(id);
        this._ghostIds = [];
        // Blur My Shell may already have torn its effects down.
        try {
            this._pipeline?.destroy();
        } catch (error) {
            console.warn(`Harbor: blur teardown: ${error.message}`);
        }
        this._pipeline = null;
        this._actor = null;
        this.holder.destroy();
    }
}
