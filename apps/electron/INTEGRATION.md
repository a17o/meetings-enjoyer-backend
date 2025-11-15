# Integration Guide

This guide explains how to integrate your backend with the Lara Console Electron app.

## Quick Start

1. **Download the app** from [GitHub Releases](../../releases)
2. **Install and run** the app
3. **Configure backend** in Settings (gear icon)
4. **Implement WebSocket endpoint** following the protocol below

## WebSocket Protocol

The app connects to your backend via WebSocket. Your server must implement the following protocol:

### Connection

```
ws://your-backend:port?token=YOUR_AUTH_TOKEN
```

- Default URL: `ws://localhost:9001`
- Token is optional and can be configured in Settings

### Client → Server Messages

All messages are JSON with a `type` field:

#### 1. Hello (Handshake)
```json
{
  "type": "hello",
  "clientVersion": "0.1.0",
  "supports": ["transcript", "answers", "tasks"]
}
```

#### 2. Ping (Heartbeat)
```json
{
  "type": "ping",
  "ts": 1234567890
}
```

#### 3. Join Call
```json
{
  "type": "join_call",
  "meeting": {
    "label": "Team Standup",
    "dialIn": "+1-555-0100,,12345678#",
    "dtmf": "12345678#",
    "displayName": "Lara Assistant"
  }
}
```

#### 4. End Call
```json
{
  "type": "end_call"
}
```

#### 5. Force Command (Next utterance is a command)
```json
{
  "type": "force_command_next"
}
```

#### 6. Text Query (Ask a question)
```json
{
  "type": "text_query",
  "payload": {
    "text": "What was the last decision made?"
  }
}
```

#### 7. Approve Speak (Allow agent to speak answer)
```json
{
  "type": "approve_speak",
  "answerId": "ans_123"
}
```

#### 8. Reject Answer
```json
{
  "type": "reject_answer",
  "answerId": "ans_123",
  "reason": "Not relevant"
}
```

#### 9. Cancel Speech (Panic stop)
```json
{
  "type": "cancel_speech",
  "answerId": "ans_123"
}
```

#### 10. Approve Task
```json
{
  "type": "approve_task",
  "taskId": "task_123"
}
```

#### 11. Reject Task
```json
{
  "type": "reject_task",
  "taskId": "task_123",
  "reason": "Too risky"
}
```

#### 12. Update Settings
```json
{
  "type": "set_settings",
  "settings": {
    "wakePhrase": "hey lara",
    "confirmBeforeSpeaking": true,
    "autoRaiseHandHint": true
  }
}
```

### Server → Client Events

#### 1. Session Info (On connect)
```json
{
  "type": "session_info",
  "sessionId": "sess_123",
  "callSid": "call_456",
  "agentName": "Lara",
  "meetingLabel": "Team Standup"
}
```

#### 2. Transcript (Live stream)
```json
{
  "type": "transcript",
  "id": "trans_123",
  "ts": 1234567890,
  "text": "We should update the API documentation",
  "partial": false,
  "speaker": "Alice",
  "wake": false
}
```

Set `wake: true` when the wake phrase is detected.

#### 3. Wake Detected
```json
{
  "type": "wake_detected",
  "ts": 1234567890,
  "phrase": "hey lara",
  "by": "voice"
}
```

#### 4. Command Started
```json
{
  "type": "command_started",
  "commandId": "cmd_123",
  "ts": 1234567890,
  "method": "wake"
}
```

`method`: `"wake"` (wake phrase) or `"forced"` (force command button)

#### 5. Agent Status
```json
{
  "type": "agent_status",
  "commandId": "cmd_123",
  "status": "researching",
  "detail": "Searching knowledge base..."
}
```

`status`: `"idle"` | `"listening"` | `"researching"` | `"ready"` | `"speaking"`

#### 6. Answer Ready
```json
{
  "type": "answer_ready",
  "answerId": "ans_123",
  "commandId": "cmd_123",
  "ts": 1234567890,
  "text": "Based on the discussion, I recommend...",
  "sources": [
    {
      "id": "src_1",
      "title": "API Documentation",
      "snippet": "The current version is...",
      "url": "https://docs.example.com/api"
    }
  ],
  "metrics": {
    "latencyMs": 2340,
    "confidence": 0.92
  }
}
```

#### 7. Speaking Started
```json
{
  "type": "speaking_started",
  "answerId": "ans_123",
  "ts": 1234567890
}
```

#### 8. Speaking Ended
```json
{
  "type": "speaking_ended",
  "answerId": "ans_123",
  "ts": 1234567890,
  "durationMs": 5600
}
```

#### 9. Speech Canceled
```json
{
  "type": "speech_canceled",
  "answerId": "ans_123"
}
```

#### 10. Task Proposed
```json
{
  "type": "task_proposed",
  "taskId": "task_123",
  "ts": 1234567890,
  "summary": "Create follow-up meeting invite",
  "payload": {
    "action": "create_calendar_event",
    "title": "Follow-up: API Documentation",
    "attendees": ["alice@example.com", "bob@example.com"]
  }
}
```

#### 11. Task Status
```json
{
  "type": "task_status",
  "taskId": "task_123",
  "status": "running",
  "detail": "Sending invites..."
}
```

