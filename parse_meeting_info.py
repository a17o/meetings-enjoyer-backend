"""
Parse meeting information using Google Gemini Flash 2.5 to extract phone number and credentials.
"""
import os
import json
import google.generativeai as genai
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

def parse_meeting_info(meeting_blurb: str) -> Dict[str, Any]:
    """
    Parse meeting information to extract UK phone number and meeting credentials.

    Args:
        meeting_blurb: Raw meeting information text (Zoom, Google Meet, etc.)

    Returns:
        Dictionary with:
        - phone_number: UK phone number in format +44xxxxxxxxxx
        - meeting_credentials: Meeting ID/PIN/Passcode information
        - success: Boolean indicating if parsing was successful
        - error: Error message if parsing failed
    """
    try:
        # Configure Gemini
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

        # Use Gemini Flash 2.5
        model = genai.GenerativeModel('gemini-2.5-flash')

        # Craft the prompt
        prompt = f"""You are a meeting information parser. Extract the UK phone number and meeting credentials from the following meeting information.

IMPORTANT RULES:
1. Always select a UK phone number (starting with +44) if available
2. Remove all spaces from the phone number
3. Keep the phone number in international format starting with +
4. For meeting credentials, preserve the original formatting exactly as shown
5. Return ONLY valid JSON, no markdown formatting, no code blocks

Meeting Information:
{meeting_blurb}

Return a JSON object with this exact structure:
{{
  "phone_number": "+44xxxxxxxxxx",
  "meeting_credentials": "exact meeting ID/PIN/Passcode text"
}}"""

        # Generate response
        response = model.generate_content(prompt)

        # Parse the JSON response
        response_text = response.text.strip()

        # Remove markdown code blocks if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        # Parse JSON
        result = json.loads(response_text)

        return {
            "success": True,
            "phone_number": result.get("phone_number", ""),
            "meeting_credentials": result.get("meeting_credentials", ""),
            "raw_response": response_text
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to parse meeting info: {str(e)}",
            "phone_number": "",
            "meeting_credentials": ""
        }


if __name__ == "__main__":
    # Test with example
    test_blurb = """
Hackathon Catch up
Saturday, 15 November⋅9:00 – 10:00pm

Join with Google Meet
meet.google.com/qqx-rxwi-rby
Join by phone
(GB) +44 20 3956 3891 PIN: 485 709 205#
More phone numbers
Take meeting notes
Start a new document to capture notes
5 guests
2 yes
3 awaiting
Fergus McKenzie-Wilson
Organiser
David
Charlie Cheesman
Ashe
Floris
10 minutes before
Fergus McKenzie-Wilson"""

    result = parse_meeting_info(test_blurb)
    print(json.dumps(result, indent=2))