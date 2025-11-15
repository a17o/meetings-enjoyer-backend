"""
pip install elevenlabs asyncio base64 uuid4 logging fastapi websockets twilio
"""

import audioop
import asyncio
import base64
import time
import logging
import os
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from twilio.rest import Client
from twilio.twiml.voice_response import Connect, Stream, VoiceResponse
from elevenlabs import AudioFormat, CommitStrategy, ElevenLabs, RealtimeAudioOptions
from elevenlabs.realtime.connection import RealtimeEvents
from twilio.twiml.voice_response import Play, VoiceResponse

logger = logging.getLogger('uvicorn.error')


def _get_timeout_seconds(default: int = 5) -> int:
    raw_value = os.getenv("CALL_TIMEOUT_SECONDS", "5")
    if not raw_value:
        return default
    try:
        return int(raw_value)
    except ValueError:
        logger.warning("Invalid CALL_TIMEOUT_SECONDS=%s, falling back to %s seconds", raw_value, default)
        return default

api = FastAPI()

TRANSCRIPTION_DIR = Path(os.getenv("TRANSCRIPTION_DIR", "transcriptions"))
TRANSCRIPTION_MODEL_ID = os.getenv("ELEVENLABS_SCRIBE_MODEL_ID", "scribe_v2_realtime")
TRANSCRIPTION_LANGUAGE_CODE = os.getenv("ELEVENLABS_LANGUAGE_CODE", "en")
SCRIBE_SAMPLE_RATE = 16000
TWILIO_SAMPLE_RATE = 8000
CALL_TIMEOUT_SECONDS = _get_timeout_seconds()
CALL_TIMEOUT_TTS_MESSAGE = os.getenv("CALL_TIMEOUT_TTS_MESSAGE", "It has been 5 seconds.")
ELEVENLABS_TTS_VOICE_ID = os.getenv("ELEVENLABS_TTS_VOICE_ID","JBFqnCBsd6RMkjVDRZzb")
ELEVENLABS_TTS_MODEL_ID = os.getenv("ELEVENLABS_TTS_MODEL_ID", "eleven_flash_v2_5")


# meet.google.com/xay-ibps-qgd
#+31 20 708 8560	734 153 590 3394#

MEETING_PIN = "7341535903394#"
NUMBER_TO_CALL = "+31207088560" # "+442038733170"
WS_URL = "wss://enabling-chamois-unique.ngrok-free.app/stream"
TWILIO_ACCOUNT_SID = os.environ["TWILIO_ACCOUNT_SID"]
TWILIO_AUTH_TOKEN = os.environ["TWILIO_AUTH_TOKEN"]

elevenlabs = ElevenLabs()


def _prepare_transcription_file(call_sid: str) -> Path:
    TRANSCRIPTION_DIR.mkdir(parents=True, exist_ok=True)
    file_path = TRANSCRIPTION_DIR / f"{call_sid}.txt"
    try:
        file_path.write_text("", encoding="utf-8")
    except Exception as exc:
        logger.warning(f"Unable to initialize transcription file {file_path}: {exc}")
    return file_path


def _convert_mulaw_to_pcm16k(mulaw_bytes: bytes) -> Optional[bytes]:
    if not mulaw_bytes:
        return None

    try:
        pcm_linear = audioop.ulaw2lin(mulaw_bytes, 2)
        converted, _ = audioop.ratecv(
            pcm_linear, 2, 1, TWILIO_SAMPLE_RATE, SCRIBE_SAMPLE_RATE, None
        )
        return converted
    except Exception as exc:
        logger.error(f"Failed to convert Twilio audio chunk: {exc}")
        return None


def _synthesize_tts_timeout_sync(text: str) -> Optional[bytes]:
    logger.info(f"Synthesizing TTS audio for timeout: {text}")
    if not ELEVENLABS_TTS_VOICE_ID:
        logger.error("ELEVENLABS_TTS_VOICE_ID not configured; cannot synthesize TTS audio.")
        return None

    try:
        audio_iterator = elevenlabs.text_to_speech.convert(
            voice_id=ELEVENLABS_TTS_VOICE_ID,
            text=text,
            model_id=ELEVENLABS_TTS_MODEL_ID,
            output_format="ulaw_8000",
        )
        audio_bytes = b"".join(audio_iterator)
    except Exception as exc:
        logger.exception(f"Failed to synthesize ElevenLabs TTS audio: {exc}")
        return None

    if not audio_bytes:
        logger.warning("ElevenLabs TTS returned empty audio payload.")
        return None

    return audio_bytes


