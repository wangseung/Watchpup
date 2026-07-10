import { describe, it, expect, beforeEach } from 'vitest'
import { Keychain } from './keychain.js'

describe('Keychain env fallback', () => {
  beforeEach(() => { process.env.WATCHPUP_SECRETS_ENV = '1' })
  it('reads WATCHPUP_SECRET_<KEY> from env', async () => {
    process.env.WATCHPUP_SECRET_SLACK_BOT_TOKEN = 'xoxb-test'
    const kc = new Keychain('watchpup-test')
    expect(await kc.get('SLACK_BOT_TOKEN')).toBe('xoxb-test')
  })
  it('has() reflects presence', async () => {
    delete process.env.WATCHPUP_SECRET_SLACK_APP_TOKEN
    const kc = new Keychain('watchpup-test')
    expect(await kc.has('SLACK_APP_TOKEN')).toBe(false)
  })
})
