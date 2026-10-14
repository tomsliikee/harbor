// Everything Harbor says, as plain functions of plain data.

export function plural(count, one, many = `${one}s`) {
    return `${count} ${count === 1 ? one : many}`;
}

export const windows = count => plural(count, 'window');

export function badge(count) {
    return count > 99 ? '99+' : `${Math.max(0, Math.round(count))}`;
}

export function percent(share) {
    return `${Math.round(Math.max(0, Math.min(1, share)) * 100)} %`;
}

// The app with the most windows; a tie goes to the one used last.
// apps: [{name, windows, lastUsed}]
export function busiest(apps) {
    let best = null;
    for (const app of apps) {
        if (app.windows < 1)
            continue;
        if (!best || app.windows > best.windows || (app.windows === best.windows && app.lastUsed > best.lastUsed))
            best = app;
    }
    return best;
}

export function mostSentence(apps) {
    const app = busiest(apps);
    return app ? `${app.name} has the most: ${app.windows}` : 'Nothing open right now';
}

export function acrossLine(appCount, workspaceCount) {
    return `across ${plural(appCount, 'app')} on ${plural(workspaceCount, 'workspace')}`;
}

export function peekCaption(windowCount, appCount) {
    return `${windowCount === 1 ? 'window' : 'windows'} in ${plural(appCount, 'app')}`;
}

export function mostLine(apps) {
    const app = busiest(apps);
    return app ? `${app.name}, ${app.windows}` : 'None';
}

export const DOCK_STATES = {showing: 'Showing', 'making-room': 'Making room', hidden: 'Hidden'};

export function workspaceLine(index, focused = false) {
    return `Workspace ${index + 1}${focused ? ' · focused' : ''}`;
}

export function workspaceTip(index, windowCount) {
    return `Workspace ${index + 1} · ${windows(windowCount)}`;
}
