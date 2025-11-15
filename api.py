from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from datetime import datetime
import logging

from elevenlabs import call_elevenlabs

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Meeting Enjoyer API",
    description="API that provides tools for V7, Eleven Labs, etc",
    version="1.0.0"
)

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


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
