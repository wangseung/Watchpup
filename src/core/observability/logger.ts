/**
 * 구조적 로거 + 인메모리 링버퍼 + 이벤트 방출 (관리 UI의 SSE 로그 스트림용)
 * 하나의 책임: 로그 기록/방출.
 */
import { EventEmitter } from 'node:events'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  ts: number
  level: LogLevel
  msg: string
  ctx?: Record<string, unknown>
}

const RING_MAX = 500

class Logger extends EventEmitter {
  private ring: LogEntry[] = []
  private minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

  private static order: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

  private write(level: LogLevel, msg: string, ctx?: Record<string, unknown>): void {
    if (Logger.order[level] < Logger.order[this.minLevel]) return
    const entry: LogEntry = { ts: Date.now(), level, msg, ...(ctx ? { ctx } : {}) }
    this.ring.push(entry)
    if (this.ring.length > RING_MAX) this.ring.shift()
    // 콘솔에는 사람이 읽기 쉬운 한 줄 + 구조적 컨텍스트
    const line = `[${new Date(entry.ts).toISOString()}] ${level.toUpperCase()} ${msg}`
    const args = ctx ? [line, ctx] : [line]
    if (level === 'error') console.error(...args)
    else if (level === 'warn') console.warn(...args)
    else console.log(...args)
    this.emit('log', entry)
  }

  debug(msg: string, ctx?: Record<string, unknown>): void {
    this.write('debug', msg, ctx)
  }
  info(msg: string, ctx?: Record<string, unknown>): void {
    this.write('info', msg, ctx)
  }
  warn(msg: string, ctx?: Record<string, unknown>): void {
    this.write('warn', msg, ctx)
  }
  error(msg: string, ctx?: Record<string, unknown>): void {
    this.write('error', msg, ctx)
  }

  /** 최근 로그 스냅샷 (관리 UI 초기 로드용) */
  recent(limit = 200): LogEntry[] {
    return this.ring.slice(-limit)
  }
}

export const logger = new Logger()
