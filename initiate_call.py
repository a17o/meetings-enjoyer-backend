import os
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

MEETING_PIN = "4737005688855#"
WS_URL = "wss://enabling-chamois-unique.ngrok-free.app/stream"

# Set to True to enable voice announcements for testing
# This helps verify that tones are being sent (you'll hear announcements)
TEST_MODE = False

# Find your Account SID and Auth Token at twilio.com/console
# and set the environment variables. See http://twil.io/secure
account_sid = os.environ["TWILIO_ACCOUNT_SID"]
auth_token = os.environ["TWILIO_AUTH_TOKEN"]
client = Client(account_sid, auth_token)

twiml = f"""<Response>
    <Pause length="9"/>
    <Play digits="{MEETING_PIN}"/>
    <Pause length="10"/>
    <Connect>
        <Stream url="{WS_URL}" />
    </Connect>
</Response>"""

call = client.calls.create(
    twiml=twiml,
    to="+442038733170", # Google Meet
    from_=os.environ["TWILIO_PHONE_NUMBER"],
)

print(call.sid)
