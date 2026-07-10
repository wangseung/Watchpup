import { describe, it, expect } from 'vitest'
import { parseAnalysis } from './analysis.js'

describe('parseAnalysis', () => {
  it('extracts the JSON block', () => {
    const out = 'noise\n{"summary":"s","advice":"a","todos":["t1","t2"],"draftReply":"r"}\ntrailing'
    const a = parseAnalysis(out)
    expect(a.summary).toBe('s')
    expect(a.todos).toEqual([{ text: 't1' }, { text: 't2' }])
    expect(a.draftReply).toBe('r')
  })
  it('parses object todos with playbookId', () => {
    const a = parseAnalysis('{"summary":"s","todos":[{"text":"원인 조사","playbookId":"code"},{"text":"직접 확인"}]}')
    expect(a.todos).toEqual([{ text: '원인 조사', playbookId: 'code' }, { text: '직접 확인', playbookId: undefined }])
  })
  it('parses valid category, ignores invalid', () => {
    expect(parseAnalysis('{"category":"issue"}').category).toBe('issue')
    expect(parseAnalysis('{"category":"논의"}').category).toBeUndefined()
    expect(parseAnalysis('{"summary":"s"}').category).toBeUndefined()
  })
  it('falls back safely on parse failure', () => {
    const a = parseAnalysis('completely non-json output')
    expect(a.summary).toContain('파싱 실패')
    expect(a.todos).toEqual([])
    expect(a.draftReply).toBe('')
  })
  it('coerces missing fields', () => {
    const a = parseAnalysis('{"summary":"only"}')
    expect(a.advice).toBe('')
    expect(Array.isArray(a.todos)).toBe(true)
  })
})
