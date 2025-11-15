"""
pip install elevenlabs asyncio base64 uuid4 logging fastapi websockets twilio
"""

import asyncio
import base64
import logging
import os
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from twilio.twiml.voice_response import Connect, Stream, VoiceResponse
from elevenlabs.speech_to_text.realtime import Scribe, AudioFormat


logger = logging.getLogger('uvicorn.error')

api = FastAPI()

TRANSCRIPTION_DIR = Path(os.getenv("TRANSCRIPTION_DIR", "transcriptions"))
TRANSCRIPTION_MODEL_ID = os.getenv("ELEVENLABS_SCRIBE_MODEL_ID", "scribe_v2_realtime")
TRANSCRIPTION_LANGUAGE_CODE = os.getenv("ELEVENLABS_LANGUAGE_CODE", "en")
SCRIBE_SAMPLE_RATE = 8000


def _prepare_transcription_file(call_sid: str) -> Path:
    TRANSCRIPTION_DIR.mkdir(parents=True, exist_ok=True)
    file_path = TRANSCRIPTION_DIR / f"{call_sid}.txt"
    try:
        file_path.write_text("", encoding="utf-8")
    except Exception as exc:
        logger.warning(f"Unable to initialize transcription file {file_path}: {exc}")
    return file_path


async def create_scribe_connection(call_sid: str) -> Optional[Scribe]:
    """
    Initialize a Scribe realtime connection for a given call.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")

    if not api_key:
        logger.error("ELEVENLABS_API_KEY not set; skipping transcription.")
        return None

    transcription_file = _prepare_transcription_file(call_sid)

    try:
        connection = await Scribe.connect(
            api_key,
            model_id=TRANSCRIPTION_MODEL_ID,
            audio_format=AudioFormat.ULAW_8000,
            language_code=TRANSCRIPTION_LANGUAGE_CODE,
        )
    except Exception as exc:
        logger.exception(f"Failed to connect to ElevenLabs Scribe: {exc}")
        return None

    def on_partial_transcript(data):
        text = data.get("text")
        if text:
            logger.debug(f"Partial transcript ({call_sid}): {text}")

    def on_committed_transcript(data):
        text = data.get("text")
        if not text:
            return

        logger.info(f"Committed transcript ({call_sid}): {text}")
        try:
            with transcription_file.open("a", encoding="utf-8") as f:
                f.write(text + " ")
        except Exception as file_exc:
            logger.error(f"Error writing transcription file {transcription_file}: {file_exc}")

    def on_error(error):
        logger.error(f"Scribe connection error ({call_sid}): {error}")

    def on_close():
        logger.info(f"Scribe connection closed ({call_sid}).")

    connection.on_partial_transcript(on_partial_transcript)
    connection.on_committed_transcript(on_committed_transcript)
    connection.on_error(on_error)
    connection.on_close(on_close)

    return connection

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

    scribe_connection = await create_scribe_connection(call_sid)

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
                if scribe_connection:
                    audio_base64 = base64.b64encode(mulaw_bytes).decode("ascii")
                    try:
                        await scribe_connection.send(
                            {
                                "audio_base_64": audio_base64,
                                "sample_rate": SCRIBE_SAMPLE_RATE,
                            }
                        )
                    except Exception as exc:
                        logger.exception(f"Failed to send audio chunk to Scribe: {exc}")
                else:
                    logger.debug("Scribe connection unavailable; dropping media chunk.")

    try:
        await websocket_loop()
    except (KeyboardInterrupt, asyncio.CancelledError, WebSocketDisconnect):
        logger.warning("Process interrupted, exiting...")
    except Exception as ex:
        logger.exception(f"Unexpected Error: {ex}")
    finally:
        if scribe_connection:
            try:
                await scribe_connection.commit()
            except Exception as exc:
                logger.warning(f"Error committing Scribe session: {exc}")
            try:
                await scribe_connection.close()
            except Exception as exc:
                logger.warning(f"Error while closing Scribe connection: {exc}")
        try:
            await ws.close()
        except Exception as ex:
            logger.warning(f"Error while closing WebSocket: {ex}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(api, host="0.0.0.0", port=8000)