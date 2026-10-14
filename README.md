<div align="center">
  <h1>Harbor</h1>
  <p><strong>A dock for GNOME Shell in Toms Expressive Design: pinned and running apps in ten styles, with its settings in the top bar instead of a window.</strong></p>

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

It decides most things by itself: what a click does, when it gets out of the way, and how large its icons can be on your screen. What is left to choose sits in the top bar menu, behind a chevron. Each choice takes effect at once.

Harbor sends no notifications, reads nothing from the network and keeps one small settings file.

---

## Features

- **Eleven Styles:** From a floating bar to pebbles, an edge-to-edge rail or a split by workspace (see [The Styles](#the-styles)).
- **Pinned and Running:** Pinned apps first, then apps that run without being pinned, then drives, the trash and **Show apps**.
- **Symbols on Round Tiles:** Every app rests on a round tile with a flat symbol in one colour: brand logos for apps like **Firefox**, **Claude** or **LibreOffice**, Material symbols for the rest. Closed apps share one quiet colour, running apps show their own tone, and the focused app is a black square (white in dark mode) that glides from app to app (see [Symbols](#symbols)).
- **Expressive Motion:** The handle rises and swells into the dock, which spreads to both sides with a swing, and lets the icons pop up from the middle outwards (see [Motion](#motion)).
- **Clicks That Adapt:** One click starts, focuses or minimises; an app with several windows shows a **window list** instead of pictures of windows.
- **Making Room:** The dock steps aside when a window of the app in front comes close, and returns when the pointer rests on the edge. A thin handle can stay behind, per style: white, and black only on white or nearly white ground.
- **Status on the Icons:** Unread counts that pop and count up, a progress ring, a wiggle and a warning colour when an app wants attention, and a small wave while an app plays music.
- **Minimise Into the Icon:** A window minimises into its app's icon in the dock.
- **Drag to Arrange:** Drag an icon along the dock to move it, out of the dock to unpin it, or from the app grid into the dock to pin it.
- **Right-Click Menu:** The app's own actions, a new window, pin or unpin, quit, and **Change symbol**, laid out like the rest of Harbor.
- **A Mark in the Top Bar:** Two app tiles on a shelf and the number of open windows. Resting the pointer on it shows a small look; a click opens the menu.
- **Every Monitor:** One dock per screen if you want it, each marking the windows on its own screen.
- **Five Colour Styles:** **Blue**, **violet**, **green**, **orange** and **pink**, each in light and dark.
- **Light, Dark and Motion:** Harbor follows GNOME's colour scheme and its animation switch while it runs.

---

## The Styles

![All ten styles at the bottom of the screen](readmestuff/styles.png)

| Style | What it looks like | What is special |
| :--- | :--- | :--- |
| **Floating bar** | A rounded bar floating above the edge | The default. The focused app's tile is an ink square that glides from app to app; the run line hangs under the tiles in the bar's padding. |
| **Extended bar** | The floating bar | Says more: status in words above an app ("64 % downloaded", "Wants attention", even with **Counts on icons** off), and an app's window list opens as soon as the pointer rests on it. |
| **Shape stage** | A pill; every app stands on a shape | The shape is the run indicator: a circle while closed, more points with more windows. |
| **Grouped block** | Three named groups instead of one bar | The focused app's segment turns fully round and fills with ink (or primary, with **Ink focus** off). |
| **Expressive rail** | A rail along the whole edge | The focused app unfolds into a pill with its name. Always keeps its room unless set to **Hide**. |
| **Quiet handle** | A compact, calmer bar | Less padding and softer corners; made for a dock that is often away. |
| **Loud tile** | The floating bar led by a large tile | The tile shows the focused app with its window count; without one, all open windows. |
| **Mono container** | A round bar in one colour | Symbols stand free, without tiles, always in one colour; closed apps fade back; a primary circle glides behind the focused app. |
| **Pebbles** | No bar; every app floats on its own | Pebbles near the pointer grow; the one under it turns into a cookie and shows its name. Pebbles appear one by one. |
| **Workspace split** | Three floating parts | Workspaces as buttons; apps without a window on this workspace fade back. |

Every style works at the **left**, **bottom** and **right** edge (*tested* in the headless shell, light and dark).

---

## The Menu and the Top Bar

![The menu closed, with the settings open, and in green and dark](readmestuff/menu.png)

- **Open Windows:** The one loud tile: how many windows are open, across how many apps and workspaces, and which app has the most.
- **Running Now:** Every running app with its window count; a dot marks the focused one. A click acts like a click in the dock.
- **Pinned to the Dock:** The pinned apps as small tiles with their symbols.
- **Settings:** Behind the chevron at the bottom, closed again whenever the menu opens.

![The look on hover, and the mark while the dock is away](readmestuff/topbar.png)

| Mark | Meaning |
| :--- | :--- |
| **Filled shelf** | The dock shows. |
| **Outlined shelf** | A window keeps the dock away, or it is set to hide. |
| **Yellow mark and number** | An app wants attention. Nothing else is sent. |

---

## Symbols

![The symbol picker in the right-click menu](readmestuff/picker.png)

With **Symbolic icons** on (the default), an app shows the first of these that exists:

| Order | Where it comes from |
| :--- | :--- |
| **1. The symbol you chose** | Right-click the app, **Change symbol**, search, pick. **Automatic** goes back. Kept per app id in **`settings.json`** under **`symbols`**. |
| **2. A shipped symbol that matches the app id** | **297 symbols** in **`extension/symbols`**: 124 brand logos from **Simple Icons** and 173 rounded Material Symbols. `org.mozilla.firefox` finds **Firefox**, `org.gnome.Nautilus` the **folder**, `libreoffice-writer` **LibreOffice Writer**. |
| **3. The icon theme's symbolic icon** | `<icon>-symbolic` from the current icon theme. |
| **4. The app's own icon in one colour** | Tinted, so it still matches the others from a distance. |

With **Symbolic icons** off, the apps' own colour icons rest on the same tiles. Brands that **Simple Icons** does not have (among them **Chromium**, **Slack**, **Kitty** and **OpenAI**) fall back to a generic symbol; the list of symbols and their matching words is in **`tools/symbols.list.js`**.

---

## Settings

| Setting | Choices (default in bold) | What it does |
| :--- | :--- | :--- |
| **Dock style** | **Floating bar**, Extended bar, Shape stage, Grouped block, Expressive rail, Quiet handle, Loud tile, Mono container, Pebbles, Workspace split | How the dock looks. Four styles show first; the rest unfold. The chosen style says in one sentence what it does; resting on a style shows a card with the whole story. |
| **Where the dock sits** | Left, **Bottom**, Right | The screen edge. |
| **Handle when away** | **On**, Off, for each style on its own | A thin grip stays at the edge while the dock is away. It reads the screen beside it every **1.5 s** and is white, or black on white or nearly white ground. |
| **Show on hover** | **On**, Off | Resting on the handle brings the dock; off, it takes a click. |
| **Long handle** | On, **Off** | The handle is **192 px** long instead of **96 px**. |
| **Icon size** | Small 40, **Medium 48**, Large 56, Huge 64 | The size of an app's tile; the symbol on it is half as large. Everything in a style scales with it. |
| **When a window comes close** | Stay, **Make room**, Hide | **Stay** keeps the dock and its room; windows maximise up to it. **Make room** steps aside while a window of the app in front overlaps it. **Hide** stays away until you need it. |
| **Symbolic icons** | **On**, Off | Flat symbols in the dock's colours instead of the apps' own icons (see [Symbols](#symbols)). |
| **Ink focus** | **On**, Off | The focused app is black, in dark mode white; off, it takes the primary colour. |
| **Light dock** | On, **Off** | The dock, its menus and tooltips stay light when the desktop is dark. The top bar menu still follows the desktop. |
| **See-through** | On, **Off** | The bars at **78 %**, as in **Ledge**. |
| **Expressive motion** | **On**, Off | Springs for appearing, going and every state; off, the dock slides as calmly as before. |
| **Speed of motion** | Quick, **Normal**, Slow | About **350**, **500** or **700 ms** for the dock to appear; all motion follows. |
| **Always moving** | On, **Off** | Shapes turn slowly while nothing happens. Rests on battery and while the dock is away. |
| **Trash and drives** | **On**, Off | Shows the trash and plugged-in or network drives at the end of the dock. |
| **Counts on icons** | **On**, Off | Shows unread counts, progress and attention that apps report. |
| **Every monitor** | On, **Off** | One dock on each screen instead of only the main one. |
| **Colour** | **Blue**, Violet, Green, Orange, Pink | The colour style of the dock and the menus. |

The settings live in **`~/.config/harbor/settings.json`**. A value Harbor does not know falls back to its default on its own; a broken file costs nothing but the broken values (*tested*).

One key is not in the menu: **`"debug": true`** writes every decision of the dock (showing, going and why, its place, menus) to the journal:

```bash
journalctl -f -o cat /usr/bin/gnome-shell | grep Harbor
```

---

## Motion

![The floating bar appearing, in slow motion from top to bottom](readmestuff/motion.png)

| Moment | What moves |
| :--- | :--- |
| **Appearing** | The handle rises, swells to the bar's thickness and takes the bar's colour in **240 ms**; as a pill it spreads to both sides past its length and back, and the icons pop up from the middle outwards. Groups of a style (**Workspace split**, **Grouped block**) follow one another. |
| **Going** | The reverse in about two thirds of the time, without swinging: the icons gather in the middle, the bar draws into a pill, and the pill sinks and shrinks into the handle (long or short), taking its colour. With the handle off the same shape fades out at the handle's place; a style without a bar fades the shape in and out instead of showing a pill. |
| **A new style** | It shows itself with its own appearing, even on a dock that is away. |
| **Starting an app** | Its tile breathes between circle and cookie and hops with its symbol, until the window comes (at most **10 s**). |
| **A new or closed app** | Its neighbours move apart and it grows in, or it shrinks and they close up. |
| **Focus** | The ink square glides to the next app, as a cookie on the way, and follows it if it moves. |
| **Hover and click** | The tile morphs into a cookie and lifts **4 px** together with its symbol (the focus square too); a press pushes the tile in and it springs back. |
| **Counts and attention** | A new count pops and counts up; an app that waits wiggles every **4 s** and pulses. |

The springs are Material 3 Expressive's, as in **Ledge**. GNOME's own **Animations** switch turns all of it off.

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
| **A window comes close** | With **Make room**, only the windows of the app in front count, as with Intellihide. The dock leaves and comes back when they have gone. |
| **Pointer resting on the edge** | After **200 ms** on the last pixel row under the dock, it returns; no push needed. It leaves again **0.5 s** after the pointer does. |
| **Resting on the handle** | After **150 ms** the dock returns (with **Show on hover**). |
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
        Symbols["Symbols<br/><b>catalog.json & SVGs</b>"]
        Docks["Docks<br/><b>one per monitor</b>"]
        Style["Dock style<br/><b>one of ten</b>"]
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
    Symbols --> Style
    Symbols --> Top
```

Colours come from **`extension/lib/palettes.js`**: each style is Material 3's **SchemeVibrant** of one seed. Structure is in **`tools/stylesheet.template.css`**, written once per colour and scheme into **`extension/stylesheet.css`** by **`gjs -m tools/build-stylesheet.js`**. Text is set through **Pango** attributes, because St cannot reach the axes of a variable font.

---

## Development

| Task | Command |
| :--- | :--- |
| **Unit tests** | `for t in tests/*.test.js; do gjs -m "$t"; done` |
| **Motion frame by frame** | `HARBOR_ONLY="floating-bar pebbles" tools/headless/run.sh motion 190` |
| **Look switches on a dark desktop** | `HARBOR_SCHEME=dark tools/headless/run.sh look` |
| **Stylesheet** | `gjs -m tools/build-stylesheet.js` |
| **Symbols** | `gjs -m tools/build-symbols.js` fetches the list in **`tools/symbols.list.js`** from **jsDelivr** at fixed versions and writes **`extension/symbols`** |
| **Headless shell** | `tools/headless/run.sh <script> [seconds]` with a script from **`tools/headless/scripts`**; screenshots land in **`$TMPDIR/harbor-headless`** |
| **Two monitors** | `HARBOR_MONITORS=2 tools/headless/run.sh lifecycle` |
| **Beside other extensions** | `HARBOR_WITH="tally@thomashaiden=$HOME/git/tally/extension" tools/headless/run.sh lifecycle` |

---

## Status of This Version

| Area | Evidence |
| :--- | :--- |
| **Settings, shapes, springs, words, layout rules, matching symbols to app ids** | ***Tested:*** 59 unit tests, 26 real app ids among them. |
| **Symbols on tiles in every style, the picker, choosing, Automatic, Symbolic icons off, symbols in the top bar menu** | ***Tested*** in the headless shell (`styles`, `symbols` scripts), light and dark. |
| **Round tiles centred in the bar, ink focus, light dock on a dark desktop, long handle, a hovered tile lifting as one, the handle's colour** | ***Tested*** in the headless shell (`styles` at every edge, `look` script light and dark: white handle over a dark window, black over a light one). |
| **Appearing and going in every style, out of and into the handle, focus gliding, hover, start, attention, counts** | ***Tested*** in the headless shell, frame by frame in slow motion (`motion` script, also with `HARBOR_HANDLES=on`, `HARBOR_LONG=on`, `HARBOR_SIDE=left`). |
| **Make room for the app in front, edge, handle per style, see-through, minimising into the icon** | ***Tested*** in the headless shell (`behave` script). |
| **All ten styles at three edges, light and dark** | ***Tested*** in the headless shell by screenshot. |
| **Clicks, right-click menu, window list, pinning by drop, making room** | ***Tested*** in the headless shell with a virtual pointer. |
| **The edge with a real touchpad, the room kept by Stay and the rail, smoothness on real hardware, Always moving on battery** | ***Built.*** The edge was tested with a virtual pointer; the rest was not measured. |
| **Two monitors, overview, switching off and on through every style** | ***Tested*** in the headless shell, beside **Tally**, **Ember** and **Torch**, without errors. |
| **Dragging with a real mouse, the app grid as a drag source** | ***Built.*** The drop itself is tested; a real drag is not. |
| **Real LauncherEntry and MPRIS senders** | ***Built.*** Tested with states handed in by the test script. |
| **A real session after login, real second monitor, symbols with your own apps and icon theme** | ***Planned:*** not yet run outside the headless shell. |

---

## Decisions Made While Building

- **Colours through one stylesheet class per scheme, not only `set_style()`:** St has no CSS variables, so the stylesheet is written once per colour and scheme and a colour change swaps one class. Hover and focus states keep working this way. Values that scale or animate are set in code.
- **Symbols on tiles, as in the design:** Free colour icons made the dock look like Dash to Dock. Every app rests on a tile in its tone (**primary**, **secondary** or **tertiary container**, chosen from its app id) with a flat symbol; a colour icon on a tile looked cramped, a symbol does not.
- **Round tiles and an ink focus:** After a first try on the laptop the tiles became circles, as round as the shapes around them, and the focused app a black (in dark mode white) square, the strongest mark the dock has. Only running apps carry a tone, so the dock says at a glance what runs.
- **The dock opens out of its handle and closes into it:** a twin of the handle travels between the handle's place and the dock's pill, so handle and dock read as one thing; the bars and items keep their own spring motion after the hand-over.
- **A tile lifts as one:** shape and symbol move together on hover and while an app starts; only the symbol moving looked loose.
- **The handle picks its colour from the screen:** white wherever it can be seen, black on white or nearly white ground (relative luminance above **0.6**), read with the shell's own colour picker.
- **Light dock is a view of the theme, not a second theme:** the dock reads the same colour style with the scheme held at light; the top bar menu keeps following the desktop.
- **Symbols shipped as files, nothing at run time:** Brand logos come from **Simple Icons** (CC0), the rest from **Material Symbols** (Apache 2.0); the build script removes their fills so the shell paints them in the tile's colour.
- **Bars painted behind the buttons:** A bar is drawn by a stand-in on a layer below the icons, so it can spread from a pill and a focus shape can glide between it and the icons.
- **Resting on the edge instead of a push:** A push of 100 px was hard on a touchpad; 200 ms on the last row is as hard to set off by passing by.
- **Make room for the app in front only:** Every window on the workspace kept the dock away almost always.
- **A list of styles in the menu:** Eleven styles do not fit segmented buttons; four rows show first, the chosen one always among them.
- **No notification when pinning:** Pinning from the dock uses the shell's quiet calls; the change is in front of you anyway.
- **The empty last workspace is hidden** in **Workspace split**, unless it is the active one.
- **Show apps is a pebble too** in **Pebbles**, as are the drives and the trash.
- **The icons shrink by themselves** when the dock would not fit its edge, the way Dash to Dock does it; it is not a setting.
- **A side dock leaves out long text:** the loud tile shows only its number, and the group names of **Grouped block** are hidden at the left and right edge.
- **Status and Window list became one style, Extended bar:** both were the floating bar with one extra each, so they now come together; a saved `status` or `window-list` turns into `extended-bar`.
- **Pills that reach beyond the dock** (status sentences, the rail's pill, pebble names) live on a layer that asks for no room, so the dock keeps its own size.

---

## License

MIT, see **[LICENSE](LICENSE)**. Google Sans Flex is under the SIL Open Font License, see **`toms-expressive-design/fonts/OFL.txt`**. The symbols keep their own licences and the logos remain trademarks of their owners, see **[extension/LICENSES](extension/LICENSES/README.md)**.
