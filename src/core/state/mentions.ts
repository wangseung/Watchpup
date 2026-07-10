/**
 * 멘션 히스토리 저장소 — 스레드별 멘션 레코드를 디스크에 영속(재시작해도 유지).
 * 확인 여부(readAt)도 함께 보관. Map을 감싸 set 시마다 JSON으로 저장한다.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Mention } from '../types.js'

const MAX = 500 // 오래된 것부터 정리하는 상한

export class MentionStore {
  private map = new Map<string, Mention>()
  constructor(private readonly path: string) {
    if (existsSync(path)) {
      try {
        const arr = JSON.parse(readFileSync(path, 'utf8')) as Mention[]
        for (const m of arr) this.map.set(m.id, m)
      } catch {
        /* 손상 시 빈 상태로 시작 */
      }
    }
  }
  private persist(): void {
    // 최신순 상한 적용
    const all = [...this.map.values()].sort((a, b) => b.mentionedAt - a.mentionedAt).slice(0, MAX)
    this.map = new Map(all.map((m) => [m.id, m]))
    mkdirSync(dirname(this.path), { recursive: true })
    writeFileSync(this.path, JSON.stringify(all), 'utf8')
  }
  get(id: string): Mention | undefined {
    return this.map.get(id)
  }
  set(id: string, m: Mention): void {
    this.map.set(id, m)
    this.persist()
  }
  /** 최신순 전체 */
  all(): Mention[] {
    return [...this.map.values()].sort((a, b) => b.mentionedAt - a.mentionedAt)
  }
  /** 목록에서 제거 */
  remove(id: string): void {
    if (this.map.delete(id)) this.persist()
  }
  /** 확인 처리(최초 1회 시각 기록). 이미 읽었으면 유지 */
  markRead(id: string): Mention | undefined {
    const m = this.map.get(id)
    if (m && !m.readAt) {
      m.readAt = Date.now()
      this.set(id, m)
    }
    return m
  }
  /** 안 읽은 개수 */
  unreadCount(): number {
    let n = 0
    for (const m of this.map.values()) if (!m.readAt) n++
    return n
  }
}
