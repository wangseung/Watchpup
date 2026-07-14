import { describe, expect, it, vi } from 'vitest'
import { WorkStatusService } from '../../../electron/work-status.js'

function configStore(site = 'example.atlassian.net') {
  return {
    get: () => ({ mcpServers: [{ id: 'jira', enabled: true, env: { ATLASSIAN_SITE_NAME: site, ATLASSIAN_USER_EMAIL: 'me@example.com' } }] }),
  } as any
}

describe('WorkStatusService', () => {
  it('reads Jira status and only offers server-provided transitions', async () => {
    const fetcher = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.endsWith('/transitions')) return new Response(JSON.stringify({ transitions: [{ id: '31', name: '진행 중' }] }), { status: 200 })
      return new Response(JSON.stringify({ fields: { summary: 'Fix issue', status: { name: '할 일' }, assignee: { displayName: 'Jack' } } }), { status: 200 })
    })
    const service = new WorkStatusService(configStore(), { get: async () => 'secret' } as any, vi.fn(), fetcher)
    const status = await service.status('https://example.atlassian.net/browse/APP-123')
    expect(status).toMatchObject({ kind: 'jira', title: 'Fix issue', status: '할 일' })
    expect(status.actions).toEqual([{ id: 'jira.transition:31', label: '진행 중' }])
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ Authorization: expect.stringMatching(/^Basic /) })
  })

  it('never sends Jira credentials to a different host', async () => {
    const fetcher = vi.fn()
    const service = new WorkStatusService(configStore(), { get: async () => 'secret' } as any, vi.fn(), fetcher)
    await expect(service.status('https://evil.example/browse/APP-123')).rejects.toThrow('호스트가 다릅니다')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('reads and updates GitHub issue state through gh', async () => {
    const gh = vi.fn(async (args: string[]) => {
      if (args.includes('PATCH')) return '{}'
      return JSON.stringify({ title: 'Issue title', state: gh.mock.calls.some((call) => call[0].includes('PATCH')) ? 'closed' : 'open' })
    })
    const service = new WorkStatusService(configStore(), { get: async () => null } as any, gh)
    const before = await service.status('https://github.com/acme/app/issues/7')
    expect(before.actions).toEqual([{ id: 'github.close', label: '닫기', danger: true }])
    const after = await service.runAction('https://github.com/acme/app/issues/7', 'github.close')
    expect(gh).toHaveBeenCalledWith(['api', '--method', 'PATCH', 'repos/acme/app/issues/7', '-f', 'state=closed'])
    expect(after.status).toBe('Closed')
  })
})
