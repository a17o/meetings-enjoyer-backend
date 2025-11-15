#!/usr/bin/env python3
"""
Test WebSocket client for the Meeting Enjoyer API.

This script connects to the websocket endpoint, sends a call_id,
and listens for answers when questions are processed.
"""

import asyncio
import json
import sys
from websockets.client import connect
from websockets.exceptions import ConnectionClosedError, ConnectionClosedOK


async def test_websocket(call_id: str, server_url: str = "ws://localhost:8080/ws"):
    """
    Test the websocket connection with a call_id.
    
    Args:
        call_id: The call_id to register with the websocket
        server_url: The websocket server URL
    """
    print(f"Connecting to {server_url}...")
    
    try:
        async with connect(
            server_url,
            ping_interval=20,
            ping_timeout=10,
            close_timeout=10
        ) as websocket:
            print("Connected to websocket")
            
            # Send call_id as the first message
            message = {"call_id": call_id}
            print(f"Sending call_id: {call_id}")
            await websocket.send(json.dumps(message))
            
            # Wait for confirmation
            try:
                response_text = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                data = json.loads(response_text)
                print(f"Received: {data}")
            except asyncio.TimeoutError:
                print("Timeout waiting for connection confirmation")
                return
            
            if data.get("status") == "connected":
                print(f"Successfully registered with call_id: {call_id}")
                print("Listening for answers...")
                print("Now you can make a POST request to /questions with this call_id")
                print("   Example:")
                print('   curl -X POST http://localhost:8080/questions \\')
                print('     -H "Content-Type: application/json" \\')
                print(f'     -d \'{{"call_id": "{call_id}", "question": "who is a good boy?"}}\'')
                print()
                
                try:
                    while True:
                        response_text = await websocket.recv()
                        data = json.loads(response_text)
                        
                        if data.get("echo"):
                            continue
                        
                        print(f"Received message: {json.dumps(data, indent=2)}")
                        
                        if "answer" in data:
                            print()
                            print("=" * 60)
                            print("ANSWER RECEIVED!")
                            print(f"   Call ID: {data.get('call_id')}")
                            print(f"   Question: {data.get('question_text')}")
                            print(f"   Answer: {data.get('answer')}")
                            print("=" * 60)
                            print()
                        
                except (ConnectionClosedError, ConnectionClosedOK) as e:
                    print(f"\nConnection closed: {e}")
                except KeyboardInterrupt:
                    print("\nDisconnecting...")
            else:
                print(f"Unexpected response: {data}")
                
    except ConnectionClosedError as e:
        print(f"Connection closed unexpectedly: {e}")
    except ConnectionClosedOK:
        print("Connection closed normally")
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()


async def interactive_mode(server_url: str = "ws://localhost:8080/ws"):
    """
    Interactive mode where user can input call_id and see responses.
    """
    print("=" * 60)
    print("WebSocket Test Client - Interactive Mode")
    print("=" * 60)
    print()
    
    call_id = input("Enter call_id (or press Enter for default 'test-123'): ").strip()
    if not call_id:
        call_id = "test-123"
    
    print()
    await test_websocket(call_id, server_url)


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test WebSocket client for Meeting Enjoyer API")
    parser.add_argument(
        "--call-id",
        type=str,
        help="Call ID to use (default: 'test-123')"
    )
    parser.add_argument(
        "--url",
        type=str,
        default="ws://localhost:8080/ws",
        help="WebSocket server URL (default: ws://localhost:8080/ws)"
    )
    
    args = parser.parse_args()
    
    call_id = args.call_id or "test-123"
    
    try:
        asyncio.run(test_websocket(call_id, args.url))
    except KeyboardInterrupt:
        print("\nGoodbye!")
        sys.exit(0)


if __name__ == "__main__":
    # If no arguments, run in interactive mode
    if len(sys.argv) == 1:
        asyncio.run(interactive_mode())
    else:
        main()

