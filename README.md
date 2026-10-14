<div align="center">
  <h1>Harbor</h1>
  <p><strong>A dock for GNOME Shell in Toms Expressive Design: pinned and running apps in eleven styles, with its settings in the top bar instead of a window.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Platform-GNOME%20Shell%2050-neutral?style=flat-square" alt="Platform" />
    <img src="https://img.shields.io/badge/Session-Wayland-neutral?style=flat-square" alt="Session" />
    <img src="https://img.shields.io/badge/Language-GJS%20(ES%20modules)-neutral?style=flat-square" alt="Language" />
    <img src="https://img.shields.io/badge/Design-Toms%20Expressive%20Design-neutral?style=flat-square" alt="Design Language" />
    <img src="https://img.shields.io/badge/Dependencies-None-neutral?style=flat-square" alt="No Dependencies" />
    <img src="https://img.shields.io/badge/Telemetry-None-neutral?style=flat-square" alt="No Telemetry" />
    <img src="https://img.shields.io/badge/License-MIT-neutral?style=flat-square" alt="License" />
  </p>
</div>

---

![The dock and the menu, dark on the left and light on the right](readmestuff/hero.png)

**Harbor** is a whole dock on its own. It needs nothing from **Dash to Dock** or any other extension, only **GNOME Shell 50**, so Dash to Dock can be switched off once Harbor runs.

It decides most things by itself: what a click does, how opaque the bar is, when it gets out of the way, and how large its icons can be on your screen. What is left to choose sits in the top bar menu, behind a chevron. Each choice takes effect at once.

Harbor sends no notifications, reads nothing from the network and keeps one small settings file.

---

## Features

