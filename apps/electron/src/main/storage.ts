import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'

const USER_DATA_PATH = app.getPath('userData')
const CONFIG_FILE = path.join(USER_DATA_PATH, 'config.json')
const OVERLAY_FILE = path.join(USER_DATA_PATH, 'overlay.json')

export interface StoredConfig {
  backendUrl?: string
  authToken?: string
  agentName?: string
  wakePhrase?: string
  autoScrollTranscript?: boolean
  confirmBeforeSpeaking?: boolean
  autoRaiseHandHint?: boolean
  logToFile?: boolean
  mockMode?: boolean
  callId?: string
}

export interface StoredOverlay {
  collapsed: boolean
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

// Ensure userData directory exists
export async function ensureUserDataDir(): Promise<void> {
  try {
    await fs.mkdir(USER_DATA_PATH, { recursive: true })
    await fs.mkdir(path.join(USER_DATA_PATH, 'logs'), { recursive: true })
  } catch (error) {
    console.error('Failed to create user data directory:', error)
  }
}

// Config persistence
export async function loadConfig(): Promise<StoredConfig> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // Return defaults if file doesn't exist
    return {
      backendUrl: 'ws://localhost:8080/ws',
      authToken: '',
      agentName: 'Lara',
      wakePhrase: 'hey lara',
      autoScrollTranscript: true,
      confirmBeforeSpeaking: true,
      autoRaiseHandHint: true,
      logToFile: true,
      mockMode: false,
      callId: '1234',
    }
  }
}

export async function saveConfig(config: StoredConfig): Promise<void> {
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save config:', error)
  }
}

// Overlay state persistence
export async function loadOverlayState(): Promise<StoredOverlay> {
  try {
    const data = await fs.readFile(OVERLAY_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // Return defaults if file doesn't exist
    // Start in collapsed pill mode by default
    return {
      collapsed: true,
      bounds: {
        x: 0, // Will be set at runtime based on screen size
        y: 12,
        width: 300, // Pill width
        height: 90, // Pill height
      },
    }
  }
}

export async function saveOverlayState(state: StoredOverlay): Promise<void> {
  try {
    await fs.writeFile(OVERLAY_FILE, JSON.stringify(state, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save overlay state:', error)
  }
}

export function getUserDataPath(): string {
  return USER_DATA_PATH
}
