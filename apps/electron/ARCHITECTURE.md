# Architecture Documentation

This document explains the codebase structure, design decisions, and technical implementation of the Lara Console Electron app.

## Tech Stack

- **Runtime**: Electron 31 (Chromium + Node.js)
- **Build Tool**: Vite 5
- **Frontend**: React 18 with TypeScript
- **State Management**: Zustand 4
- **Styling**: Tailwind CSS 3
- **WebSocket**: reconnecting-websocket
- **Date Formatting**: date-fns

## Project Structure

```
apps/electron/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # App lifecycle, window management
│   │   ├── ipc.ts      # IPC handlers (collapse, settings, etc.)
│   │   ├── logger.ts   # File logging system
│   │   └── storage.ts  # Persistent config and state
│   │
│   ├── preload/        # Secure bridge between main & renderer
│   │   └── index.ts    # contextBridge API exposure
│   │
│   └── renderer/       # React UI (runs in renderer process)
│       ├── components/ # UI components
│       ├── hooks/      # Custom React hooks
│       ├── services/   # WebSocket client
│       ├── store/      # Zustand state slices
│       ├── styles/     # Tailwind CSS
│       └── types/      # TypeScript interfaces
│
├── dist/               # Build output (ignored in git)
├── dist-electron/      # Electron build output (ignored)
├── electron-builder.yml # App packaging config
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Architecture Patterns

### 1. Electron Multi-Process Model

```
┌─────────────────────────────────────────┐
│          Main Process                    │
│  - Window management                     │
│  - System integration (always-on-top)   │
│  - IPC handlers                          │
│  - File I/O (config, logs)              │
└──────────────┬──────────────────────────┘
               │ IPC
               │
┌──────────────▼──────────────────────────┐
│       Preload Script                     │
│  - Secure contextBridge                  │
│  - Type-safe API exposure                │
└──────────────┬──────────────────────────┘
               │
               │
┌──────────────▼──────────────────────────┐
│      Renderer Process                    │
│  - React UI                              │
│  - Zustand state                         │
│  - WebSocket client                      │
│  - No direct Node.js access (sandbox)   │
└──────────────────────────────────────────┘
```

### 2. State Management (Zustand)

The app uses Zustand with **slice pattern** to split state into logical domains:

```typescript
// Store composition
export type AppStore =
  | UISlice           // collapsed, toasts, modals
  & SessionSlice      // connection, call, agent status
  & TranscriptSlice   // transcript lines, filtering
  & AnswersSlice      // current answer, queue, history
  & TasksSlice        // task queue
  & SettingsSlice     // user preferences

export const useStore = create<AppStore>()((...args) => ({
  ...createUISlice(...args),
  ...createSessionSlice(...args),
  ...createTranscriptSlice(...args),
  ...createAnswersSlice(...args),
  ...createTasksSlice(...args),
  ...createSettingsSlice(...args),
}))
```

**Why slices?**
- Separation of concerns
- Easier to test individual domains
- Avoids naming conflicts (e.g., `tasks` vs `queue`)
- Type-safe composition

### 3. Component Architecture

```
App.tsx (Root)
│
├─ CollapsedPill               # Pill mode
│  ├─ Status indicator
│  ├─ Notification badge
│  └─ Action buttons
│     ├─ NotificationPill      # Dropdown for answers/tasks
│     └─ ChatPill              # Text query input
│
└─ ExpandedDrawer              # Sidebar mode
   ├─ Header                   # Status bar, RTT
   ├─ Transcript               # Live transcript stream
   ├─ Controls                 # Force command, approve, etc.
   ├─ AnswerCard               # Current answer with actions
   ├─ TasksQueue               # Task list with approve/reject
   └─ JoinCallModal            # Meeting join form

Modals:
├─ SettingsModal              # Configuration panel
└─ ToastContainer             # Notification toasts
```

### 4. WebSocket Client

The `WSClient` class manages real-time communication:

```typescript
class WSClient {
  private ws: ReconnectingWebSocket
  private store: AppStore

  connect(url: string, token?: string): void
  disconnect(): void

  // Command methods
  forceCommandNext(): void
  approveSpeak(answerId: string): void
  rejectAnswer(answerId: string): void
  approveTask(taskId: string): void
  joinCall(meeting: MeetingInfo): void

