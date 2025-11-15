"""
ElevenLabs ConvAI API integration for making outbound phone calls.
"""
import os
import requests
from typing import Dict, Any
from datetime import datetime


def call_elevenlabs(
    phone_number: str,
    system_prompt: str = "",
    first_message: str = "",
    call_id: str = None
) -> Dict[str, Any]:
    """
    Make an outbound phone call using ElevenLabs ConvAI API.
    
    Args:
        phone_number: The phone number to call (international format, e.g., 447874943523)
        system_prompt: Optional system prompt/instructions for the ElevenLabs agent
        first_message: Optional first message the agent will say when the call connects
        call_id: Optional call ID to include in the system prompt
        
    Returns:
        Dictionary containing call result information
    """
    try:
        # ElevenLabs ConvAI outbound call endpoint
        endpoint_url = "https://api.elevenlabs.io/v1/convai/twilio/outbound-call"
        
        # Prepare payload for ElevenLabs API
        payload = {
            "agent_id": os.getenv("ELEVENLABS_AGENT_ID"),
            "agent_phone_number_id": os.getenv("ELEVENLABS_PHONE_NUMBER_ID"),
            "to_number": phone_number
        }
        
        # Add call_id to system prompt if provided
        if call_id:
            if system_prompt:
                system_prompt = f"{system_prompt}\n\nCALL ID: {call_id}"
            else:
                system_prompt = f"CALL ID: {call_id}"
        
        # Add optional parameters using conversation_config_override structure
        if system_prompt or first_message:
            payload["conversation_initiation_client_data"] = {
                "conversation_config_override": {
                    "agent": {}
                }
            }
            
            if system_prompt:
                payload["conversation_initiation_client_data"]["conversation_config_override"]["agent"]["prompt"] = {
                    "prompt": system_prompt
                }
            
            if first_message:
                payload["conversation_initiation_client_data"]["conversation_config_override"]["agent"]["first_message"] = first_message
        
        # Set required headers
        headers = {
            "Xi-Api-Key": os.getenv("ELEVENLABS_API_KEY"),
            "Api-Key": "xi-api-key",
            "Content-Type": "application/json",
            "User-Agent": "ElevenLabs-Caller/1.0"
        }
        
        # Make the API call
        response = requests.post(endpoint_url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            return {
                "success": True,
                "call_id": result.get("call_id"),
                "conversation_id": result.get("conversation_id"),
                "phone_number": phone_number,
                "status": result.get("status", "initiated"),
                "message": "ElevenLabs outbound call initiated successfully",
                "timestamp": datetime.now().isoformat(),
                "agent_id": os.getenv("ELEVENLABS_AGENT_ID"),
                "phone_number_id": os.getenv("ELEVENLABS_PHONE_NUMBER_ID"),
                "elevenlabs_response": result
            }
        else:
            return {
                "success": False,
                "error": f"ElevenLabs API Error {response.status_code}: {response.text}",
                "phone_number": phone_number,
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"Exception calling ElevenLabs API: {str(e)}",
            "phone_number": phone_number,
            "timestamp": datetime.now().isoformat()
        }
