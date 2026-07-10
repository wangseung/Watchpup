import { describe, it, expect } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AuditStore } from './audit.js'

describe('AuditStore', () => {
  it('records and returns newest-first', () => {
    const dir = mkdtempSync(join(tmpdir(), 'watchpup-audit-'))
    const store = new AuditStore(join(dir, 'audit.jsonl'))
    store.record({ ts: 1, requestId: 'a', channel: 'C1', kind: 'mention', text: 'x', write: false, outcome: 'ok' })
    store.record({ ts: 2, requestId: 'b', channel: 'C1', kind: 'mention', text: 'y', write: false, outcome: 'ok' })
    expect(store.recent(10)[0].requestId).toBe('b')
  })
})