  // Event processing
  private processServerEvent(event: ServerEvent): void
}
```

**Key features:**
- Auto-reconnect with exponential backoff
- Ping/pong heartbeat (every 30s)
- Type-safe message handling
- Direct Zustand store integration
- Logging support

### 5. IPC Communication

The preload script exposes a secure API to the renderer:

```typescript
// Preload (contextBridge)
contextBridge.exposeInMainWorld('electronAPI', {
  setCollapsed: (collapsed: boolean) =>
    ipcRenderer.invoke('set-collapsed', collapsed),
  // ... more methods
})

// Renderer usage
window.electronAPI.setCollapsed(true)
```

**IPC Handlers** (main/ipc.ts):
- `set-collapsed`: Resize and reposition window
- `set-transcript-collapsed`: Adjust sidebar width
- `set-chat-open`: Expand window for dropdown pill
- `save-config`: Persist user settings
- `get-version`: Read app version

### 6. Window Management

The app maintains an always-on-top overlay with two states:

**Collapsed (Pill)**
- Size: 300x90px
- Position: Top-center of screen
- Content: Status + quick actions
- Transparent background with glassmorphism

**Expanded (Sidebar)**
- Size: 400x900px (or 650x900 with transcript)
- Position: Right edge of screen
- Content: Full control panel
- Resizable height, fixed width

**Implementation:**
```typescript
// Maintain always-on-top across all states
mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
mainWindow.setAlwaysOnTop(true, 'screen-saver')

// Re-assert on blur to prevent other windows from covering
mainWindow.on('blur', () => {
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
})
```

## Data Flow

### Answer Approval Flow

```
1. WebSocket receives "answer_ready" event
   ↓
2. WSClient calls store.addAnswer(answer)
   ↓
3. AnswersSlice logic:
   - If no current answer → set as current
   - Otherwise → add to queue
   - Start 90s expiration timer
   ↓
4. React components re-render:
   - AnswerCard shows current answer
   - CollapsedPill updates notification badge
   ↓
5. User clicks "Approve" button
   ↓
6. Component calls wsClient.approveSpeak(answerId)
   ↓
7. WSClient sends {"type": "approve_speak"} to server
   ↓
8. Server responds with "speaking_started"
   ↓
9. WSClient updates store:
   - setAnswerStatus(answerId, 'approved')
   - setAgentStatus('speaking')
   ↓
10. UI shows "Speaking..." state
```

### State Persistence

User preferences and overlay state are persisted to disk:

```typescript
// Settings
{
  backendUrl: string
  authToken: string
  wakePhrase: string
  confirmBeforeSpeaking: boolean
  logToFile: boolean
  // ... etc
}

