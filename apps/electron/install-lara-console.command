#!/bin/bash

# Lara Console Installer for macOS
# Double-click this file to install Lara Console

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Lara Console Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get the latest release DMG URL from GitHub
echo "📦 Fetching latest release..."
LATEST_URL=$(curl -s https://api.github.com/repos/a17o/meetings-enjoyer-backend/releases/latest | grep "browser_download_url.*arm64.dmg" | cut -d '"' -f 4)

if [ -z "$LATEST_URL" ]; then
    echo "❌ Could not find latest release. Checking GitHub Actions artifacts..."
    echo ""
    echo "Please download the DMG manually from:"
    echo "https://github.com/a17o/meetings-enjoyer-backend/actions"
    echo ""
    echo "Then run: xattr -cr ~/Downloads/Lara\\ Console-*.dmg"
    echo "And open the DMG to install."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "✓ Found: $LATEST_URL"
echo ""

# Download to /tmp
DMG_PATH="/tmp/lara-console.dmg"
echo "⬇️  Downloading Lara Console..."
curl -L -o "$DMG_PATH" "$LATEST_URL"
echo "✓ Downloaded"
echo ""

# Remove quarantine attribute
echo "🔓 Removing quarantine attribute..."
xattr -cr "$DMG_PATH"
echo "✓ Quarantine removed"
echo ""

# Mount the DMG
echo "💿 Mounting DMG..."
hdiutil attach "$DMG_PATH" -nobrowse -quiet
VOLUME=$(ls /Volumes/ | grep "Lara Console" | head -1)
echo "✓ Mounted at /Volumes/$VOLUME"
echo ""

# Copy to Applications
echo "📁 Installing to /Applications..."
if [ -d "/Applications/Lara Console.app" ]; then
    echo "⚠️  Lara Console already exists in Applications"
    read -p "   Replace it? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "/Applications/Lara Console.app"
        cp -R "/Volumes/$VOLUME/Lara Console.app" /Applications/
        echo "✓ Replaced"
    else
        echo "✓ Skipped installation"
    fi
else
    cp -R "/Volumes/$VOLUME/Lara Console.app" /Applications/
    echo "✓ Installed"
fi
echo ""

# Unmount and cleanup
echo "🧹 Cleaning up..."
hdiutil detach "/Volumes/$VOLUME" -quiet
rm "$DMG_PATH"
echo "✓ Cleaned up"
echo ""

# Remove quarantine from the app itself
echo "🔓 Removing quarantine from installed app..."
xattr -cr "/Applications/Lara Console.app"
echo "✓ App is ready to run"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Installation Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Lara Console is now installed in /Applications"
echo ""
read -p "Launch Lara Console now? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Launching Lara Console..."
    open "/Applications/Lara Console.app"
    echo ""
    echo "✓ Lara Console is running!"
else
    echo "You can launch it from Applications or Spotlight anytime."
fi

echo ""
echo "Press Enter to close this window..."
read
