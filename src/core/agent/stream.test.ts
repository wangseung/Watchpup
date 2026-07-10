import { describe, it, expect } from 'vitest'
import { eventsFromStreamObj, StreamJsonParser } from './stream.js'

describe('eventsFromStreamObj', () => {
  it('system → sessionId', () => {
    const e = eventsFromStreamObj({ type: 'system', subtype: 'init', session_id: 'abc' })
    expect(e[0]).toMatchObject({ type: 'system', sessionId: 'abc' })
  })
  it('assistant tool_use / text', () => {
    const e = eventsFromStreamObj({ type: 'assistant', message: { content: [
      { type: 'tool_use', name: 'Grep', input: {} },
      { type: 'text', text: '안녕' },
    ] } })
    expect(e).toEqual([
      { type: 'tool', name: 'Grep', input: {} },
      { type: 'assistant_text', text: '안녕' },
    ])
  })
  it('stream_event text_delta → progress', () => {
    const e = eventsFromStreamObj({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: '조각' } } })
    expect(e[0]).toEqual({ type: 'progress', text: '조각' })
  })
  it('result', () => {
    const e = eventsFromStreamObj({ type: 'result', result: '최종', session_id: 'x', total_cost_usd: 0.01, is_error: false })
    expect(e[0]).toMatchObject({ type: 'result', text: '최종', sessionId: 'x', costUsd: 0.01, isError: false })
  })
})

describe('StreamJsonParser', () => {
  it('개행 분할 + 부분 버퍼링', () => {
    const p = new StreamJsonParser()
    const a = p.push('{"type":"system","session_id":"s1"}\n{"type":"resu')
    expect(a).toHaveLength(1)
    const b = p.push('lt","result":"done","session_id":"s1"}\n')
    expect(b[0]).toMatchObject({ type: 'result', text: 'done' })
  })
  it('비JSON 라인 무시', () => {
    const p = new StreamJsonParser()
    expect(p.push('garbage\n')).toEqual([])
  })
})