async def _synthesize_tts_timeout_audio(text: str) -> Optional[bytes]:
    return await asyncio.to_thread(_synthesize_tts_timeout_sync, text)


async def _send_twilio_audio(ws: WebSocket, stream_sid: str, audio_bytes: bytes) -> bool:
    chunk_size = 320  # ~40ms at 8kHz for mu-law audio
    sent_chunks = 0

    for index in range(0, len(audio_bytes), chunk_size):
        chunk = audio_bytes[index:index + chunk_size]
        if not chunk:
            continue

        payload = base64.b64encode(chunk).decode("ascii")
        message = {
            "event": "media",
            "streamSid": stream_sid,
            "media": {
                "payload": payload,
                "sampleRate": str(TWILIO_SAMPLE_RATE),
                "track": "outbound_track",
            },
        }

        try:
            await ws.send_json(message)
            sent_chunks += 1
        except Exception as exc:
            logger.warning(f"Failed to send timeout audio chunk to Twilio: {exc}")
            return False

        chunk_duration = len(chunk) / TWILIO_SAMPLE_RATE
        if chunk_duration > 0:
            await asyncio.sleep(chunk_duration)

    logger.info("Sent %s timeout audio chunks to Twilio stream %s", sent_chunks, stream_sid)
    return sent_chunks > 0


async def _announce_timeout(ws: WebSocket, stream_sid: str) -> None:
    audio_bytes = await _synthesize_tts_timeout_audio(CALL_TIMEOUT_TTS_MESSAGE)
    if not audio_bytes:
        logger.warning("Skipping timeout announcement due to missing audio data.")
        return

    await _send_twilio_audio(ws, stream_sid, audio_bytes)


async def create_scribe_connection(call_sid: str) -> Optional[Any]:
    """
    Initialize a Scribe realtime connection for a given call.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    logger.info(f"Starting Scribe connection for call {call_sid}")

    if not api_key:
        logger.error("ELEVENLABS_API_KEY not set; skipping transcription.")
        return None

    transcription_file = _prepare_transcription_file(call_sid)

    try:
        connection = await elevenlabs.speech_to_text.realtime.connect(
            RealtimeAudioOptions(
                model_id=TRANSCRIPTION_MODEL_ID,
                language_code=TRANSCRIPTION_LANGUAGE_CODE,
                audio_format=AudioFormat.PCM_16000,
                sample_rate=SCRIBE_SAMPLE_RATE,
                commit_strategy=CommitStrategy.VAD,
                vad_silence_threshold_secs=1.5,
                vad_threshold=0.4,
                min_speech_duration_ms=100,
                min_silence_duration_ms=100,
                include_timestamps=False,
            )
        )
    except Exception as exc:
        logger.exception(f"Failed to connect to ElevenLabs Scribe: {exc}")
        return None

    def on_partial_transcript(data):
        text = data.get("text")
        if text:
            logger.debug(f"Partial transcript ({call_sid}): {text}")
        else:
            logger.debug(f"No text in partial transcript ({call_sid})")

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

    print(connection)
    print(connection.__dict__)
    connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, on_partial_transcript)
    connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, on_committed_transcript)
    connection.on(RealtimeEvents.ERROR, on_error)
    connection.on(RealtimeEvents.CLOSE, on_close)

    return connection


def create_call():
    """Generate TwiML to connect a call to a Twilio Media Stream"""
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

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
        to=NUMBER_TO_CALL,
        from_=os.environ["TWILIO_PHONE_NUMBER"],
    )
    print("Call SID: ", call.sid)

@api.get("/webhook")
async def webhook():
    logger.info("Webhook received")
    print("HOERAY")
    return HTMLResponse(content="Webhook received")

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
        t1 = time.time()
        timeout_announced = False
        while True:
            event = await ws.receive_json()
            event_type = event["event"]

            if not timeout_announced and time.time() - t1 > CALL_TIMEOUT_SECONDS:
                timeout_announced = True
                logger.warning("Call timed out after %s seconds", CALL_TIMEOUT_SECONDS)
                await _announce_timeout(ws, stream_sid)
        

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
                # print("Media event received")
                payload = event["media"]["payload"]
                mulaw_bytes = base64.b64decode(payload)
                if scribe_connection:
                    pcm_bytes = _convert_mulaw_to_pcm16k(mulaw_bytes)
                    if not pcm_bytes:
                        logger.debug("Audio conversion failed; dropping media chunk.")
                        continue
                    audio_base64 = base64.b64encode(pcm_bytes).decode("ascii")
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
    create_call()
    uvicorn.run(api, host="0.0.0.0", port=8000)