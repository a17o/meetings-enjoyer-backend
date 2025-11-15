# Meetings Enjoyer - Lara AI Meeting Assistant

AI-powered meeting assistant with FastAPI backend and Electron control center.

## Project Structure

```
meetings-enjoyer-backend/
├── apps/
│   ├── electron/           # Lara Console - Electron control center
│   └── electron-mock/      # Mock WebSocket server for development
│
├── api.py                  # FastAPI backend
├── elevenlabs.py           # ElevenLabs integration
├── requirements.txt        # Python dependencies
├── Dockerfile              # Backend containerization
├── cloudbuild.yaml         # Google Cloud Build config
└── deploy.sh               # Deployment script
```

## Quick Start

### 1. Backend Setup (FastAPI)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Set environment variables
export ELEVENLABS_API_KEY="your_api_key"
export ELEVENLABS_AGENT_ID="your_agent_id"
export ELEVENLABS_PHONE_NUMBER_ID="your_phone_number_id"

# Run the backend
python api.py
```

The backend will run on `http://localhost:8080`.

### 2. Electron App Setup

```bash
cd apps/electron
npm install
npm run dev
```

The Lara Console will launch as an always-on-top overlay.

### 3. Mock Server (for development)

```bash
cd apps/electron-mock
npm install
npm run dev
```

Mock server runs on `ws://localhost:9001`.

## Features

### Backend (FastAPI)
- ✅ Health check endpoints
- ✅ Outbound call endpoint (ElevenLabs integration)
- ✅ Environment variable validation
- ✅ Docker containerization
- ✅ Google Cloud Run deployment

### Lara Console (Electron)
- ✅ Always-on-top, right-docked overlay
- ✅ Collapse/expand pill states
- ✅ Glassmorphism UI design
- ✅ Live transcript with wake-word highlighting
- ✅ Answer approval workflow
- ✅ Task queue management
- ✅ Force join call functionality
- ✅ Keyboard shortcuts (⌘K, ⌘↵, Esc, etc.)
- ✅ Mock mode for offline development
- ✅ Secure Electron configuration

## Development Workflow

### Local Backend Development

```bash
# Run backend
python api.py

# Or with Docker
docker build -t meetings-enjoyer .
docker run -p 8080:8080 --env-file .env meetings-enjoyer
```

### Electron App Development

```bash
cd apps/electron

# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Lint & format
npm run lint
npm run format
```

### Mock Server

```bash
cd apps/electron-mock

# Run with default settings
npm run dev

# Run with options
npm run dev -- --slow-answer  # 5s delay before answer
npm run dev -- --fail-join    # Simulate join failure
npm run dev -- --port 8080    # Custom port
```

## Deployment

### Backend Deployment (Google Cloud Run)

```bash
# Using the deploy script
./deploy.sh

# Or manually with gcloud
gcloud builds submit --config cloudbuild.yaml
```

### Electron App Packaging

```bash
cd apps/electron
npm run build
```

Outputs:
- **Mac**: `.dmg` in `dist/`
- **Windows**: `.exe` in `dist/`

## Environment Variables

### Backend

```bash
ELEVENLABS_API_KEY="your_api_key"          # ElevenLabs API key
ELEVENLABS_AGENT_ID="your_agent_id"        # ConvAI agent ID
ELEVENLABS_PHONE_NUMBER_ID="your_phone_id" # Outbound phone number ID
```

### Electron App

Configured via Settings modal in the app:
- Backend URL (default: `ws://localhost:9001`)
- Auth token (optional)
- Agent name (default: "Lara")
- Wake phrase (default: "hey lara")

## Architecture

### Backend Flow

1. Client calls `POST /call` with phone number and meeting context
2. Backend calls ElevenLabs ConvAI API
3. ElevenLabs dials into meeting via Twilio
4. AI agent listens and responds to prompts

### Electron App Flow

1. **Collapsed State** (60px pill):
   - Shows avatar, status dot, unread badge
   - Always on top, mouse events pass through
   - Expands on click or Alt/⌘+Space

2. **Expanded State** (400px drawer):
   - Live transcript on left
   - Controls & queue on right
   - Approve/reject answers
   - Manage tasks
   - Join/end calls

3. **WebSocket Connection**:
   - Connects to backend/mock server
   - Receives events (transcript, agent status, answers, tasks)
   - Sends commands (approve, reject, force, join, end)
   - Heartbeat ping/pong every 15s

## Testing

### End-to-End Test (with Mock Server)

1. Start mock server: `cd apps/electron-mock && npm run dev`
2. Start Electron app: `cd apps/electron && npm run dev`
3. Ensure mock mode is enabled in Settings
4. Observe:
   - Connection established
   - Transcript stream
   - Wake phrase detection ("hey lara")
   - Answer ready after 2s
   - Approve to speak flow
   - Speaking lifecycle
   - Task proposal

### Backend Test

```bash
curl -X POST http://localhost:8080/call \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1234567890",
    "first_message": "Hello, this is Lara joining the meeting."
  }'
```

## Troubleshooting

### Backend won't start
- Check that all environment variables are set
- Verify Python dependencies are installed
- Check port 8080 is not in use

### Electron app won't connect
- Ensure backend/mock server is running
- Verify backend URL in Settings
- Check browser console for WebSocket errors

### Overlay not staying on top (Mac)
- Grant accessibility permissions in System Preferences
- Restart the app

## Next Steps

- [ ] Implement full backend WebSocket server (matching PRD contracts)
- [ ] Integrate real-time transcript from Twilio
- [ ] Add STT/TTS pipeline with ElevenLabs
- [ ] Implement V7 agent integration
- [ ] Add authentication/authorization
- [ ] Deploy Electron app to production

## License

MIT
