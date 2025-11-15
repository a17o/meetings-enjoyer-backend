"""
Test script to parse meeting info and make an ElevenLabs phone call.

Usage:
    python test_call.py <meeting_blurb_file>

Example:
    python test_call.py meeting.txt

Or provide meeting info directly as second argument:
    python test_call.py parse "Meeting info here..."
"""

import sys
import json
import os
from dotenv import load_dotenv
from elevenlabs import call_elevenlabs
from parse_meeting_info import parse_meeting_info

# Load environment variables
load_dotenv()

def test_call_with_parsing(meeting_blurb: str):
    """
    Parse meeting info and make a call.

    Args:
        meeting_blurb: Raw meeting information text
    """
    print(f"\n{'='*60}")
    print("Parsing Meeting Information with Gemini")
    print(f"{'='*60}\n")

    # Parse meeting info
    print("🤖 Calling Gemini API to parse meeting info...")
    parse_result = parse_meeting_info(meeting_blurb)

    if not parse_result.get("success"):
        print(f"\n❌ Failed to parse meeting info!")
        print(f"Error: {parse_result.get('error')}")
        return

    phone_number = parse_result.get("phone_number")
    meeting_credentials = parse_result.get("meeting_credentials")

    print(f"\n✅ Successfully parsed meeting info!")
    print(f"\nExtracted Information:")
    print("-" * 60)
    print(f"Phone Number: {phone_number}")
    print(f"Meeting Credentials: {meeting_credentials}")
    print("-" * 60)

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
    # Default meeting blurb for testing
    DEFAULT_MEETING_BLURB = """Hackathon Catch up
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
davidgelberg@gmail.com
Charlie Cheesman
cronadev@gmail.com
FlorisFok5@gmail.com
10 minutes before
Fergus McKenzie-Wilson"""

    if len(sys.argv) > 1:
        # Check if first argument is a file path
        arg = sys.argv[1]
        if os.path.isfile(arg):
            # Read meeting info from file
            with open(arg, 'r') as f:
                meeting_blurb = f.read()
        elif arg == "parse" and len(sys.argv) > 2:
            # Use second argument as meeting blurb
            meeting_blurb = sys.argv[2]
        else:
            # Use argument as meeting blurb directly
            meeting_blurb = arg
    else:
        # Use default
        meeting_blurb = DEFAULT_MEETING_BLURB

    test_call_with_parsing(meeting_blurb)