- **Eleven Styles:** From a floating bar to pebbles, an edge-to-edge rail or a split by workspace (see [The Styles](#the-styles)).
- **Pinned and Running:** Pinned apps first, then apps that run without being pinned, then drives, the trash and **Show apps**.
- **Clicks That Adapt:** One click starts, focuses or minimises; an app with several windows shows a **window list** instead of pictures of windows.
- **Making Room:** The dock steps aside when a window comes close and returns when you push the pointer against the edge.
- **Status on the Icons:** Unread counts, a progress ring, a warning colour when an app wants attention, and a small wave while an app plays music.
- **Drag to Arrange:** Drag an icon along the dock to move it, out of the dock to unpin it, or from the app grid into the dock to pin it.
- **Right-Click Menu:** The app's own actions, a new window, pin or unpin, and quit, laid out like the rest of Harbor.
- **A Mark in the Top Bar:** Two app tiles on a shelf and the number of open windows. Resting the pointer on it shows a small look; a click opens the menu.
- **Every Monitor:** One dock per screen if you want it, each marking the windows on its own screen.
- **Five Colour Styles:** **Blue**, **violet**, **green**, **orange** and **pink**, each in light and dark.
- **Light, Dark and Motion:** Harbor follows GNOME's colour scheme and its animation switch while it runs.

---

## The Styles

![All eleven styles at the bottom of the screen](readmestuff/styles.png)

| Style | What it looks like | What is special |
| :--- | :--- | :--- |
| **Floating bar** | A rounded bar floating above the edge | The default. Apps rest on tiles in their own tone. |
| **Shape stage** | A pill; every app stands on a shape | The shape is the run indicator: a circle while closed, more points with more windows. |
| **Grouped block** | Three named groups instead of one bar | The focused app's segment turns fully round and fills with the primary colour. |
| **Expressive rail** | A rail along the whole edge | The focused app unfolds into a pill with its name. Always keeps its room unless set to **Hide**. |
| **Status** | The floating bar | Status is said out loud: "64 % downloaded", "Wants attention", even with **Counts on icons** off. |
| **Quiet handle** | A compact bar, one size smaller | When the dock is away, a thin handle stays at the edge. |
| **Loud tile** | The floating bar led by a large tile | The tile shows the focused app with its window count; without one, all open windows. |
| **Mono container** | A round bar in one colour | Every icon in one colour; closed apps fade back. |
| **Window list** | The floating bar | An app's window list opens as soon as the pointer rests on it. |
| **Pebbles** | No bar; every app floats on its own | Pebbles near the pointer grow; the one under it turns into a cookie and shows its name. |
| **Workspace split** | Three floating parts | Workspaces as buttons; apps without a window on this workspace fade back. |

Every style works at the **left**, **bottom** and **right** edge (*tested* in the headless shell, light and dark).

---

## The Menu and the Top Bar

![The menu closed, with the settings open, and in green and dark](readmestuff/menu.png)

- **Open Windows:** The one loud tile: how many windows are open, across how many apps and workspaces, and which app has the most.
- **Running Now:** Every running app with its window count; a dot marks the focused one. A click acts like a click in the dock.
- **Pinned to the Dock:** The pinned apps as small icons.
- **Settings:** Behind the chevron at the bottom, closed again whenever the menu opens.

![The look on hover, and the mark while the dock is away](readmestuff/topbar.png)

| Mark | Meaning |
| :--- | :--- |
| **Filled shelf** | The dock shows. |
| **Outlined shelf** | A window keeps the dock away, or it is set to hide. |
| **Yellow mark and number** | An app wants attention. Nothing else is sent. |

---

## Settings

| Setting | Choices (default in bold) | What it does |
| :--- | :--- | :--- |
| **Dock style** | **Floating bar**, Shape stage, Grouped block, Expressive rail, Status, Quiet handle, Loud tile, Mono container, Window list, Pebbles, Workspace split | How the dock looks. Four styles show first; the rest unfold. |
| **Where the dock sits** | Left, **Bottom**, Right | The screen edge. |
| **Icon size** | Small 40, **Medium 48**, Large 56, Huge 64 | The size of the app icons; everything in a style scales with it. |
| **When a window comes close** | Stay, **Make room**, Hide | **Stay** keeps the dock and its room; windows maximise up to it. **Make room** steps aside while a window overlaps it. **Hide** stays away until you need it. |
| **Trash and drives** | **On**, Off | Shows the trash and plugged-in or network drives at the end of the dock. |
| **Counts on icons** | **On**, Off | Shows unread counts, progress and attention that apps report. |
| **Every monitor** | On, **Off** | One dock on each screen instead of only the main one. |
| **Colour** | **Blue**, Violet, Green, Orange, Pink | The colour style of the dock and the menus. |

The settings live in **`~/.config/harbor/settings.json`**. A value Harbor does not know falls back to its default on its own; a broken file costs nothing but the broken values (*tested*).

---

## What Harbor Decides by Itself

These are not settings, on purpose. If one of them is wrong for you, the fix belongs in the code.

| Situation | What happens |
| :--- | :--- |
| **Click on an app that is closed** | It starts. |
| **Click on an app that runs, but not in front** | Its last used window comes forward. |
| **Click on the focused app with one window** | The window minimises. |
| **Click on the focused app with several windows** | The window list opens. |
| **Middle click** | A new window. |
| **Mouse wheel over an app** | Goes through that app's windows. |
| **Opacity** | **85 %** over the desktop, **100 %** while a window is maximised or the dock covers one. |
| **A window comes close** | With **Make room**, the dock leaves in **200 ms** and comes back when the window has gone. |
| **Pointer pushed against the edge** | The dock returns, and leaves again **0.5 s** after the pointer does. GNOME's own push strength for the hot corner is used. |
| **Fullscreen** | The dock is gone. |
| **Overview** | Harbor stays, and GNOME's own dash steps aside. |
| **Too many apps for the edge** | The icons get smaller step by step, and grow back when there is room again. |
| **Hover delays, run indicator, Show apps size, Super + 1 to 9** | Fixed. Super + 1 to 9 stays GNOME's. |

---

## Where Status Comes From

| Status | Source |
| :--- | :--- |
| **Unread counts, progress, urgency** | The **`com.canonical.Unity.LauncherEntry`** D-Bus signal, the same one Dash to Dock reads. Apps that do not send it show nothing; Harbor does not count notifications for them. |
| **Wants attention** | The window asks for it (`demands-attention` or `urgent`), or the app reports urgency. |
| **Music playing** | An **MPRIS** player whose desktop entry belongs to the app reports **Playing**. |

![Progress ring, counts, attention, music, and the window list](readmestuff/status.png)

---

## Installation

```bash
git clone https://github.com/tomsliikee/harbor.git
cd harbor
./install.sh
```

The script links the extension, installs **Google Sans Flex** if it is missing, enables Harbor, and offers to switch **Dash to Dock** off. GNOME Shell under Wayland loads a new extension only at the next login, so log out and back in.

```bash
./install.sh --remove
```

removes the link and disables Harbor; the settings file stays.

---

## Architecture

```mermaid
flowchart TD
    subgraph Shell ["GNOME Shell"]
        Apps["Shell.AppSystem & WindowTracker<br/><b>apps, windows, focus</b>"]
        Favs["AppFavorites<br/><b>pinned apps</b>"]
        Bus["Session bus<br/><b>LauncherEntry & MPRIS</b>"]
        Vol["Gio.VolumeMonitor<br/><b>drives & trash</b>"]
    end

    subgraph Harbor ["Harbor"]
        Model["Model<br/><b>one snapshot per frame</b>"]
        Status["Status<br/><b>counts, progress, music</b>"]
        Theme["ThemeController<br/><b>colour × light/dark × motion</b>"]
        Settings["SettingsStore<br/><b>settings.json, watched</b>"]
        Docks["Docks<br/><b>one per monitor</b>"]
        Style["Dock style<br/><b>one of eleven</b>"]
        Top["Top bar mark & menu"]
    end

    Apps --> Model
    Favs --> Model
    Bus --> Status
    Vol --> Docks
    Model --> Docks
    Model --> Top
    Status --> Style
    Settings --> Theme
    Settings --> Docks
    Theme --> Style
    Theme --> Top
    Docks --> Style
```

Colours come from **`extension/lib/palettes.js`**: each style is Material 3's **SchemeVibrant** of one seed. Structure is in **`tools/stylesheet.template.css`**, written once per colour and scheme into **`extension/stylesheet.css`** by **`gjs -m tools/build-stylesheet.js`**. Text is set through **Pango** attributes, because St cannot reach the axes of a variable font.

---

## Development

| Task | Command |
| :--- | :--- |
| **Unit tests** | `for t in tests/*.test.js; do gjs -m "$t"; done` |
| **Stylesheet** | `gjs -m tools/build-stylesheet.js` |
| **Headless shell** | `tools/headless/run.sh <script> [seconds]` with a script from **`tools/headless/scripts`**; screenshots land in **`$TMPDIR/harbor-headless`** |
| **Two monitors** | `HARBOR_MONITORS=2 tools/headless/run.sh lifecycle` |
| **Beside other extensions** | `HARBOR_WITH="tally@thomashaiden=$HOME/git/tally/extension" tools/headless/run.sh lifecycle` |

---

## Status of This Version

| Area | Evidence |
| :--- | :--- |
| **Settings, shapes, words, layout rules** | ***Tested:*** 35 unit tests. |
| **All eleven styles at three edges, light and dark** | ***Tested*** in the headless shell by screenshot. |
| **Clicks, right-click menu, window list, pinning by drop, making room** | ***Tested*** in the headless shell with a virtual pointer. |
| **The push against the edge, the room kept by Stay and the rail** | ***Built.*** Coming back was tested by calling it; the barrier and the reserved room were not measured. |
| **Two monitors, overview, switching off and on through every style** | ***Tested*** in the headless shell, beside **Tally**, **Ember** and **Torch**, without errors. |
| **Dragging with a real mouse, the app grid as a drag source** | ***Built.*** The drop itself is tested; a real drag is not. |
| **Real LauncherEntry and MPRIS senders** | ***Built.*** Tested with states handed in by the test script. |
| **A real session after login, real second monitor** | ***Planned:*** not yet run outside the headless shell. |

---

## Decisions Made While Building

- **Colours through one stylesheet class per scheme, not only `set_style()`:** St has no CSS variables, so the stylesheet is written once per colour and scheme and a colour change swaps one class. Hover and focus states keep working this way. Values that scale or animate are set in code.
- **Real icons on tone tiles:** Each app sits on a tile in **primary**, **secondary** or **tertiary container**, chosen from its app id, so an app keeps its colour wherever it moves.
- **A list of styles in the menu:** Eleven styles do not fit segmented buttons; four rows show first, the chosen one always among them.
- **No notification when pinning:** Pinning from the dock uses the shell's quiet calls; the change is in front of you anyway.
- **The empty last workspace is hidden** in **Workspace split**, unless it is the active one.
- **Show apps is a pebble too** in **Pebbles**, as are the drives and the trash.
- **The icons shrink by themselves** when the dock would not fit its edge, the way Dash to Dock does it; it is not a setting.
- **A side dock leaves out long text:** the loud tile shows only its number, and the group names of **Grouped block** are hidden at the left and right edge.
- **Pills that reach beyond the dock** (status sentences, the rail's pill, pebble names) live on a layer that asks for no room, so the dock keeps its own size.

---

## License

MIT, see **[LICENSE](LICENSE)**. Google Sans Flex is under the SIL Open Font License, see **`toms-expressive-design/fonts/OFL.txt`**.
