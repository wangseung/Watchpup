import { describe, it, expect } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { WatchpupGateway } from './gateway.js'
import { parseConfig } from '../config/schema.js'
import { SessionStore } from '../session/store.js'
import { Keychain } from '../secrets/keychain.js'
import { KeyedMutex } from '../session/locks.js'
import { Semaphore } from '../session/semaphore.js'
import { StateStore } from '../state/store.js'
import { MentionStore } from '../state/mentions.js'
import { LessonStore } from '../state/lessons.js'
import { AuditStore } from '../observability/audit.js'

function make() {
  const dir = mkdtempSync(join(tmpdir(), 'watchpup-gw-'))
  const config = parseConfig({ workDir: dir, dataDir: dir, mySlackUserId: 'U123' })
  const mentions = new MentionStore(join(dir, 'mentions.json'))
  const gw = new WatchpupGateway({
    config, sessions: new SessionStore(join(dir, 's.json'), 128, 3_600_000),
    keychain: new Keychain('watchpup-test'), mutex: new KeyedMutex(), semaphore: new Semaphore(2),
    state: new StateStore(join(dir, 'state.json')), mentions,
    audit: new AuditStore(join(dir, 'audit.jsonl')),
    lessons: new LessonStore(join(dir, 'lessons.json')),
  })
  return { gw, mentions }
}

describe('WatchpupGateway.toggleTodo', () => {
  it('flips a todo done flag', () => {
    const { gw, mentions } = make()
    mentions.set('m1', {
      id: 'm1', channel: 'C1', threadTs: '1', messageTs: '1', authorId: 'U9', text: 't',
      mentionedAt: 0, status: 'ready', todos: [{ text: 'a', done: false }],
    })
    gw.toggleTodo('m1', 0)
    expect(mentions.get('m1')!.todos[0].done).toBe(true)
  })
})