// Overlay state
{
  collapsed: boolean
  bounds: { x, y, width, height }
}
```

**Storage locations:**
- macOS: `~/Library/Application Support/@app/lara-console/`
- Windows: `%APPDATA%/@app/lara-console/`
- Linux: `~/.config/@app/lara-console/`

Files:
- `config.json` - User settings
- `overlay.json` - Window state
- `logs/` - Debug logs (if enabled)

## Key Design Decisions

### 1. Why Zustand over Redux?
- **Simpler API**: No actions, reducers, or middleware boilerplate
- **Better TypeScript**: Automatic type inference
- **Smaller bundle**: ~1KB vs ~10KB for Redux
- **No Context Provider**: Direct hook access

### 2. Why Slice Pattern?
- Prevents naming conflicts (both answers and tasks have a "queue")
- Each slice is independently testable
- Easier to reason about domain logic
- Follows separation of concerns

### 3. Why Reconnecting WebSocket?
- Built-in exponential backoff
- Automatic reconnection on network issues
- Event-based API (compatible with addEventListener)
- No manual retry logic needed

### 4. Why Vite over Webpack?
- **Faster HMR**: Instant updates during development
- **Better DX**: Less configuration
- **Smaller builds**: Better tree-shaking
- **ESM-first**: Modern JavaScript

### 5. Why Electron?
- **Cross-platform**: Single codebase for Mac/Windows/Linux
- **System integration**: Always-on-top, global hotkeys
- **Web stack**: React + TypeScript + Tailwind
- **Auto-update**: electron-updater support

## Security Considerations

### Electron Security Features

```typescript
// Window config
{
  webPreferences: {
    contextIsolation: true,  // Separate renderer & preload contexts
    sandbox: true,           // Restrict renderer capabilities
    nodeIntegration: false,  // No Node.js in renderer
    preload: path.join(__dirname, './index.mjs')
  }
}
```

### Input Validation
- All WebSocket messages validated with Zod schemas (contracts.ts)
- IPC parameters type-checked
- User input sanitized before display

### No Remote Code Execution
- No `eval()` or `Function()` calls
- No dynamic script loading
- CSP headers set (Content-Security-Policy)

## Performance Optimizations

### 1. Transcript Windowing
```typescript
// Only keep last 500 lines in memory
const maxLines = 500
lines: state.lines.concat(newLine).slice(-maxLines)
```

### 2. Answer Expiration
```typescript
// Auto-expire stale answers after 90s
const expiresAt = answer.ts + 90000
setTimeout(() => {
  if (answer.status === 'ready') {
    setAnswerStatus(answerId, 'stale')
  }
}, 90000)
```

### 3. Task Auto-Cleanup
```typescript
// Remove completed tasks after 5s
if (status === 'success' || status === 'failure') {
  setTimeout(() => {
    removeTask(taskId)
  }, 5000)
}
```

### 4. Toast Auto-Dismiss
```typescript
// Remove toasts after 5s
addToast: (type, message) => {
  const id = `toast_${Date.now()}`
  set((state) => ({ toasts: [...state.toasts, { id, type, message }] }))

  setTimeout(() => {
    set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }))
  }, 5000)
}
```

## Testing Strategy

### Development Testing
1. **Mock Server**: Use `apps/electron-mock` for full protocol testing
2. **DevTools**: Automatically open in development mode
3. **Logs**: Enable file logging in Settings

### Integration Testing
1. Connect to real backend
2. Test full conversation flow
3. Verify UI state transitions
4. Check persistence (restart app)

### Build Testing
```bash
npm run build
# Test the built .dmg/.exe/.AppImage
```

## Build & Release Process

### Local Build
```bash
npm install
npm run build
# Output: dist/Lara Console-0.1.0-arm64.dmg
```

### GitHub Actions
- Triggered on push to `main` (when electron files change)
- Builds for macOS, Windows, Linux in parallel
- Uploads artifacts for download
- Automatically attaches binaries to GitHub Releases

### Release Checklist
1. Update version in `package.json`
2. Update `CHANGELOG.md` (if exists)
3. Commit and push to `main`
4. Create GitHub Release
5. GitHub Actions builds and uploads binaries
6. Users download from Releases page

## Future Enhancements

### Planned Features
- [ ] Multi-language support (i18n)
- [ ] Custom themes
- [ ] Answer history search
- [ ] Export transcript to file
- [ ] Auto-update (electron-updater)
- [ ] Tray icon mode
- [ ] Multi-window support (multiple meetings)

### Performance Improvements
- [ ] Virtual scrolling for long transcripts
- [ ] IndexedDB for history storage
- [ ] Web Workers for heavy processing

### Developer Experience
- [ ] Unit tests (Vitest)
- [ ] E2E tests (Playwright)
- [ ] Storybook for components
- [ ] Auto-generated API docs

## Common Development Tasks

### Add New IPC Handler
1. Add handler in `src/main/ipc.ts`
2. Expose in `src/preload/index.ts`
3. Add TypeScript declaration in preload
4. Use in renderer via `window.electronAPI`

### Add New Store Slice
1. Create `src/renderer/store/mySlice.ts`
2. Define interface extending state type
3. Export `createMySlice` function
4. Add to `src/renderer/store/index.ts`
5. Update `AppStore` type

### Add New Component
1. Create `src/renderer/components/MyComponent.tsx`
2. Import required hooks from `../store`
3. Add props interface
4. Export default component
5. Import in parent component

### Add New WebSocket Event
1. Add type to `ServerEvent` union in `src/renderer/types/contracts.ts`
2. Handle in `processServerEvent()` in `src/renderer/services/wsClient.ts`
3. Update store state as needed
4. UI will re-render automatically

## Debugging

### Enable Logging
Settings → "Log to file" checkbox

Logs location:
- macOS: `~/Library/Application Support/@app/lara-console/logs/`
- Windows: `%APPDATA%/@app/lara-console/logs/`
- Linux: `~/.config/@app/lara-console/logs/`

### DevTools
- Development: Opens automatically
- Production: Cmd+Option+I (Mac) / Ctrl+Shift+I (Win/Linux)

### Inspect State
```javascript
// In DevTools console
window.__ZUSTAND_STORE__ // Access store (if exposed in dev)
```

### WebSocket Debugging
```javascript
// Check connection
const ws = wsClientRef.current
console.log(ws.ws.readyState) // 1 = OPEN
```

## Contributing

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- No `any` types
- Descriptive variable names
- Comments for complex logic

### Git Workflow
1. Branch from `main`
2. Make changes
3. Test locally
4. Commit with clear message
5. Push and create PR
6. CI runs build checks
7. Merge after approval

## License

MIT
