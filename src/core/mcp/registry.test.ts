import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeMcpConfigFile } from './registry.js'
import { parseConfig } from '../config/schema.js'

describe('writeMcpConfigFile', () => {
  it('returns null when no enabled servers', () => {
    expect(writeMcpConfigFile(parseConfig({}), join(mkdtempSync(join(tmpdir(),'b-')),'mcp.json'))).toBeNull()
  })
  it('writes stdio server entry', () => {
    const cfg = parseConfig({ mcpServers: [{ id: 'slack', transport: 'stdio', command: 'x', enabled: true }] })
    const p = join(mkdtempSync(join(tmpdir(),'b-')), 'mcp.json')
    expect(writeMcpConfigFile(cfg, p)).toBe(p)
    expect(JSON.parse(readFileSync(p, 'utf8')).mcpServers.slack.command).toBe('x')
  })
})
