from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, Dict
import os
from datetime import datetime
import logging
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


class V7EntityRequest(BaseModel):
    call_id: str
    question_text: str


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


@app.post("/process/question")
async def process_question(request: V7EntityRequest):
    """
    Create a V7 question entity and poll for the answer.
    
    Args:
        request: V7EntityRequest containing call_id and question_text
        
    Returns:
        The entity data from the GET request after creation
    """
    try:
        logger.info(f"Creating V7 entity with call_id: {request.call_id}")
        
        # Validate environment variables
        required_env_vars = [
            "V7_WORKSPACE_ID",
            "V7_PROJECT_ID",
            "V7_API_KEY"
        ]
        
        missing_vars = [var for var in required_env_vars if not os.getenv(var)]
        if missing_vars:
            raise HTTPException(
                status_code=500,
                detail=f"Missing required environment variables: {', '.join(missing_vars)}"
            )
        
        workspace_id = os.getenv('V7_WORKSPACE_ID')
        project_id = os.getenv('V7_PROJECT_ID')
        api_key = os.getenv('V7_API_KEY')
        
        # Create the entity
        create_url = f"https://go.v7labs.com/api/workspaces/{workspace_id}/projects/{project_id}/entities"
        headers = {"X-API-KEY": api_key}
        payload = {
            "fields": {
                "call_id": request.call_id,
                "question_text": request.question_text
            }
        }
        
        create_response = requests.post(create_url, json=payload, headers=headers)
        create_response.raise_for_status()
        create_data = create_response.json()
        
        logger.info(f"Entity created with id: {create_data.get('id')}")
        
        # Extract necessary IDs from the response
        entity_id = create_data.get('id')
        project_id_from_response = create_data.get('project_id')
        
        if not entity_id:
            raise HTTPException(
                status_code=500,
                detail="Failed to extract entity_id from V7 response"
            )
        
        if not project_id_from_response:
            raise HTTPException(
                status_code=500,
                detail="Failed to extract project_id from V7 response"
            )
        
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
                raise HTTPException(
                    status_code=504,
                    detail=f"Polling timeout after {max_poll_time} seconds. Answer not ready."
                )
            
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
                answer_value = tool_value.get('value')
                
                if answer_value is None:
                    raise HTTPException(
                        status_code=500,
                        detail="Answer is complete but value is not available"
                    )
                
                if request.call_id in websocket_connections:
                    try:
                        websocket = websocket_connections[request.call_id]
                        await websocket.send_text(json.dumps({
                            "call_id": request.call_id,
                            "answer": answer_value,
                            "question_text": request.question_text
                        }))
                        logger.info(f"Sent answer to websocket for call_id: {request.call_id}")
                    except Exception as e:
                        logger.error(f"Failed to send answer to websocket: {str(e)}")
                
                return {"answer": answer_value}
            
            if answer_field.get('error_message'):
                error_msg = answer_field.get('error_message')
                logger.error(f"Answer field has error: {error_msg}")
                raise HTTPException(
                    status_code=500,
                    detail=f"V7 answer processing error: {error_msg}"
                )
            
            # Wait before next poll
            time.sleep(poll_interval)
        
    except requests.exceptions.HTTPError as e:
        logger.error(f"V7 API HTTP error: {str(e)}")
        error_detail = f"V7 API error: {str(e)}"
        if hasattr(e.response, 'text'):
            error_detail += f" - {e.response.text}"
        raise HTTPException(
            status_code=e.response.status_code if hasattr(e, 'response') else 500,
            detail=error_detail
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"V7 entity creation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"V7 entity creation failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
