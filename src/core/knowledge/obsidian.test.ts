import { describe, it, expect } from 'vitest'
import { renderMentionNote, parseTodos, slugify } from './obsidian.js'
import type { Mention } from '../types.js'

const m: Mention = {
  id: 'abcdef12', channel: 'C1', channelName: 'ios-dev', threadTs: '1720339200.001',
  messageTs: '1720339200.001', authorId: 'U9', authorName: '홍길동',
  text: '이거 언제 되나요?', mentionedAt: 1720339200000, status: 'ready',
  analysis: { headline: '핵심', summary: '요약', advice: '조언', todos: [], draftReply: '초안입니다', actions: [] },
  todos: [{ text: '첫 할 일', done: false }, { text: '둘째', done: true }],
}

describe('obsidian note', () => {
  it('slugify handles korean/empty', () => {
    expect(slugify('배포 방법')).toBe('배포-방법')
    expect(slugify('')).toBe('note')
  })
  it('renders frontmatter + todo checkboxes + draft', () => {
    const md = renderMentionNote(m)
    expect(md).toContain('thread_ts: "1720339200.001"')
    expect(md).toContain('status: ready')
    expect(md).toContain('- [ ] 첫 할 일')
    expect(md).toContain('- [x] 둘째')
    expect(md).toContain('초안입니다')
  })
  it('parseTodos round-trips checkbox state', () => {
    const todos = parseTodos(renderMentionNote(m))
    expect(todos).toEqual([{ text: '첫 할 일', done: false }, { text: '둘째', done: true }])
  })
  it('parseTodos ignores checkbox-shaped lines outside the ## Todo section', () => {
    const withFakeTodoInAdvice: Mention = {
      ...m,
      analysis: { ...m.analysis!, advice: '조언 내용\n- [ ] not a real todo' },
    }
    const todos = parseTodos(renderMentionNote(withFakeTodoInAdvice))
    expect(todos).toEqual([{ text: '첫 할 일', done: false }, { text: '둘째', done: true }])
    expect(todos.some((t) => t.text === 'not a real todo')).toBe(false)
  })
})
