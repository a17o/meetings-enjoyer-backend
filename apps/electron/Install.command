#!/bin/bash

# Lara Console Quick Installer
# Run this from the DMG to install to Applications

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Lara Console Quick Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get the directory where this script is located (the DMG)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_PATH="$SCRIPT_DIR/Lara Console.app"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ Error: Lara Console.app not found in the same folder as this installer."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "📦 Found: Lara Console.app"
echo ""

# Check if already installed
if [ -d "/Applications/Lara Console.app" ]; then
    echo "⚠️  Lara Console is already installed in /Applications"
    read -p "   Replace it? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        echo ""
        read -p "Press Enter to exit..."
        exit 0
    fi
    rm -rf "/Applications/Lara Console.app"
fi

# Copy to Applications
echo "📁 Installing to /Applications..."
cp -R "$APP_PATH" /Applications/
echo "✓ Installed"
echo ""

# Remove quarantine attribute
echo "🔓 Removing quarantine attribute..."
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
    sleep 1
    echo ""
    echo "✓ Lara Console is running!"
    echo "   Look for the black pill at the top of your screen."
else
    echo "You can launch it from Applications or Spotlight (⌘+Space) anytime."
fi

echo ""
echo "Press Enter to close this window..."
read
