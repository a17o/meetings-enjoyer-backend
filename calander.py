import json
from arcadepy import Arcade
import requests
import datetime
import pytz
import os
from dotenv import load_dotenv
load_dotenv()

USER_ID = "florisfok5@gmail.com"
TOOL_NAME = "GoogleCalendar.ListEvents"

def call_backend(link):
    pass

def get_now():
    helsinki = pytz.timezone("Europe/Helsinki")
    return datetime.datetime.now(helsinki).replace(microsecond=0, second=0)

def get_time_range(now):
    last_hour = (now - datetime.timedelta(hours=3)).isoformat()
    next_hour = (now + datetime.timedelta(hours=3)).isoformat()
    return last_hour, next_hour


def check_events(events, now):
    for event in events:
        text = event['description']

        if "meet.google.com/" in text:
            link_index = text.index("meet.google.com/")
            link_end_index = text.index('"', link_index)
            link = text[link_index:link_end_index]

            start_time = datetime.datetime.fromisoformat(event['start']['dateTime'])
            end_time = datetime.datetime.fromisoformat(event['end']['dateTime'])

            if start_time < now and end_time > now:
                print("Event is happening now")
                print(event)
                
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
    main()