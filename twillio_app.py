import asyncio
import base64
import logging
from uuid import uuid4

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from twilio.twiml.voice_response import Connect, Stream, VoiceResponse


logger = logging.getLogger('uvicorn.error')

api = FastAPI()

# @api.post("/voice")
# def create_call(req: Request):
#     """Generate TwiML to connect a call to a Twilio Media Stream"""

#     host = req.url.hostname
#     scheme = req.url.scheme
#     ws_protocol = "ws" if scheme == "http" else "wss"
#     ws_url = f"{ws_protocol}://{host}/stream"

#     stream = Stream(url=ws_url)
#     connect = Connect()
#     connect.append(stream)
#     response = VoiceResponse()
#     response.append(connect)

#     logger.info(response)

#     response = HTMLResponse(content=str(response), media_type="application/xml")
#     print(response)
#     return response


@api.websocket("/stream")
async def twilio_websocket(ws: WebSocket):
    """Handle Twilio Media Stream WebSocket connection"""

    await ws.accept()
    await ws.receive_json()  # throw away `connected` event

    start_event = await ws.receive_json()
    assert start_event["event"] == "start"

    call_sid = start_event["start"]["callSid"]
    stream_sid = start_event["streamSid"]
    user_id = uuid4().hex  # Fake user ID for this example

    async def websocket_loop():
        """
        Handle incoming WebSocket messages to Agent.
        """
        while True:
            event = await ws.receive_json()
            event_type = event["event"]

            if event_type == "stop":
                logger.debug(f"Call ended by Twilio. Stream SID: {stream_sid}")
                break

            if event_type == "start" or event_type == "connected":
                logger.warning(f"Unexpected Twilio Initialization event: {event}")
                continue

            elif event_type == "dtmf":
                digit = event["dtmf"]["digit"]
                logger.info(f"DTMF: {digit}")
                continue

            elif event_type == "mark":
                logger.info(f"Twilio sent a Mark Event: {event}")
                continue

            elif event_type == "media":
                payload = event["media"]["payload"]
                mulaw_bytes = base64.b64decode(payload)
                print(mulaw_bytes)

    try:
        await websocket_loop()
    except (KeyboardInterrupt, asyncio.CancelledError, WebSocketDisconnect):
        logger.warning("Process interrupted, exiting...")
    except Exception as ex:
        logger.exception(f"Unexpected Error: {ex}")
    finally:
        try:
            await ws.close()
        except Exception as ex:
            logger.warning(f"Error while closing WebSocket: {ex}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(api, host="0.0.0.0", port=8000)