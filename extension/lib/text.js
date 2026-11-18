// Labels set in a type role of the design system.
//
// St's CSS cannot reach the axes of a variable font (width, roundness,
// slant), so the role is applied as a Pango font description instead of
// through the stylesheet.

import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';
import St from 'gi://St';

const FAMILY = 'Google Sans Flex';
// The calm, friendly end of the design system's roundness dial.
const ROUNDNESS = 100;
const PX_TO_PT = 0.75;

export const ROLES = {
    'metric-l': {size: 34, weight: 800, width: 112, tabular: true},
    'metric-m': {size: 28, weight: 800, width: 112, tabular: true},
    'metric-s': {size: 22, weight: 700, width: 106, tabular: true},
    'badge-number': {size: 12, weight: 800, width: 112, tabular: true},
    'title-row': {size: 14, weight: 700},
    'body': {size: 14, weight: 400},
    'body-medium': {size: 14, weight: 500},
    'body-strong': {size: 14, weight: 700},
    'label': {size: 12, weight: 450, width: 88},
    'aside': {size: 12, weight: 400, slant: -10},
    'nav-label': {size: 15, weight: 800, width: 112},
    'segment': {size: 13, weight: 600},
};

// The font description of a role; size is in pixels, scaled by the role
// when a style draws larger or smaller than the 48 px base.
export function descriptionFor(role, scale = 1) {
    const spec = ROLES[role] ?? ROLES.body;
    const description = Pango.FontDescription.from_string(FAMILY);
    // Points, not pixels, so the text follows the desktop's text scaling.
    description.set_size(Math.round(spec.size * scale * PX_TO_PT * Pango.SCALE));
    const axes = [`wght=${spec.weight}`, `wdth=${spec.width ?? 100}`, `ROND=${ROUNDNESS}`];
    if (spec.slant)
        axes.push(`slnt=${spec.slant}`);
    description.set_variations(axes.join(','));
    return description;
}

function apply(label, role, scale) {
    // A label that is being torn down is not styled or drawn again.
    if (label._harborGone || !label.clutter_text)
        return;
    // A font description, not an attribute list: Clutter copies it, so
    // nothing the label draws with is owned by JS. Attribute lists built
    // from JS were freed under the paint and crashed the shell (SIGSEGV in
    // pango_attr_list_copy). The label keeps St's own colour this way.
    const description = descriptionFor(role, scale);
    if (ROLES[role]?.tabular)
        description.set_features('tnum=1');
    label.clutter_text.set_font_description(description);
}

// Sets a role on an existing label and keeps it there: St sets the font
// from the stylesheet whenever the style is recomputed.
export function applyTextRole(label, role, scale = 1) {
    label._harborRole = {role, scale};
    apply(label, role, scale);
    if (!label._harborRoleWatch) {
        label._harborRoleWatch = label.connect_after('style-changed',
            () => apply(label, label._harborRole.role, label._harborRole.scale));
        label.connect('destroy', () => {
            label._harborGone = true;
            label._harborRoleWatch = 0;
        });
    }
}

export function text(role, {styleClass = '', expand = false, wrap = false, ellipsize = false, scale = 1, text: content = ''} = {}) {
    const label = new St.Label({
        style_class: styleClass,
        text: content,
        x_expand: expand,
        y_align: Clutter.ActorAlign.CENTER,
    });
    applyTextRole(label, role, scale);
    if (wrap) {
        label.clutter_text.line_wrap = true;
        label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
    } else if (ellipsize) {
        label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
    }
    return label;
}
