# Lara Console - Electron App

Always-on-top, right-docked overlay control center for the Lara AI meeting assistant.

## Features

✅ **Glassmorphism UI** with collapse/expand pill states
✅ **Live transcript** with wake-word highlighting
✅ **Answer approval** flow with sources and metrics
✅ **Task queue** management
✅ **Force join call** with meeting details
✅ **Hotkeys** for power users (⌘K, ⌘↵, Esc, ⌘,, ⌘L)
✅ **Mock mode** for offline development and demos
✅ **Secure** Electron setup (sandbox, contextIsolation)
✅ **Persistent settings** and overlay state

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start mock server (optional, for development)

```bash
cd ../electron-mock
npm install
npm run dev
```

The mock server will run on `ws://localhost:9001`.

### 3. Run the app in development mode

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
```

The built app will be in the `dist/` directory.

## Usage

### Collapsed Mode (Pill)

- Clean, minimal pill interface showing status and quick actions
- Click notification bell to see pending items
- Click chat icon for text queries
- Click menu to expand full sidebar
- **⌘+Space** to toggle (Cmd on Mac, Alt on Windows/Linux)

### Expanded Mode (400px drawer)

#### Header
- **Session status** (Connected/Disconnected)
- **Call status** (if in a call)
- **Agent status** (Idle/Listening/Researching/Ready/Speaking)
- **RTT** (WebSocket latency)

#### Left Panel: Transcript
- Live transcript with speaker labels
- Wake phrase highlighted in blue
- Filter: All / Commands only

#### Right Panel: Controls & Queue

**Controls:**
- **Force Command** (⌘K) - Arm next utterance as command
- **Approve to Speak** (⌘↵) - Let the agent speak
- **Join Call** - Join a Google Meet call
- **End Call** - Disconnect from call
- **Panic Stop** - Cancel ongoing speech

**Answer Card:**
- Answer text (expandable)
- Sources (hover for preview)
- Metrics (latency, confidence)
- Actions: Approve, Copy, Reject

**Tasks Queue:**
- Proposed tasks with Approve/Reject buttons
- Status tracking (Queued → Running → Success/Failure)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Alt/⌘+Space** | Collapse / Expand |
| **⌘K** | Force Command |
| **⌘↵** | Approve to Speak |
| **Esc** | Reject Answer / Collapse |
| **⌘,** | Open Settings |
| **⌘L** | Toggle Transcript Filter |

### Settings

Click the gear icon to configure:

- **Backend URL** - WebSocket endpoint (default: `ws://localhost:9001`)
- **Auth Token** - Bearer token for authentication (optional)
- **Agent Name** - Display name (default: "Lara")
- **Wake Phrase** - Trigger phrase (default: "hey lara")
- **Auto-scroll transcript** - Keep transcript scrolled to bottom
- **Confirm before speaking** - Require approval before agent speaks
- **Auto-raise-hand hint** - Show reminder to allow agent to unmute
- **Log to file** - Enable logging to `userData/logs/`
- **Mock mode** - Use mock WebSocket server for development

## Mock Mode

Mock mode allows you to demo the UI without a real backend:

1. Enable "Mock mode" in Settings
2. Ensure the backend URL is `ws://localhost:9001`
3. Start the mock server: `cd ../electron-mock && npm run dev`
4. The mock server will simulate:
   - Transcript stream
   - Wake phrase detection ("hey lara")
   - Answer ready after 2s
   - Task proposal
   - Speaking lifecycle

Mock server supports flags:
- `--slow-answer` - 5s delay before answer
- `--fail-join` - Simulate failed call join
- `--port 8080` - Custom port

## Architecture

```
src/
├── main/           # Electron main process (window, overlay, IPC)
├── preload/        # Secure bridge (contextBridge)
└── renderer/       # React UI
    ├── components/ # UI components
    ├── hooks/      # Custom hooks (keyboard, etc.)
    ├── services/   # WebSocket client
    ├── store/      # Zustand state management
    ├── styles/     # Tailwind CSS + glassmorphism
    └── types/      # TypeScript contracts & models
```

## Development

### Running with live reload

```bash
npm run dev
```

DevTools will open automatically.

### Linting & formatting

```bash
npm run lint
npm run format
```

### Building

```bash
npm run build
```

Outputs:
- Mac: `.dmg` in `dist/`
- Windows: `.exe` in `dist/`

## Security

- **Sandbox mode** enabled
- **Context isolation** enabled
- **Node integration** disabled
- **Auth token** stored locally (not logged)
- **HTTPS/WSS** only in production

## Troubleshooting

### App won't connect

- Check that the backend/mock server is running
- Verify the backend URL in Settings
- Check console for WebSocket errors

### Overlay not staying on top

- Restart the app
- Check macOS accessibility permissions

### Hotkeys not working

- Ensure the app has focus when expanded
- On Mac, check System Preferences → Keyboard → Shortcuts for conflicts

### Logs not appearing

- Enable "Log to file" in Settings
- Check `~/Library/Application Support/@app/lara-console/logs/`

## License

MIT
