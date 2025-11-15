import ReconnectingWebSocket from 'reconnecting-websocket'
import type { ServerEvent, ClientCommand, MeetingInfo } from '../types'
import type { AppStore } from '../store'

export class WSClient {
  private ws: ReconnectingWebSocket | null = null
  private store: AppStore
  private pingInterval: NodeJS.Timeout | null = null
  private lastPingTs: number = 0

  constructor(store: AppStore) {
    this.store = store
  }

  connect(url: string, token?: string): void {
    if (this.ws) {
      this.disconnect()
    }

    this.store.setConnectionStatus('connecting')
    this.log('info', `Connecting to ${url}`)

    // Build URL with query params
    const wsUrl = new URL(url)
    if (token) {
      wsUrl.searchParams.set('token', token)
    }
    wsUrl.searchParams.set('client', 'LaraConsole')

    this.ws = new ReconnectingWebSocket(wsUrl.toString(), [], {
      maxReconnectionDelay: 5000,
      minReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1.5,
      connectionTimeout: 4000,
      maxRetries: Infinity,
    })

    this.ws.addEventListener('open', this.handleOpen.bind(this))
    this.ws.addEventListener('message', this.handleMessage.bind(this))
    this.ws.addEventListener('close', this.handleClose.bind(this))
    this.ws.addEventListener('error', this.handleError.bind(this))
  }

  disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.store.setConnectionStatus('disconnected')
    this.log('info', 'Disconnected from WebSocket')
  }

  private handleOpen(): void {
    this.log('info', 'WebSocket connected')
    this.store.setConnectionStatus('connected')
    this.store.resetReconnectCount()

    // Send hello message
    this.send({
      type: 'hello',
      clientVersion: '0.1.0', // TODO: get from package.json
      supports: ['transcript', 'answer', 'task', 'call'],
    })

    // Start ping interval
    this.startPingInterval()

    this.store.addToast('success', 'Connected to server')
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: ServerEvent = JSON.parse(event.data)
      this.processServerEvent(message)
    } catch (error) {
      this.log('error', 'Failed to parse message', error)
    }
  }

  private handleClose(): void {
    this.log('warn', 'WebSocket closed')
    this.store.setConnectionStatus('disconnected')
    this.store.incrementReconnectCount()

    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    this.store.addToast('warning', 'Connection lost, reconnecting...')
  }

  private handleError(): void {
    this.log('error', 'WebSocket error occurred')
  }

  private processServerEvent(event: ServerEvent): void {
    this.log('debug', `Received event: ${event.type}`, event)

    switch (event.type) {
      case 'session_info':
        this.store.setSession({
          sessionId: event.sessionId,
          callSid: event.callSid,
          meetingLabel: event.meetingLabel,
          agentName: event.agentName,
        })
        break

      case 'transcript':
        this.store.addTranscriptLine({
          id: event.id,
          ts: event.ts,
          text: event.text,
          partial: event.partial,
          speaker: event.speaker,
          wake: event.wake,
        })
        break

      case 'wake_detected':
        this.store.addToast('info', `Wake word detected: "${event.phrase}"`)
        break

      case 'command_started':
        this.log('info', `Command started: ${event.commandId}`)
        break

      case 'agent_status':
        this.store.setAgentStatus(event.status)
        if (event.status === 'researching') {
          this.store.addToast('info', 'Agent is researching...')
        }
        break

      case 'answer_ready':
        this.store.addAnswer({
          answerId: event.answerId,
          commandId: event.commandId,
          ts: event.ts,
          text: event.text,
          sources: event.sources,
          metrics: event.metrics,
          status: 'ready',
        })
        this.store.addToast('success', 'Answer ready!')
        break

      case 'speaking_started':
        this.store.setAnswerStatus(event.answerId, 'approved')
        this.store.addToast('info', 'Agent is speaking...')
        break

      case 'speaking_ended':
        this.store.setAnswerStatus(event.answerId, 'spoken')
        this.store.moveAnswerToHistory(event.answerId)
        this.store.addToast('success', 'Speaking completed')
        break

      case 'speech_canceled':
        this.store.setAnswerStatus(event.answerId, 'rejected')
        this.store.addToast('info', 'Speech canceled')
        break

      case 'task_proposed':
        this.store.addTask({
          taskId: event.taskId,
          ts: event.ts,
          summary: event.summary,
          payload: event.payload,
          status: 'queued',
        })
        this.store.addToast('info', `New task: ${event.summary}`)
        break

      case 'task_status':
        this.store.updateTaskStatus(event.taskId, event.status, event.detail)
        if (event.status === 'success') {
          this.store.addToast('success', `Task completed: ${event.detail || event.taskId}`)
        } else if (event.status === 'failure') {
          this.store.addToast('error', `Task failed: ${event.detail || event.taskId}`)
        }
        break

      case 'call_status':
        this.store.setCallStatus(event.status, event.callSid)
        if (event.status === 'connected') {
          this.store.addToast('success', 'Call connected!')
        } else if (event.status === 'failed') {
          this.store.addToast('error', `Call failed: ${event.reason || 'Unknown error'}`)
        }
        break

      case 'pong':
        const rtt = Date.now() - this.lastPingTs
        this.store.setRTT(rtt)
        this.log('debug', `RTT: ${rtt}ms`)
        break

      case 'error':
        this.store.addToast('error', event.message)
        this.log('error', `Server error [${event.code}]: ${event.message}`)
        break

      default:
        this.log('warn', `Unknown event type: ${(event as any).type}`)
    }
  }

  // Public command methods
  send(command: ClientCommand): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('warn', 'Cannot send command: WebSocket not connected')
      return
    }

    this.log('debug', `Sending command: ${command.type}`, command)
    this.ws.send(JSON.stringify(command))
  }

  joinCall(meeting: MeetingInfo): void {
    this.send({ type: 'join_call', meeting })
  }

  endCall(): void {
    this.send({ type: 'end_call' })
  }

  forceCommandNext(): void {
    this.send({ type: 'force_command_next' })
  }

  approveSpeak(answerId: string): void {
    this.send({ type: 'approve_speak', answerId })
  }

  rejectAnswer(answerId: string, reason?: string): void {
    this.send({ type: 'reject_answer', answerId, reason })
  }

  cancelSpeech(answerId: string): void {
    this.send({ type: 'cancel_speech', answerId })
  }

  approveTask(taskId: string): void {
    this.send({ type: 'approve_task', taskId })
  }

  rejectTask(taskId: string, reason?: string): void {
    this.send({ type: 'reject_task', taskId, reason })
  }

  textQuery(text: string): void {
    this.send({ type: 'text_query', payload: { text } })
  }

  // Expose send method for custom commands (e.g., from ChatPill)
  sendMessage(command: ClientCommand): void {
    this.send(command)
  }

  requestHistory(limit?: number): void {
    this.send({ type: 'request_history', limit })
  }

  // Ping/pong heartbeat
  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }

    this.pingInterval = setInterval(() => {
      this.lastPingTs = Date.now()
      this.send({ type: 'ping', ts: this.lastPingTs })
    }, 15000) // Every 15 seconds
  }

  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any): void {
    const logEntry = `[WSClient] ${message}`
    if (level === 'error') {
      console.error(logEntry, data)
    } else if (level === 'warn') {
      console.warn(logEntry, data)
    } else if (level === 'debug') {
      console.debug(logEntry, data)
    } else {
      console.log(logEntry, data)
    }
  }
}
