import { describe, it, expect } from 'vitest'
import { computeToolScope, writeToolFullNames } from './gating.js'
import { parseConfig } from '../config/schema.js'

const cfg = parseConfig({
  mcpServers: [{ id: 'slack', enabled: true, writeTools: ['send_message'] }],
})

describe('computeToolScope', () => {
  it('read mode disallows write full-names, allows server wildcard', () => {
    const s = computeToolScope(cfg, false)
    expect(s.allowedTools).toContain('mcp__slack')
    expect(s.disallowedTools).toContain('mcp__slack__send_message')
  })
  it('write mode empties disallow', () => {
    expect(computeToolScope(cfg, true).disallowedTools).toEqual([])
  })
})
