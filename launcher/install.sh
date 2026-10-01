#!/bin/bash
# Builds "Eclipse Launcher.app" into ~/Applications and registers the eclipse:// link scheme.
set -euo pipefail
cd "$(dirname "$0")"
SRC="${1:-launcher.applescript}"
APP="$HOME/Applications/Eclipse Launcher.app"
mkdir -p "$HOME/Applications"
rm -rf "$APP"
osacompile -o "$APP" "$SRC"
PL="$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Add :CFBundleIdentifier string com.eclipse.launcher" "$PL" 2>/dev/null || \
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.eclipse.launcher" "$PL"
/usr/libexec/PlistBuddy -c "Add :LSUIElement bool true" "$PL" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :OSAAppletStayOpen bool true" "$PL" 2>/dev/null || /usr/libexec/PlistBuddy -c "Set :OSAAppletStayOpen true" "$PL"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$PL"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" "$PL"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLName string Eclipse Launcher" "$PL"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$PL"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string eclipse" "$PL"
codesign --force --deep --sign - "$APP"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP"
echo "Installed: $APP"
echo "Test it: open 'eclipse://app/spotify'"
