from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, Dict
import os
from datetime import datetime
import logging
from motor.motor_asyncio import AsyncIOMotorClient
import requests
import time
import json
from dotenv import load_dotenv

from elevenlabs import call_elevenlabs

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Store websocket connections by call_id
websocket_connections: Dict[str, WebSocket] = {}

app = FastAPI(
    title="Meeting Enjoyer API",
    description="API that provides tools for V7, Eleven Labs, etc",
    version="1.0.0"
)

# MongoDB connection
mongodb_client = None
db = None

@app.on_event("startup")
async def startup_db_client():
    """Initialize MongoDB connection on startup"""
    global mongodb_client, db
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_client = AsyncIOMotorClient(mongodb_uri)
    db = mongodb_client.vikings
    logger.info("Connected to MongoDB database: vikings")

    # Check V7 API configuration
    v7_workspace_id = os.getenv("V7_WORKSPACE_ID")
    v7_project_id = os.getenv("V7_PROJECT_ID")
    v7_api_key = os.getenv("V7_API_KEY")

    if v7_workspace_id and v7_project_id and v7_api_key:
        logger.info("V7 integration is configured")
        try:
            # Test V7 API connection
            test_url = f"https://go.v7labs.com/api/workspaces/{v7_workspace_id}/projects/{v7_project_id}"
            headers = {"X-API-KEY": v7_api_key}
            response = requests.get(test_url, headers=headers, timeout=5)

            if response.status_code == 200:
                logger.info("✓ V7 API connection successful")
            else:
                logger.warning(f"V7 API returned status {response.status_code}")
        except requests.exceptions.Timeout:
            logger.warning("V7 API connection timeout")
        except Exception as e:
            logger.warning(f"V7 API connection failed: {str(e)}")
    else:
        logger.info("V7 integration not configured (optional feature)")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Close MongoDB connection on shutdown"""
    global mongodb_client
    if mongodb_client:
        mongodb_client.close()
        logger.info("Closed MongoDB connection")


class CallRequest(BaseModel):
    phone_number: str
    system_prompt: Optional[str] = ""
    first_message: Optional[str] = ""
    call_id: Optional[str] = None


class CallResponse(BaseModel):
    success: bool
    call_id: Optional[str] = None
    conversation_id: Optional[str] = None
    phone_number: str
    status: Optional[str] = None
    message: str
    timestamp: str
    error: Optional[str] = None


class TaskRequest(BaseModel):
    call_id: str
    task: str


class QuestionRequest(BaseModel):
    call_id: str
    question: str


class InsightRequest(BaseModel):
    call_id: str
    insight: str


class DataResponse(BaseModel):
    success: bool
    id: str
    message: str
    timestamp: str
    answer: Optional[str] = None


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Health check",
        "timestamp": datetime.now().isoformat()
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    call_id = None
    
    try:
        # Wait for call_id as the first message
        data = await websocket.receive_text()
        try:
            message = json.loads(data)
            call_id = message.get("call_id")
        except json.JSONDecodeError:
            # If not JSON, treat the whole message as call_id
            call_id = data.strip()
        
        if not call_id:
            await websocket.send_text(json.dumps({"error": "call_id is required"}))
            await websocket.close()
            return
        
        # Store the websocket connection with this call_id
        websocket_connections[call_id] = websocket
        logger.info(f"WebSocket connected for call_id: {call_id}")
        
        await websocket.send_text(json.dumps({"status": "connected", "call_id": call_id}))
        
        # Keep connection alive and listen for messages
        while True:
            try:
                data = await websocket.receive_text()
                # Echo back any messages (optional, for ping/pong or other messages)
                await websocket.send_text(json.dumps({"echo": data}))
            except WebSocketDisconnect:
                break
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for call_id: {call_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        # Clean up the connection
        if call_id and call_id in websocket_connections:
            del websocket_connections[call_id]
            logger.info(f"Removed websocket connection for call_id: {call_id}")


@app.get("/health")
async def health_check():
    """Detailed health check with environment validation"""
    env_status = {
        "ELEVENLABS_API_KEY": bool(os.getenv("ELEVENLABS_API_KEY")),
        "ELEVENLABS_AGENT_ID": bool(os.getenv("ELEVENLABS_AGENT_ID")),
        "ELEVENLABS_PHONE_NUMBER_ID": bool(os.getenv("ELEVENLABS_PHONE_NUMBER_ID")),
        "V7_WORKSPACE_ID": bool(os.getenv("V7_WORKSPACE_ID")),
        "V7_PROJECT_ID": bool(os.getenv("V7_PROJECT_ID")),
        "V7_API_KEY": bool(os.getenv("V7_API_KEY"))
    }

    # ElevenLabs is required, V7 is optional
    elevenlabs_configured = all([
        env_status["ELEVENLABS_API_KEY"],
        env_status["ELEVENLABS_AGENT_ID"],
        env_status["ELEVENLABS_PHONE_NUMBER_ID"]
    ])

    v7_configured = all([
        env_status["V7_WORKSPACE_ID"],
        env_status["V7_PROJECT_ID"],
        env_status["V7_API_KEY"]
    ])

    # Test V7 API connection if configured
    v7_status = "not_configured"
    if v7_configured:
        try:
            workspace_id = os.getenv('V7_WORKSPACE_ID')
            project_id = os.getenv('V7_PROJECT_ID')
            api_key = os.getenv('V7_API_KEY')

            # Test API connection with a simple GET request
            test_url = f"https://go.v7labs.com/api/workspaces/{workspace_id}/projects/{project_id}"
            headers = {"X-API-KEY": api_key}
            response = requests.get(test_url, headers=headers, timeout=5)

            if response.status_code == 200:
                v7_status = "connected"
            else:
                v7_status = f"error_{response.status_code}"
        except requests.exceptions.Timeout:
            v7_status = "timeout"
        except Exception as e:
            v7_status = f"error: {str(e)[:50]}"

    return {
        "status": "healthy" if elevenlabs_configured else "partial",
        "environment": env_status,
        "ready": elevenlabs_configured,
        "v7_integration": {
            "configured": v7_configured,
            "status": v7_status
        },
        "timestamp": datetime.now().isoformat()
    }


@app.post("/call", response_model=CallResponse)
async def make_call(request: CallRequest):
    """
    Make an outbound phone call using ElevenLabs ConvAI API.
    
    Args:
        request: CallRequest containing call details
        
    Returns:
        CallResponse with call result information
    """
    try:
        logger.info(f"Making call to: {request.phone_number}")
        
        # Validate environment variables
        required_env_vars = [
            "ELEVENLABS_API_KEY",
            "ELEVENLABS_AGENT_ID",
            "ELEVENLABS_PHONE_NUMBER_ID"
        ]
        
        missing_vars = [var for var in required_env_vars if not os.getenv(var)]
        if missing_vars:
            raise HTTPException(
                status_code=500,
                detail=f"Missing required environment variables: {', '.join(missing_vars)}"
            )
        
        # Make the call
        result = call_elevenlabs(
            phone_number=request.phone_number,
            system_prompt=request.system_prompt,
            first_message=request.first_message,
            call_id=request.call_id
        )
        
        logger.info(f"Call result: {result.get('success', False)}")
        
        # Format the response
        response = CallResponse(
            success=result.get("success", False),
            call_id=result.get("call_id"),
            conversation_id=result.get("conversation_id"),
            phone_number=result.get("phone_number", request.phone_number),
            status=result.get("status"),
            message=result.get("message", ""),
            timestamp=result.get("timestamp", datetime.now().isoformat()),
            error=result.get("error")
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Call failed")
            )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Call execution failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Call execution failed: {str(e)}"
        )


@app.post("/tasks", response_model=DataResponse)
async def create_task(request: TaskRequest):
    """
    Store a task for a given call_id in MongoDB.

    Args:
        request: TaskRequest containing call_id and task

    Returns:
        DataResponse with the created task information
    """
    try:
        logger.info(f"Creating task for call_id: {request.call_id}")

        # Create task document
        task_document = {
            "call_id": request.call_id,
            "task": request.task,
            "created_at": datetime.now().isoformat()
        }

        # Insert into MongoDB
        result = await db.tasks.insert_one(task_document)

        logger.info(f"Task created with id: {result.inserted_id}")

        return DataResponse(
            success=True,
            id=str(result.inserted_id),
            message="Task created successfully",
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        logger.error(f"Failed to create task: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create task: {str(e)}"
        )


@app.post("/questions", response_model=DataResponse)
async def create_question(request: QuestionRequest):
    """
    Store a question for a given call_id in MongoDB and send to V7 for processing.

    Args:
        request: QuestionRequest containing call_id and question

    Returns:
        DataResponse with the created question information and V7 answer
    """
    try:
        logger.info(f"Creating question for call_id: {request.call_id}")

        # Create question document (initially without answer)
        question_document = {
            "call_id": request.call_id,
            "question": request.question,
            "created_at": datetime.now().isoformat(),
            "answer": None
        }

        # Insert into MongoDB
        result = await db.questions.insert_one(question_document)
        question_id = result.inserted_id

        logger.info(f"Question created with id: {question_id}")

        # Send to V7 for processing
        v7_answer = None
        try:
            # Validate V7 environment variables
            required_env_vars = [
                "V7_WORKSPACE_ID",
                "V7_PROJECT_ID",
                "V7_API_KEY"
            ]

            missing_vars = [var for var in required_env_vars if not os.getenv(var)]
            if not missing_vars:
                workspace_id = os.getenv('V7_WORKSPACE_ID')
                project_id = os.getenv('V7_PROJECT_ID')
                api_key = os.getenv('V7_API_KEY')

                # Create the V7 entity
                create_url = f"https://go.v7labs.com/api/workspaces/{workspace_id}/projects/{project_id}/entities"
                headers = {"X-API-KEY": api_key}
                payload = {
                    "fields": {
                        "call_id": request.call_id,
                        "question_text": request.question
                    }
                }

                create_response = requests.post(create_url, json=payload, headers=headers)
                create_response.raise_for_status()
                create_data = create_response.json()

                logger.info(f"V7 entity created with id: {create_data.get('id')}")

                # Extract necessary IDs from the response
                entity_id = create_data.get('id')
                project_id_from_response = create_data.get('project_id')

                if entity_id and project_id_from_response:
                    # Poll for the entity until answer is ready
                    get_url = f"https://go.v7labs.com/api/workspaces/{workspace_id}/projects/{project_id_from_response}/entities/{entity_id}"
                    get_headers = {
                        "accept": "application/json",
                        "X-API-KEY": api_key
                    }

                    # Polling configuration
                    max_poll_time = int(os.getenv("V7_MAX_POLL_TIME", 300))  # 5 minutes
                    poll_interval = int(os.getenv("V7_POLL_INTERVAL", 2))  # 2 seconds
                    start_time = time.time()

                    logger.info(f"Starting to poll for entity {entity_id} (max {max_poll_time}s, interval {poll_interval}s)")

                    while True:
                        # Check timeout
                        elapsed_time = time.time() - start_time
                        if elapsed_time > max_poll_time:
                            logger.warning(f"Polling timeout after {max_poll_time} seconds")
                            break

                        get_response = requests.get(get_url, headers=get_headers)
                        get_response.raise_for_status()
                        get_data = get_response.json()

                        # Check if answer is ready
                        fields = get_data.get('fields', {})
                        answer_field = fields.get('answer', {})
                        answer_status = answer_field.get('status', 'idle')

                        logger.info(f"Polling: answer status is '{answer_status}' (elapsed: {elapsed_time:.1f}s)")

                        # Check if answer is complete
                        if answer_status == 'complete':
                            logger.info("Answer is ready, extracting answer value")

                            tool_value = answer_field.get('tool_value', {})
                            v7_answer = tool_value.get('value')

                            if v7_answer:
                                # Update MongoDB document with answer
                                await db.questions.update_one(
                                    {"_id": question_id},
                                    {"$set": {"answer": v7_answer}}
                                )
                                logger.info(f"Updated question {question_id} with V7 answer")

                                # Send to websocket if connected
                                if request.call_id in websocket_connections:
                                    try:
                                        websocket = websocket_connections[request.call_id]
                                        await websocket.send_text(json.dumps({
                                            "call_id": request.call_id,
                                            "answer": v7_answer,
                                            "question_text": request.question
                                        }))
                                        logger.info(f"Sent answer to websocket for call_id: {request.call_id}")
                                    except Exception as e:
                                        logger.error(f"Failed to send answer to websocket: {str(e)}")

                            break

                        if answer_field.get('error_message'):
                            error_msg = answer_field.get('error_message')
                            logger.error(f"Answer field has error: {error_msg}")
                            break

                        # Wait before next poll
                        time.sleep(poll_interval)
            else:
                logger.warning(f"V7 integration disabled. Missing env vars: {', '.join(missing_vars)}")

        except Exception as e:
            logger.error(f"V7 processing failed (non-fatal): {str(e)}")
            # V7 failure is non-fatal, we still return the stored question

        return DataResponse(
            success=True,
            id=str(question_id),
            message="Question created successfully",
            timestamp=datetime.now().isoformat(),
            answer=v7_answer
        )

    except Exception as e:
        logger.error(f"Failed to create question: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create question: {str(e)}"
        )


@app.post("/insights", response_model=DataResponse)
async def create_insight(request: InsightRequest):
    """
    Store an insight for a given call_id in MongoDB.

    Args:
        request: InsightRequest containing call_id and insight

    Returns:
        DataResponse with the created insight information
    """
    try:
        logger.info(f"Creating insight for call_id: {request.call_id}")

        # Create insight document
        insight_document = {
            "call_id": request.call_id,
            "insight": request.insight,
            "created_at": datetime.now().isoformat()
        }

        # Insert into MongoDB
        result = await db.insights.insert_one(insight_document)

        logger.info(f"Insight created with id: {result.inserted_id}")

        return DataResponse(
            success=True,
            id=str(result.inserted_id),
            message="Insight created successfully",
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        logger.error(f"Failed to create insight: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create insight: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
