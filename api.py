from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from datetime import datetime
import logging
from motor.motor_asyncio import AsyncIOMotorClient

from elevenlabs import call_elevenlabs

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Health check",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/health")
async def health_check():
    """Detailed health check with environment validation"""
    env_status = {
        "ELEVENLABS_API_KEY": bool(os.getenv("ELEVENLABS_API_KEY")),
        "ELEVENLABS_AGENT_ID": bool(os.getenv("ELEVENLABS_AGENT_ID")),
        "ELEVENLABS_PHONE_NUMBER_ID": bool(os.getenv("ELEVENLABS_PHONE_NUMBER_ID"))
    }
    
    all_configured = all(env_status.values())
    
    return {
        "status": "healthy" if all_configured else "partial",
        "environment": env_status,
        "ready": all_configured,
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
    Store a question for a given call_id in MongoDB.

    Args:
        request: QuestionRequest containing call_id and question

    Returns:
        DataResponse with the created question information
    """
    try:
        logger.info(f"Creating question for call_id: {request.call_id}")

        # Create question document
        question_document = {
            "call_id": request.call_id,
            "question": request.question,
            "created_at": datetime.now().isoformat()
        }

        # Insert into MongoDB
        result = await db.questions.insert_one(question_document)

        logger.info(f"Question created with id: {result.inserted_id}")

        return DataResponse(
            success=True,
            id=str(result.inserted_id),
            message="Question created successfully",
            timestamp=datetime.now().isoformat()
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