`status`: `"queued"` | `"approved"` | `"rejected"` | `"running"` | `"success"` | `"failure"`

#### 12. Call Status
```json
{
  "type": "call_status",
  "status": "connected",
  "callSid": "call_456",
  "reason": null
}
```

`status`: `"dialing"` | `"connected"` | `"ended"` | `"failed"`

#### 13. Pong (Heartbeat response)
```json
{
  "type": "pong",
  "ts": 1234567890,
  "serverTs": 1234567895
}
```

#### 14. Error
```json
{
  "type": "error",
  "code": "NO_ACTIVE_CALL",
  "message": "Cannot speak without an active call",
  "recoverable": true
}
```

Common error codes:
- `WS_DISCONNECTED`
- `AUTH_FAILED`
- `NO_ACTIVE_CALL`
- `BACKEND_BUSY`
- `INVALID_COMMAND`
- `TIMEOUT`
- `SPEAK_FAILED`
- `TASK_FAILED`
- `CALL_FAILED`

## Example Flow

### Wake Word → Answer → Speak

```
1. [Client → Server] { type: "hello", ... }
2. [Server → Client] { type: "session_info", ... }

3. [Server → Client] { type: "transcript", text: "hey lara", wake: true }
4. [Server → Client] { type: "wake_detected", ... }
5. [Server → Client] { type: "command_started", commandId: "cmd_1", method: "wake" }
6. [Server → Client] { type: "agent_status", status: "listening" }

7. [Server → Client] { type: "transcript", text: "what was the last decision?" }
8. [Server → Client] { type: "agent_status", status: "researching" }

9. [Server → Client] { type: "answer_ready", answerId: "ans_1", text: "..." }
10. [Server → Client] { type: "agent_status", status: "ready" }

11. [Client → Server] { type: "approve_speak", answerId: "ans_1" }
12. [Server → Client] { type: "speaking_started", answerId: "ans_1" }
13. [Server → Client] { type: "agent_status", status: "speaking" }

14. [Server → Client] { type: "speaking_ended", answerId: "ans_1" }
15. [Server → Client] { type: "agent_status", status: "idle" }
```

## Testing with Mock Server

The `apps/electron-mock` directory contains a mock WebSocket server for testing:

```bash
cd apps/electron-mock
npm install
npm run dev
```

This simulates the full protocol and is useful for:
- Understanding the message flow
- Testing the UI without a real backend
- Demos and presentations

## UI States

### Collapsed (Pill) Mode
- Minimal overlay showing status and notification count
- Click notification bell to see pending answers/tasks
- Click chat icon for text queries
- Click menu to expand full sidebar

### Expanded (Sidebar) Mode
- Full control panel with transcript and answer queue
- Keyboard shortcuts:
  - `Cmd+K` (Mac) / `Ctrl+K` (Win/Linux): Force Command
  - `Cmd+Enter`: Approve to Speak
  - `Esc`: Reject Answer / Collapse
  - `Cmd+,`: Settings
  - `Cmd+L`: Toggle Transcript Filter
  - `Cmd+Space` (Mac) / `Alt+Space` (Win/Linux): Toggle Pill/Sidebar

## Common Integration Patterns

### 1. Answer with Sources
Always include sources when available:
```json
{
  "type": "answer_ready",
  "answerId": "ans_1",
  "text": "...",
  "sources": [
    {
      "id": "src_1",
      "title": "Meeting Transcript Line 42",
      "snippet": "Alice said: We need to...",
      "url": null
    }
  ]
}
```

### 2. Multi-step Tasks
Break down complex tasks into smaller status updates:
```json
// Step 1
{ "type": "task_status", "taskId": "task_1", "status": "running", "detail": "Creating document..." }

// Step 2
{ "type": "task_status", "taskId": "task_1", "status": "running", "detail": "Adding content..." }

// Step 3
{ "type": "task_status", "taskId": "task_1", "status": "success", "detail": "Document created" }
```

### 3. Answer Timeout
Answers expire after 90 seconds if not approved. The UI will mark them as "stale" and show a warning.

## Security

### Authentication
- Token-based auth via URL parameter
- Token is stored locally in user settings
- Recommendation: Use JWT tokens with short expiration

### WebSocket Security
- Use WSS (WebSocket Secure) in production
- Validate all client messages server-side
- Rate limit commands to prevent abuse
- Don't trust client-provided IDs (generate server-side)

### Data Privacy
- All data stays local (no cloud sync)
- Config and overlay state saved to:
  - Mac: `~/Library/Application Support/@app/lara-console/`
  - Windows: `%APPDATA%/@app/lara-console/`
  - Linux: `~/.config/@app/lara-console/`

## Troubleshooting

### Connection Issues
- Check backend URL in Settings
- Verify WebSocket server is running
- Check firewall/network settings
- Look for errors in app logs (enable in Settings)

### App Not Staying On Top
- Restart the app
- On macOS, check System Preferences → Security & Privacy → Accessibility

### Build from Source
```bash
cd apps/electron
npm install
npm run dev     # Development mode
npm run build   # Production build
```

## Support

- GitHub Issues: [Report bugs](../../issues)
- Documentation: [Full docs](./README.md)
- Mock Server: [Example implementation](../electron-mock)
