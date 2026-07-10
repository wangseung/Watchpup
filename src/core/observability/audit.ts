/**
 * 감사 로그 스토어: jsonl append + 인메모리 최근 목록.
 * 하나의 책임: 누가·언제·무엇을 요청/실행했는지 기록.
 */
import { appendFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { logger } from './logger.js'

export interface AuditEntry {
  ts: number
  requestId: string
  channel: string
  kind: string
  text: string
  write: boolean
  approved?: boolean
  toolsUsed?: string[]
  costUsd?: number
  outcome: 'ok' | 'error' | 'denied' | 'pending'
}

const RING_MAX = 300

export class AuditStore {
  private ring: AuditEntry[] = []

  constructor(private readonly path: string) {
    this.load()
  }

  private load(): void {
    if (!existsSync(this.path)) return
    try {
      const lines = readFileSync(this.path, 'utf8').trim().split('\n').filter(Boolean)
      this.ring = lines
        .slice(-RING_MAX)
        .map((l) => JSON.parse(l) as AuditEntry)
    } catch (err) {
      logger.warn('감사로그 로드 실패', { err: String(err) })
    }
  }

  record(entry: AuditEntry): void {
    this.ring.push(entry)
    if (this.ring.length > RING_MAX) this.ring.shift()
    try {
      mkdirSync(dirname(this.path), { recursive: true })
      appendFileSync(this.path, JSON.stringify(entry) + '\n', 'utf8')
    } catch (err) {
      logger.warn('감사로그 기록 실패', { err: String(err) })
    }
  }

  recent(limit = 100): AuditEntry[] {
    return this.ring.slice(-limit).reverse()
  }
}
