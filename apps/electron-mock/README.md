# Lara Console Mock WebSocket Server

Mock WebSocket server for developing and testing the Lara Console Electron app without a real backend.

## Usage

```bash
# Install dependencies
npm install

# Run with default settings (port 9001)
npm run dev

# Run with custom port
npm run dev -- --port 8080

# Simulate slow answer (5s delay)
npm run dev -- --slow-answer

# Simulate join call failure
npm run dev -- --fail-join
```

## What it does

- Accepts WebSocket connections on `ws://localhost:9001`
- Sends scripted events simulating a real meeting:
  - Session info on connect
  - Transcript stream every 3s
  - "hey lara" wake phrase triggers command flow
  - Answer ready after 2s (or 5s with `--slow-answer`)
  - Task proposal after answer
  - Responds to approve/reject/cancel commands
- Implements ping/pong heartbeat
- Simulates join_call flow (dialing → connected/failed)

## Supported Commands

- `hello` - Client handshake
- `ping` - Heartbeat (responds with `pong`)
- `join_call` - Simulate joining a call
- `end_call` - End the current call
- `force_command_next` - Arm next utterance as command
- `approve_speak` - Trigger speaking flow
- `reject_answer` - Reject current answer
- `cancel_speech` - Cancel ongoing speech
- `approve_task` / `reject_task` - Handle task actions
