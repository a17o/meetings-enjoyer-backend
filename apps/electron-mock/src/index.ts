import { WebSocketServer, WebSocket } from 'ws'

interface MockServerOptions {
  port: number
  slowAnswer: boolean
  failJoin: boolean
}

const args = process.argv.slice(2)
const options: MockServerOptions = {
  port: 9001,
  slowAnswer: args.includes('--slow-answer'),
  failJoin: args.includes('--fail-join'),
}

if (args.includes('--port')) {
  const portIndex = args.indexOf('--port')
  options.port = parseInt(args[portIndex + 1]) || 9001
}

const wss = new WebSocketServer({ port: options.port })

console.log(`🎭 Mock WebSocket server running on ws://localhost:${options.port}`)
console.log(`Options:`, options)

let clientCounter = 0

wss.on('connection', (ws: WebSocket) => {
  const clientId = ++clientCounter
  console.log(`[Client ${clientId}] Connected`)

  let sessionId = `mock_session_${Date.now()}`
  let callSid: string | null = null
  let currentCommandId: string | null = null
  let currentAnswerId: string | null = null
  let pingInterval: NodeJS.Timeout

  // Send session_info on connect
  setTimeout(() => {
    send(ws, {
      type: 'session_info',
      sessionId,
      agentName: 'Lara',
      meetingLabel: 'Mock Meeting',
    })
  }, 100)

  // Start transcript stream after connection
  setTimeout(() => startTranscriptStream(ws, options), 2000)

  // Setup ping interval
  pingInterval = setInterval(() => {
    // Clients should ping us, but we respond with pong
  }, 15000)

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString())
      console.log(`[Client ${clientId}] Received:`, message.type)

      handleClientMessage(ws, message, { sessionId, callSid, currentCommandId, currentAnswerId, options })
    } catch (error) {
      console.error(`[Client ${clientId}] Error parsing message:`, error)
    }
  })

  ws.on('close', () => {
    console.log(`[Client ${clientId}] Disconnected`)
    clearInterval(pingInterval)
  })

  ws.on('error', (error) => {
    console.error(`[Client ${clientId}] Error:`, error)
  })
})

function send(ws: WebSocket, message: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}

function handleClientMessage(
  ws: WebSocket,
  message: any,
  context: {
    sessionId: string
    callSid: string | null
    currentCommandId: string | null
    currentAnswerId: string | null
    options: MockServerOptions
  }
) {
  switch (message.type) {
    case 'hello':
      console.log('Client hello:', message)
      break

    case 'ping':
      send(ws, {
        type: 'pong',
        ts: message.ts,
        serverTs: Date.now(),
      })
      break

    case 'join_call':
      handleJoinCall(ws, message, context)
      break

    case 'end_call':
      send(ws, {
        type: 'call_status',
        status: 'ended',
        callSid: context.callSid,
      })
      context.callSid = null
      break

    case 'force_command_next':
      console.log('Force command armed')
      // Next transcript will trigger a command
      break

    case 'approve_speak':
      handleApproveSpeak(ws, message.answerId, context)
      break

    case 'reject_answer':
      console.log('Answer rejected:', message.answerId)
      break

    case 'cancel_speech':
      send(ws, {
        type: 'speech_canceled',
        answerId: message.answerId,
      })
      send(ws, {
        type: 'agent_status',
        status: 'idle',
      })
      break

    case 'approve_task':
      handleApproveTask(ws, message.taskId)
      break

    case 'reject_task':
      send(ws, {
        type: 'task_status',
        taskId: message.taskId,
        status: 'rejected',
      })
      break

    default:
      console.log('Unknown message type:', message.type)
  }
}

function handleJoinCall(ws: WebSocket, message: any, context: any) {
  const callSid = `CA${Math.random().toString(36).substring(2, 15)}`

  send(ws, {
    type: 'call_status',
    status: 'dialing',
    callSid,
  })

  setTimeout(() => {
    if (context.options.failJoin) {
      send(ws, {
        type: 'call_status',
        status: 'failed',
        callSid,
        reason: 'Mock: Simulated join failure',
      })
    } else {
      send(ws, {
        type: 'call_status',
        status: 'connected',
        callSid,
      })
      context.callSid = callSid
    }
  }, 2000)
}

