# Meeting Enjoyer Backend API

A FastAPI backend service for managing meeting insights, tasks, and questions through ElevenLabs conversational AI agents.

## Features

- **MongoDB Integration**: Store and retrieve meeting data in a Vikings database
- **Three Data Collection Endpoints**:
  - `/tasks` - Store action items from meetings
  - `/questions` - Store questions and get AI-generated answers via V7 integration
  - `/insights` - Store insights discovered during meetings
- **V7 Integration**: Automatic question processing with AI-generated answers
- **WebSocket Support**: Real-time answer delivery to connected clients
- **ElevenLabs Integration**: Make outbound calls with AI agents
- **Health Checks**: Built-in health monitoring endpoints

## API Endpoints

### Health & Status

- **GET /** - Basic health check
- **GET /health** - Detailed health check with environment validation

### Call Management

- **POST /call** - Initiate an outbound call with ElevenLabs agent
  ```json
  {
    "phone_number": "+1234567890",
    "system_prompt": "You are a helpful assistant",
    "first_message": "Hello!",
    "call_id": "optional-call-id"
  }
  ```

### WebSocket

- **WS /ws** - WebSocket endpoint for real-time answer delivery

  Connect to receive real-time answers from V7 question processing:

  1. Connect to the WebSocket endpoint
  2. Send your `call_id` as the first message (as JSON or plain text):
     ```json
     {"call_id": "call_123"}
     ```
  3. Receive connection confirmation
  4. Receive answers when questions are processed:
     ```json
     {
       "call_id": "call_123",
       "answer": "The AI-generated answer",
       "question_text": "The original question"
     }
     ```

### Data Collection

- **POST /tasks** - Store a task
  ```json
  {
    "call_id": "call_123",
    "task": "Follow up on the budget proposal"
  }
  ```

- **POST /questions** - Store a question and get AI-generated answer from V7
  ```json
  {
    "call_id": "call_123",
    "question": "What is the timeline for delivery?"
  }
  ```

  **Response:**
  ```json
  {
    "success": true,
    "id": "69189e8475b8eca678ac8fc5",
    "message": "Question created successfully",
    "timestamp": "2025-11-15T14:30:00.000Z",
    "answer": "The AI-generated answer from V7 (if available)"
  }
  ```

  **Note:** This endpoint integrates with V7 to automatically process questions and generate answers. The V7 integration is non-fatal - if V7 is unavailable or not configured, the question will still be stored in MongoDB with `answer: null`.

- **POST /insights** - Store an insight
  ```json
  {
    "call_id": "call_123",
    "insight": "Customer prefers monthly billing over annual"
  }
  ```

## ElevenLabs Agent Integration

### Setting Up Tools in ElevenLabs

To use the `/tasks`, `/questions`, and `/insights` endpoints as tools in your ElevenLabs conversational AI agent, follow these steps:

#### 1. Get Your API URL

After deploying to Cloud Run, you'll get a URL like:
```
https://meeting-enjoyer-backend-[hash]-ew.a.run.app
```

#### 2. Configure Tools in ElevenLabs Dashboard

Go to the [ElevenLabs Dashboard](https://elevenlabs.io/app/conversational-ai) and configure each tool:

##### Tool 1: Save Task

**Tool Configuration:**
- **Name**: `save_task`
- **Description**: `Save an action item or task that was mentioned during the conversation. Use this when the user mentions something they need to do or follow up on.`
- **Type**: `Webhook`
- **URL**: `https://YOUR-API-URL/tasks`
- **Method**: `POST`
- **Headers**:
  ```json
  {
    "Content-Type": "application/json"
  }
  ```

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "call_id": {
      "type": "string",
      "description": "The unique identifier for this call"
    },
    "task": {
      "type": "string",
      "description": "The task or action item to save"
    }
  },
  "required": ["call_id", "task"]
}
```

##### Tool 2: Save Question

**Tool Configuration:**
- **Name**: `save_question`
- **Description**: `Save a question that was asked during the conversation. Use this when the user asks an important question that should be tracked.`
- **Type**: `Webhook`
- **URL**: `https://YOUR-API-URL/questions`
- **Method**: `POST`
- **Headers**:
  ```json
  {
    "Content-Type": "application/json"
  }
  ```

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "call_id": {
      "type": "string",
      "description": "The unique identifier for this call"
    },
    "question": {
      "type": "string",
      "description": "The question that was asked"
    }
  },
  "required": ["call_id", "question"]
}
```

##### Tool 3: Save Insight

**Tool Configuration:**
- **Name**: `save_insight`
- **Description**: `Save an important insight or piece of information discovered during the conversation. Use this for key learnings, preferences, or important facts mentioned by the user.`
- **Type**: `Webhook`
- **URL**: `https://YOUR-API-URL/insights`
- **Method**: `POST`
- **Headers**:
  ```json
  {
    "Content-Type": "application/json"
  }
  ```

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "call_id": {
      "type": "string",
      "description": "The unique identifier for this call"
    },
    "insight": {
      "type": "string",
      "description": "The insight or important information to save"
    }
  },
  "required": ["call_id", "insight"]
}
```

#### 3. Update Your Agent's System Prompt

Add instructions to your agent's system prompt to use these tools effectively:

```
You are a helpful AI assistant conducting a meeting. During the conversation:

1. When the user mentions something they need to do, use the save_task tool to record it
2. When the user asks an important question, use the save_question tool to track it
3. When you learn something important about the user's preferences or situation, use the save_insight tool

Always use the current conversation_id as the call_id parameter when calling these tools.
Be proactive in identifying and saving tasks, questions, and insights without explicitly asking for permission.
```

#### 4. Example Conversation Flow

**User**: "I need to follow up with the team about the Q4 budget by next Friday."

**Agent**: *Calls save_task*
```json
{
  "call_id": "conv_abc123",
  "task": "Follow up with team about Q4 budget by next Friday"
}
```
**Agent**: "Got it, I've noted that you need to follow up with the team about the Q4 budget by next Friday."

---

**User**: "What's the best approach for reducing operational costs?"

**Agent**: *Calls save_question*
```json
{
  "call_id": "conv_abc123",
  "question": "What's the best approach for reducing operational costs?"
}
```
**Agent**: "Great question! For reducing operational costs, I'd recommend..."

---

**User**: "We prefer to work with vendors who offer monthly payment terms."

**Agent**: *Calls save_insight*
```json
{
  "call_id": "conv_abc123",
  "insight": "Company prefers vendors with monthly payment terms"
}
```
**Agent**: "I've made a note that monthly payment terms are important for your vendor selection."

### 5. Retrieving Stored Data

Data is stored in MongoDB in the `vikings` database with three collections:
- `tasks` - All saved tasks
- `questions` - All saved questions
- `insights` - All saved insights

Each document includes:
- `call_id` - The conversation identifier
- `task`/`question`/`insight` - The saved content
- `created_at` - ISO timestamp of when it was saved

## Environment Variables

Create a `.env` file with the following variables:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=your_agent_id
ELEVENLABS_PHONE_NUMBER_ID=your_phone_number_id

# V7 Configuration (Optional - for question answering)
V7_WORKSPACE_ID=your_workspace_id
V7_PROJECT_ID=your_project_id
V7_API_KEY=your_v7_api_key
V7_MAX_POLL_TIME=300  # Maximum time to wait for answer (seconds)
V7_POLL_INTERVAL=2    # Polling interval (seconds)

# Optional
PORT=8080
```

## Local Development

### Prerequisites

- Python 3.11+
- MongoDB (local or Atlas)
- [uv](https://docs.astral.sh/uv/) package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd meetings-enjoyer-backend
```

2. Install dependencies:
```bash
uv sync
```

3. Create a `.env` file with your configuration (see above)

4. Run the application:
```bash
uv run python main.py
```

The API will be available at `http://localhost:8080`

### Testing the API

```bash
# Health check
curl http://localhost:8080/health

# Save a task
curl -X POST http://localhost:8080/tasks \
  -H "Content-Type: application/json" \
  -d '{"call_id": "test_123", "task": "Review the meeting notes"}'

# Save a question
curl -X POST http://localhost:8080/questions \
  -H "Content-Type: application/json" \
  -d '{"call_id": "test_123", "question": "When is the deadline?"}'

# Save an insight
curl -X POST http://localhost:8080/insights \
  -H "Content-Type: application/json" \
  -d '{"call_id": "test_123", "insight": "User prefers email communication"}'
```

## Deployment

### Google Cloud Run

1. Build and deploy using Cloud Build:
```bash
./deploy.sh
```

Or manually:
```bash
gcloud builds submit --config cloudbuild.yaml
```

2. Set environment variables in Cloud Run:
```bash
gcloud run services update meeting-enjoyer-backend \
  --set-env-vars MONGODB_URI=your_mongodb_uri \
  --set-env-vars ELEVENLABS_API_KEY=your_api_key \
  --region europe-west2
```

### Docker

Build and run locally with Docker:

```bash
# Build
docker build -t meeting-enjoyer-backend .

# Run
docker run -p 8080:8080 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017 \
  -e ELEVENLABS_API_KEY=your_key \
  meeting-enjoyer-backend
```

## Project Structure

```
.
   api.py              # Main FastAPI application
   main.py             # Application entry point
   elevenlabs.py       # ElevenLabs API integration
   twillio_app.py      # Twilio WebSocket integration
   initiate_call.py    # Twilio call initiation script
   pyproject.toml      # Python dependencies (uv)
   Dockerfile          # Container configuration
   cloudbuild.yaml     # GCP Cloud Build configuration
   README.md           # This file
```

## MongoDB Schema

### Tasks Collection
```javascript
{
  "_id": ObjectId("..."),
  "call_id": "conv_abc123",
  "task": "Follow up on the proposal",
  "created_at": "2025-11-15T14:30:00.000Z"
}
```

### Questions Collection
```javascript
{
  "_id": ObjectId("..."),
  "call_id": "conv_abc123",
  "question": "What is the pricing structure?",
  "created_at": "2025-11-15T14:30:00.000Z",
  "answer": "AI-generated answer from V7 (null if not available)"
}
```

### Insights Collection
```javascript
{
  "_id": ObjectId("..."),
  "call_id": "conv_abc123",
  "insight": "Customer prefers monthly billing",
  "created_at": "2025-11-15T14:30:00.000Z"
}
```

## License

MIT
