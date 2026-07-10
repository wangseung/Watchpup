/**
 * claude --output-format stream-json 파싱 (순수 함수). 하나의 책임: JSON 이벤트 → AgentStreamEvent.
 */
import type { AgentStreamEvent } from '../types.js'

interface ContentBlock {
  type?: string
  text?: string
  name?: string
  input?: unknown
}
interface StreamObj {
  type?: string
  subtype?: string
  session_id?: string
  result?: string
  total_cost_usd?: number
  is_error?: boolean
  message?: { content?: ContentBlock[] }
  event?: { type?: string; delta?: { type?: string; text?: string } }
}

/** stream-json 한 오브젝트 → 이벤트 목록 */
export function eventsFromStreamObj(obj: unknown): AgentStreamEvent[] {
  const o = obj as StreamObj
  switch (o.type) {
    case 'system':
      return [{ type: 'system', sessionId: o.session_id, raw: obj }]
    case 'assistant': {
      const out: AgentStreamEvent[] = []
      for (const block of o.message?.content ?? []) {
        if (block.type === 'tool_use' && block.name) {
          out.push({ type: 'tool', name: block.name, input: block.input })
        } else if (block.type === 'text' && block.text) {
          out.push({ type: 'assistant_text', text: block.text })
        }
      }
      return out
    }
    case 'stream_event': {
      const ev = o.event
      if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
        return [{ type: 'progress', text: ev.delta.text }]
      }
      return []
    }
    case 'result':
      return [
        {
          type: 'result',
          text: o.result ?? '',
          sessionId: o.session_id,
          costUsd: o.total_cost_usd,
          isError: !!o.is_error,
        },
      ]
    default:
      return []
  }
}

/** 개행 단위 스트림 파서 (부분 라인 버퍼링) */
export class StreamJsonParser {
  private buf = ''

  /** 청크를 넣고 완성된 라인들의 이벤트를 방출 */
  push(chunk: string): AgentStreamEvent[] {
    this.buf += chunk
    const events: AgentStreamEvent[] = []
    let idx: number
    while ((idx = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, idx).trim()
      this.buf = this.buf.slice(idx + 1)
      if (!line) continue
      try {
        events.push(...eventsFromStreamObj(JSON.parse(line)))
      } catch {
        /* 부분/비JSON 라인 무시 */
      }
    }
    return events
  }

  /** 남은 버퍼 flush */
  flush(): AgentStreamEvent[] {
    const line = this.buf.trim()
    this.buf = ''
    if (!line) return []
    try {
      return eventsFromStreamObj(JSON.parse(line))
    } catch {
      return []
    }
  }
}
