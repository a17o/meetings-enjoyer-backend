"""
Test script to make an actual ElevenLabs phone call with meeting credentials.

Usage:
    python test_call.py <phone_number> <meeting_credentials>

Example:
    python test_call.py +1234567890 "Meeting ID: 123-456-789, Passcode: 9876"
"""

import sys
import json
import os
from dotenv import load_dotenv
from elevenlabs import call_elevenlabs

# Load environment variables
load_dotenv()

def test_call(phone_number: str, meeting_credentials: str = ""):
    """
    Make an actual call using the ElevenLabs API.

    Args:
        phone_number: Phone number to call (e.g., +1234567890)
        meeting_credentials: Meeting details like ID and passcode
    """
    print(f"\n{'='*60}")
    print("Making ElevenLabs Call")
    print(f"{'='*60}")
    print(f"Phone Number: {phone_number}")
    print(f"Meeting Credentials: {meeting_credentials}")
    print(f"Call ID: test_call_001")
    print(f"{'='*60}\n")

    print("🔄 Calling ElevenLabs API...")
    print("-" * 60)

    try:
        # Make the actual call
        result = call_elevenlabs(
            phone_number=phone_number,
            system_prompt=meeting_credentials,
            call_id="test_call_001"
        )

        print("\n📞 API Response:")
        print("-" * 60)
        print(json.dumps(result, indent=2))
        print("-" * 60)

        if result.get("success"):
            print(f"\n✅ Call initiated successfully!")
            print(f"Call ID: {result.get('call_id')}")
            print(f"Conversation ID: {result.get('conversation_id')}")
            print(f"Status: {result.get('status')}")
            print(f"Message: {result.get('message')}")
        else:
            print(f"\n❌ Call failed!")
            print(f"Error: {result.get('error')}")

    except Exception as e:
        print(f"\n❌ Exception occurred:")
        print(f"Error: {str(e)}")

    print(f"\n{'='*60}\n")

if __name__ == "__main__":
    # Default values for testing
    DEFAULT_PHONE = "+442039563891"#"+442034815237"
    DEFAULT_CREDENTIALS = """PIN: 485 709 205#"""#"Meeting ID: 943 0401 4125 Passcode: 810119"

    phone = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PHONE
    credentials = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_CREDENTIALS

    test_call(phone, credentials)