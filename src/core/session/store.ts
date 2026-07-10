/**
 * 스레드 세션 스토어: LRU(idle 만료) + 디스크 영속.
 * 하나의 책임: threadKey ↔ claude sessionId 매핑 관리.
 *
 * 리서치 §6 반영:
 *  - 키 = channel:threadTs (continue 금지 — 동시 유저 교차오염 방지)
 *  - sessionId는 claude가 디스크에 transcript 보유하므로 eviction 무손실
 *  - live ChildProcess는 캐싱하지 않음
 */
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { LRUCache } from 'lru-cache'
import type { SessionRecord } from '../types.js'
import { logger } from '../observability/logger.js'

export function threadKey(channel: string, threadTs: string): string {
  return `${channel}:${threadTs}`
}

export class SessionStore {
  private cache: LRUCache<string, SessionRecord>

  constructor(
    private readonly persistPath: string,
    max: number,
    idleMs: number,
  ) {
    this.cache = new LRUCache<string, SessionRecord>({
      max,
      ttl: idleMs,
      updateAgeOnGet: true,
      ttlAutopurge: false,
    })
    this.load()
  }

  private load(): void {
    if (!existsSync(this.persistPath)) return
    try {
      const raw = JSON.parse(readFileSync(this.persistPath, 'utf8')) as Record<string, SessionRecord>
      const now = Date.now()
      for (const [k, rec] of Object.entries(raw)) {
        // 만료되지 않은 것만 복원
        if (now - rec.lastActiveAt < this.cache.ttl) this.cache.set(k, rec)
      }
      logger.info('세션 복원', { count: this.cache.size })
    } catch (err) {
      logger.warn('세션 파일 로드 실패', { err: String(err) })
    }
  }

  private persist(): void {
    try {
      mkdirSync(dirname(this.persistPath), { recursive: true })
      const obj: Record<string, SessionRecord> = {}
      for (const [k, v] of this.cache.entries()) obj[k] = v
      writeFileSync(this.persistPath, JSON.stringify(obj, null, 2), 'utf8')
    } catch (err) {
      logger.warn('세션 파일 저장 실패', { err: String(err) })
    }
  }

  /** 기존 세션 조회 (없으면 undefined) */
  get(key: string): SessionRecord | undefined {
    return this.cache.get(key)
  }

  /** 세션 보장: 없으면 새 UUID로 생성 */
  ensure(key: string): SessionRecord {
    const existing = this.cache.get(key)
    if (existing) return existing
    const rec: SessionRecord = { sessionId: randomUUID(), lastActiveAt: Date.now(), turns: 0 }
    this.cache.set(key, rec)
    this.persist()
    return rec
  }

  /** 턴 완료 기록 (claude가 반환한 실제 sessionId + 마지막으로 본 메시지 ts) */
  recordTurn(key: string, sessionId: string, lastSeenTs?: string): void {
    const rec = this.cache.get(key) ?? { sessionId, lastActiveAt: Date.now(), turns: 0 }
    rec.sessionId = sessionId
    rec.lastActiveAt = Date.now()
    rec.turns += 1
    if (lastSeenTs) rec.lastSeenTs = lastSeenTs
    this.cache.set(key, rec)
    this.persist()
  }

  /** 세션 초기화 (/new) */
  reset(key: string): void {
    this.cache.delete(key)
    this.persist()
  }

  /** 활성 세션 목록 (관리 UI) */
  active(): Array<{ key: string } & SessionRecord> {
    const out: Array<{ key: string } & SessionRecord> = []
    for (const [key, rec] of this.cache.entries()) out.push({ key, ...rec })
    return out.sort((a, b) => b.lastActiveAt - a.lastActiveAt)
  }

  get size(): number {
    return this.cache.size
  }
}