function startTranscriptStream(ws: WebSocket, options: MockServerOptions) {
  const transcripts = [
    { speaker: 'Alice', text: 'Hello everyone, thanks for joining the meeting.' },
    { speaker: 'Bob', text: 'Happy to be here.' },
    { speaker: 'Alice', text: 'hey lara what is the capital provider to BeaconPoint?' },
    { speaker: 'Charlie', text: 'Good question.' },
  ]

  let index = 0
  const interval = setInterval(() => {
    if (index >= transcripts.length) {
      clearInterval(interval)
      return
    }

    const t = transcripts[index]
    const isWake = t.text.toLowerCase().includes('hey lara')

    send(ws, {
      type: 'transcript',
      id: `tr_${Date.now()}_${index}`,
      ts: Date.now(),
      text: t.text,
      partial: false,
      speaker: t.speaker,
      wake: isWake,
    })

    // Trigger wake flow
    if (isWake) {
      setTimeout(() => triggerWakeFlow(ws, options), 500)
    }

    index++
  }, 3000)
}

function triggerWakeFlow(ws: WebSocket, options: MockServerOptions) {
  const commandId = `cmd_${Date.now()}`

  send(ws, {
    type: 'wake_detected',
    ts: Date.now(),
    phrase: 'hey lara',
    by: 'Alice',
  })

  send(ws, {
    type: 'command_started',
    commandId,
    ts: Date.now(),
    method: 'wake',
  })

  send(ws, {
    type: 'agent_status',
    commandId,
    status: 'listening',
  })

  setTimeout(() => {
    send(ws, {
      type: 'agent_status',
      commandId,
      status: 'researching',
    })

    // Delay answer if --slow-answer flag
    const answerDelay = options.slowAnswer ? 5000 : 2000

    setTimeout(() => {
      const answerId = `ans_${Date.now()}`
      send(ws, {
        type: 'answer_ready',
        answerId,
        commandId,
        ts: Date.now(),
        text: "BeaconPoint's capital provider is Acme Partners; the investment closed on 2021-05-14.",
        sources: [
          {
            id: 'v7_doc_112',
            title: 'BeaconPoint Overview',
            snippet: 'Investment by Acme Partners in May 2021...',
          },
        ],
        metrics: {
          latencyMs: 2800,
          confidence: 0.84,
        },
      })

      send(ws, {
        type: 'agent_status',
        commandId,
        status: 'ready',
      })

      // Propose a task after answer
      setTimeout(() => {
        send(ws, {
          type: 'task_proposed',
          taskId: `task_${Date.now()}`,
          ts: Date.now(),
          summary: 'Send follow-up email to Tom with BeaconPoint documents',
          payload: {
            recipient: 'tom@client.com',
            docs: ['v7_doc_112'],
          },
        })
      }, 3000)
    }, answerDelay)
  }, 1000)
}

function handleApproveSpeak(ws: WebSocket, answerId: string, context: any) {
  send(ws, {
    type: 'speaking_started',
    answerId,
    ts: Date.now(),
  })

  send(ws, {
    type: 'agent_status',
    status: 'speaking',
  })

  setTimeout(() => {
    send(ws, {
      type: 'speaking_ended',
      answerId,
      ts: Date.now(),
      durationMs: 4500,
    })

    send(ws, {
      type: 'agent_status',
      status: 'idle',
    })
  }, 4500)
}

function handleApproveTask(ws: WebSocket, taskId: string) {
  send(ws, {
    type: 'task_status',
    taskId,
    status: 'queued',
  })

  setTimeout(() => {
    send(ws, {
      type: 'task_status',
      taskId,
      status: 'running',
    })

    setTimeout(() => {
      send(ws, {
        type: 'task_status',
        taskId,
        status: 'success',
        detail: 'Email sent successfully',
      })
    }, 2000)
  }, 500)
}
