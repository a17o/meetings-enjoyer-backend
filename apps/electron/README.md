# Lara Console

An always-on-top overlay console for macOS that provides real-time meeting transcription and AI assistance.

## Installation

### macOS

**Quick Install (Recommended for Hackathon Judges)**

1. Download the latest `Lara Console-X.X.X-arm64.dmg` from the [Releases](https://github.com/a17o/meetings-enjoyer-backend/releases) page or GitHub Actions artifacts

2. **Important:** Remove the quarantine attribute:
   ```bash
   xattr -cr ~/Downloads/Lara\ Console-*.dmg
   ```

3. Open the DMG and **double-click `Install.command`**
   - If macOS blocks it, right-click → "Open" → "Open" to bypass the warning
   - The installer will automatically copy the app to Applications and offer to launch it

**Manual Installation**

1. Download and remove quarantine (same as above)
2. Open the DMG
3. Drag **Lara Console.app** to the **Applications** folder
4. Launch from Applications

### Why is this step needed?

macOS applies a "quarantine" flag to all files downloaded from the internet. For unsigned applications, this causes Gatekeeper to block them with a "damaged" error message. Running the `xattr -cr` command removes this quarantine flag, allowing the app to run normally.

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

### Build

```bash
npm run build
```

The DMG will be created in `dist-output/`.

### Project Structure

- `src/main/` - Electron main process
- `src/renderer/` - React UI
- `src/preload/` - Preload script for IPC
- `dist-output/` - Build output (DMG and app)

## Features

- Always-on-top floating window
- Transparent glassmorphism UI
- Global hotkey (⌘+Space) to toggle collapse/expand
- Persistent window state
- File logging for debugging

## License

TBD
