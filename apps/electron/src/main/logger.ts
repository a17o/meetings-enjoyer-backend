import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'

const LOGS_DIR = path.join(app.getPath('userData'), 'logs')

let loggingEnabled = true

export function setLoggingEnabled(enabled: boolean): void {
  loggingEnabled = enabled
}

function getLogFileName(): string {
  const now = new Date()
  const date = now.toISOString().split('T')[0] // YYYY-MM-DD
  return `${date}.log`
}

function formatLogEntry(level: string, message: string, data?: any): string {
  const timestamp = new Date().toISOString()
  const dataStr = data ? ` ${JSON.stringify(data)}` : ''
  return `[${timestamp}] [${level}] ${message}${dataStr}\n`
}

async function writeLog(level: string, message: string, data?: any): Promise<void> {
  if (!loggingEnabled) return

  try {
    const logFile = path.join(LOGS_DIR, getLogFileName())
    const entry = formatLogEntry(level, message, data)
    await fs.appendFile(logFile, entry, 'utf-8')
  } catch (error) {
    console.error('Failed to write log:', error)
  }
}

export const logger = {
  info: (message: string, data?: any) => {
    console.log(message, data)
    return writeLog('INFO', message, data)
  },
  warn: (message: string, data?: any) => {
    console.warn(message, data)
    return writeLog('WARN', message, data)
  },
  error: (message: string, data?: any) => {
    console.error(message, data)
    return writeLog('ERROR', message, data)
  },
  debug: (message: string, data?: any) => {
    console.debug(message, data)
    return writeLog('DEBUG', message, data)
  },
}

// Clean up old log files (keep last 7 days)
export async function cleanOldLogs(): Promise<void> {
  try {
    const files = await fs.readdir(LOGS_DIR)
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    for (const file of files) {
      if (!file.endsWith('.log')) continue

      const filePath = path.join(LOGS_DIR, file)
      const stats = await fs.stat(filePath)

      if (stats.mtimeMs < sevenDaysAgo) {
        await fs.unlink(filePath)
        logger.info(`Deleted old log file: ${file}`)
      }
    }
  } catch (error) {
    logger.error('Failed to clean old logs', error)
  }
}
