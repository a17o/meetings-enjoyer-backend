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
    call_id: str = None
) -> Dict[str, Any]:
    """
    Make an outbound phone call using ElevenLabs ConvAI API.

    Args:
        phone_number: The phone number to call (international format, e.g., 447874943523)
        system_prompt: Meeting details to include in the system prompt (meeting_id, passcode, etc)
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

        dynamic_variables = {
            "call_id": call_id if call_id else ""
        }
        # Build the system prompt with meeting join instructions
        meeting_join_prompt = """You are joining a meeting. You are speaking with the google-meet phone robot until you have joined the meeting.
use your play keypad touch tool to join the call. Keep entering the code until you are let into the meeting. Wait for 20 seconds after calling the tool before responding. First enter the meeting ID as instructed (if present). then when prompted to do so enter the passcode.
{meeting_details}
Use individual tool calls for each character. Each dtmf tool call should only have one character. use many tool calls to input."""

        # Replace meeting_details placeholder with actual meeting details
        if system_prompt:
            meeting_join_prompt = meeting_join_prompt.replace("{meeting_details}", system_prompt)
        else:
            meeting_join_prompt = meeting_join_prompt.replace("{meeting_details}", "")

        # Add call_id to system prompt if provided
        if call_id:
            meeting_join_prompt = f"{meeting_join_prompt}\n\nCALL ID: {call_id}"

        # Always override the system prompt with meeting join instructions
        payload["conversation_initiation_client_data"] = {
            "conversation_config_override": {
                "agent": {
                    "prompt": {
                        "prompt": meeting_join_prompt
                    }
                },
                "dynamic_variables": dynamic_variables
            }
        }

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
