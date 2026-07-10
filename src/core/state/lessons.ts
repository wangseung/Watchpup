/**
 * 자가발전 교훈 저장소 — 워크플로우별(key)로 "배운 점"을 축적해 다음 실행 프롬프트에 자동 주입.
 * key: 'analysis'(기본 분석) | playbookId | 'dev'. source: 'user'(내 피드백) | 'self'(자가평가).
 * 최신 우선, key당 상한(MAX_PER_KEY). 동일 텍스트는 dedupe.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export interface Lesson {
  text: string
  ts: number
  source: 'user' | 'self'
}

const MAX_PER_KEY = 8

export class LessonStore {
  private map: Record<string, Lesson[]> = {}
  constructor(private readonly path: string) {
    if (existsSync(path)) {
      try {
        this.map = JSON.parse(readFileSync(path, 'utf8')) as Record<string, Lesson[]>
      } catch {
        this.map = {}
      }
    }
  }
  private persist(): void {
    mkdirSync(dirname(this.path), { recursive: true })
    writeFileSync(this.path, JSON.stringify(this.map), 'utf8')
  }
  // 내부 저장은 삽입 순서(오래된→최신). 조회는 최신순으로 뒤집어 반환.
  /** key의 교훈(최신순) */
  get(key: string): Lesson[] {
    return (this.map[key] ?? []).slice().reverse()
  }
  /** 프롬프트 주입용 텍스트 배열(최신순) */
  texts(key: string): string[] {
    return this.get(key).map((l) => l.text)
  }
  /** 전체 (key → 교훈, 최신순) */
  all(): Record<string, Lesson[]> {
    const out: Record<string, Lesson[]> = {}
    for (const k of Object.keys(this.map)) out[k] = this.get(k)
    return out
  }
  /** 교훈 추가. 빈 문자열/중복은 무시. 상한 초과 시 가장 오래된 것부터 제거. */
  add(key: string, text: string, source: Lesson['source']): void {
    const t = (text ?? '').trim()
    if (!t) return
    const list = this.map[key] ?? (this.map[key] = [])
    if (list.some((l) => l.text === t)) return
    list.push({ text: t, ts: Date.now(), source })
    if (list.length > MAX_PER_KEY) list.splice(0, list.length - MAX_PER_KEY)
    this.persist()
  }
  /** 교훈 텍스트 수정 (index는 최신순 기준). 빈 문자열이면 무시. */
  edit(key: string, index: number, text: string): void {
    const t = (text ?? '').trim()
    if (!t) return
    const list = this.map[key] ?? []
    const inner = list.length - 1 - index
    if (inner >= 0 && inner < list.length) {
      list[inner] = { ...list[inner], text: t }
      this.persist()
    }
  }
  /** key 하나(또는 최신순 인덱스 하나) 또는 전체 삭제 */
  clear(key?: string, index?: number): void {
    if (!key) {
      this.map = {}
    } else if (typeof index === 'number') {
      const list = this.map[key] ?? []
      // index는 최신순 기준 → 내부(삽입순) 인덱스로 변환
      const inner = list.length - 1 - index
      if (inner >= 0 && inner < list.length) list.splice(inner, 1)
    } else {
      delete this.map[key]
    }
    this.persist()
  }
}
