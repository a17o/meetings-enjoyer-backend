import json
import re
import datetime
import os
import pytz

import requests
from arcadepy import Arcade
from dotenv import load_dotenv

load_dotenv()

USER_ID = "florisfok5@gmail.com"
TOOL_NAME = "GoogleCalendar.ListEvents"

def call_backend(link):
    requests.get(f"https://enabling-chamois-unique.ngrok-free.app/call/{link}")
    print(f"Called backend with link: {link}")

def get_now():
    helsinki = pytz.timezone("Europe/Helsinki")
    return datetime.datetime.now(helsinki).replace(microsecond=0, second=0)

def get_time_range(now):
    print(f"Now: {now}")
    hour_start = now
    hour_end = hour_start + datetime.timedelta(hours=1)
    print(f"Hour start: {hour_start.isoformat()}")
    print(f"Hour end: {hour_end.isoformat()}")
    return hour_start.isoformat(), hour_end.isoformat()

def start_time_not_past_15_minutes(start_time, now):
    return start_time > now - datetime.timedelta(minutes=15)

def extract_meet_link(text):
    if not text:
        return None

    match = re.search(r"https://meet\.google\.com/[a-zA-Z0-9-]+", text)
    if match:
        return match.group(0)

    return None


def parse_datetime(raw_value, label):
    if not raw_value:
        print(f"Skipping event missing {label} datetime")
        return None

    normalized = raw_value.replace("Z", "+00:00")
    try:
        return datetime.datetime.fromisoformat(normalized)
    except ValueError:
        print(f"Invalid {label} datetime: {raw_value}")
        return None


def check_events(events, now):
    for event in events:
        link = extract_meet_link(event.get("description"))
        if not link:
            continue

        start_time = parse_datetime(event.get("start", {}).get("dateTime"), "start")
        end_time = parse_datetime(event.get("end", {}).get("dateTime"), "end")

        if not start_time or not end_time:
            continue

        # Make sure the event is happening now and the start time is not past 15 minutes since we pull every 15 min
        if start_time < now and end_time > now and start_time_not_past_15_minutes(start_time, now):
            print("Event is happening now")
            print(json.dumps(event, indent=2))

            call_backend(link)

def main():
    if "ARCADE_API_KEY" not in os.environ:
        print("ARCADE_API_KEY is not set")
        return

    now = get_now()
    last_hour, next_hour = get_time_range(now)
    client = Arcade()

    auth_response = client.tools.authorize(
        tool_name=TOOL_NAME,
        user_id=USER_ID
    )

    if auth_response.status != "completed":
        print(f"Click this link to authorize: {auth_response.url}")

    # Wait for the authorization to complete
    client.auth.wait_for_completion(auth_response)

    tool_input = {
        'min_end_datetime': last_hour,
        'max_start_datetime': next_hour,
        'calendar_id': USER_ID,
        'max_results': 25
    }

    response = client.tools.execute(
        tool_name=TOOL_NAME,
        input=tool_input,
        user_id=USER_ID,
    )

    # Validate events happening now
    check_events(response.output.value['events'], now)


if __name__ == "__main__":
    print("Starting CalendarCheck")
    main()
    print("CalendarCheck completed")
