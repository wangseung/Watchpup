import { describe, it, expect } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LessonStore } from './lessons.js'

function store() {
  const dir = mkdtempSync(join(tmpdir(), 'watchpup-lsn-'))
  return new LessonStore(join(dir, 'lessons.json'))
}

describe('LessonStore', () => {
  it('추가·조회·중복무시·빈문자열무시', () => {
    const s = store()
    s.add('analysis', '요약은 짧게', 'user')
    s.add('analysis', '요약은 짧게', 'self') // 중복 → 무시
    s.add('analysis', '  ', 'user') // 빈 → 무시
    expect(s.texts('analysis')).toEqual(['요약은 짧게'])
  })
  it('key당 상한 8, 오래된 것부터 제거', () => {
    const s = store()
    for (let i = 0; i < 12; i++) s.add('k', 'lesson ' + i, 'self')
    expect(s.get('k').length).toBe(8)
    expect(s.texts('k')[0]).toBe('lesson 11') // 최신 우선
  })
  it('clear: 인덱스/키/전체', () => {
    const s = store()
    s.add('a', 'x', 'user'); s.add('a', 'y', 'user'); s.add('b', 'z', 'user')
    s.clear('a', 0) // 최신(y) 제거
    expect(s.texts('a')).toEqual(['x'])
    s.clear('a')
    expect(s.texts('a')).toEqual([])
    s.clear()
    expect(Object.keys(s.all())).toEqual([])
  })
  it('edit: 최신순 인덱스로 텍스트 수정, 빈 문자열 무시', () => {
    const s = store()
    s.add('a', 'x', 'user'); s.add('a', 'y', 'self') // 최신순: [y, x]
    s.edit('a', 0, '와이 수정') // 최신(y) 수정
    expect(s.texts('a')).toEqual(['와이 수정', 'x'])
    s.edit('a', 1, '  ') // 빈 → 무시
    expect(s.texts('a')).toEqual(['와이 수정', 'x'])
    expect(s.get('a')[0].source).toBe('self') // source 유지
  })
  it('영속: 새 인스턴스로 재로드', () => {
    const dir = mkdtempSync(join(tmpdir(), 'watchpup-lsn2-'))
    const p = join(dir, 'l.json')
    new LessonStore(p).add('analysis', '저장됨', 'user')
    expect(new LessonStore(p).texts('analysis')).toEqual(['저장됨'])
  })
})
