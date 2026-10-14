#!/usr/bin/env bash
# Installs Harbor for the current user: links the extension, installs the
# font if it is missing, and enables it. Updating is a plain "git pull" and
# a new login.
#
#   ./install.sh            install
#   ./install.sh --remove   remove the link and disable Harbor
set -euo pipefail

UUID="harbor@thomashaiden"
DASH_TO_DOCK="dash-to-dock@micxgx.gmail.com"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
TARGET="$DATA/gnome-shell/extensions/$UUID"
FONT_DIR="$DATA/fonts"
FONT="$REPO/toms-expressive-design/fonts/GoogleSansFlex.woff2"

# Removes one entry from a gsettings string list.
drop() {
    local list
    list="$(gsettings get org.gnome.shell "$1")"
    list="$(echo "$list" | sed -E "s/'$2'(, )?//; s/, \]/]/")"
    gsettings set org.gnome.shell "$1" "$list"
}

# Adds one entry to a gsettings string list.
add() {
    local list
    list="$(gsettings get org.gnome.shell "$1")"
    [[ "$list" == *"'$2'"* ]] && return
    if [[ "$list" == "@as []" || "$list" == "[]" ]]; then
        gsettings set org.gnome.shell "$1" "['$2']"
    else
        gsettings set org.gnome.shell "$1" "${list%]}, '$2']"
    fi
}

if [ "${1:-}" = "--remove" ]; then
    drop enabled-extensions "$UUID"
    [ -L "$TARGET" ] && rm "$TARGET"
    echo "Removed. Your settings stay in ${XDG_CONFIG_HOME:-$HOME/.config}/harbor."
    exit 0
fi

shell="$(gnome-shell --version 2>/dev/null | grep -oE '[0-9]+' | head -n 1 || true)"
if [ "$shell" != "50" ]; then
    echo "This is GNOME Shell ${shell:-of an unknown version}; Harbor names version 50 only and may not load." >&2
fi

if [ -e "$TARGET" ] && [ ! -L "$TARGET" ]; then
    echo "$TARGET exists and is not a link. Move it away first." >&2
    exit 1
fi
mkdir -p "$(dirname "$TARGET")"
ln -sfn "$REPO/extension" "$TARGET"
echo "Linked $TARGET"

if ! fc-list : family | grep -q "Google Sans Flex"; then
    mkdir -p "$FONT_DIR"
    cp "$FONT" "$FONT_DIR/"
    fc-cache -f "$FONT_DIR"
    echo "Installed Google Sans Flex to $FONT_DIR"
fi

# Written to the setting directly: the running shell only learns about a new
# extension at the next login, and "gnome-extensions enable" fails until then.
add enabled-extensions "$UUID"
drop disabled-extensions "$UUID" 2>/dev/null || true

# Harbor replaces Dash to Dock; two docks at one edge get in each other's way.
if gsettings get org.gnome.shell enabled-extensions | grep -q "$DASH_TO_DOCK"; then
    read -r -p "Dash to Dock is on. Switch it off? [y/N] " answer || answer=""
    if [[ "$answer" == [yY]* ]]; then
        drop enabled-extensions "$DASH_TO_DOCK"
        echo "Dash to Dock is off. It stays installed; switch it on again in Extensions."
    fi
fi
echo "Enabled. Log out and back in to see Harbor."
