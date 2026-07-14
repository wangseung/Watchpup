import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { ConfigStore } from '../src/core/config/store.js'
import type { Keychain } from '../src/core/secrets/keychain.js'
import { parseGithubLink, parseJiraLink } from '../src/core/work/links.js'
import { JIRA_KEY } from './integrations.js'

const execFileAsync = promisify(execFile)

export interface WorkLinkAction {
  id: string
  label: string
  danger?: boolean
}

export interface WorkLinkStatus {
  kind: 'jira' | 'github'
  title: string
  status: string
  detail?: string
  actions: WorkLinkAction[]
}

export type GhRunner = (args: string[]) => Promise<string>
export type WorkFetch = (input: string, init?: RequestInit) => Promise<Response>

const defaultGhRunner: GhRunner = async (args) => {
  const env = { ...process.env }
  delete env.GH_TOKEN
  delete env.GITHUB_TOKEN
  const { stdout } = await execFileAsync('gh', args, { env, timeout: 30_000, maxBuffer: 8 * 1024 * 1024 })
  return stdout
}

function configuredJira(configStore: ConfigStore): { host: string; email: string } | null {
  const jira = configStore.get().mcpServers.find((server) => server.id === 'jira' && server.enabled)
  const site = jira?.env?.ATLASSIAN_SITE_NAME?.trim() ?? ''
  const email = jira?.env?.ATLASSIAN_USER_EMAIL?.trim() ?? ''
  if (!site || !email) return null
  try {
    const url = new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`)
    return { host: url.hostname.toLowerCase(), email }
  } catch {
    return null
  }
}

export class WorkStatusService {
  constructor(
    private readonly configStore: ConfigStore,
    private readonly keychain: Keychain,
    private readonly gh: GhRunner = defaultGhRunner,
    private readonly fetcher: WorkFetch = fetch,
  ) {}

  async status(url: string): Promise<WorkLinkStatus> {
    const jira = parseJiraLink(url)
    if (jira) return this.jiraStatus(jira.site, jira.key)
    const github = parseGithubLink(url)
    if (github) return this.githubStatus(github)
    throw new Error('상태 조회를 지원하지 않는 링크입니다.')
  }

  async runAction(url: string, actionId: string): Promise<WorkLinkStatus> {
    const current = await this.status(url)
    if (!current.actions.some((action) => action.id === actionId)) throw new Error('현재 상태에서 실행할 수 없는 변경입니다.')

    const jira = parseJiraLink(url)
    if (jira && actionId.startsWith('jira.transition:')) {
      await this.jiraRequest(jira.site, `/rest/api/3/issue/${encodeURIComponent(jira.key)}/transitions`, {
        method: 'POST',
        body: JSON.stringify({ transition: { id: actionId.slice('jira.transition:'.length) } }),
      })
      return this.jiraStatus(jira.site, jira.key)
    }

    const github = parseGithubLink(url)
    if (!github) throw new Error('GitHub 링크 형식이 올바르지 않습니다.')
    const endpoint = `repos/${github.owner}/${github.repo}/${github.kind === 'pull' ? 'pulls' : 'issues'}/${github.number}`
    if (actionId === 'github.close' || actionId === 'github.reopen') {
      await this.gh(['api', '--method', 'PATCH', endpoint, '-f', `state=${actionId === 'github.close' ? 'closed' : 'open'}`])
    } else if (actionId === 'github.ready' && github.kind === 'pull') {
      await this.gh(['pr', 'ready', String(github.number), '--repo', `${github.owner}/${github.repo}`])
    } else {
      throw new Error('지원하지 않는 GitHub 상태 변경입니다.')
    }
    return this.githubStatus(github)
  }

  private async jiraRequest(site: string, path: string, init: RequestInit = {}): Promise<unknown> {
    const configured = configuredJira(this.configStore)
    if (!configured) throw new Error('설정에서 Jira를 먼저 연결해주세요.')
    const target = new URL(site)
    if (target.hostname.toLowerCase() !== configured.host) throw new Error('연결된 Jira 사이트와 링크의 호스트가 다릅니다.')
    const token = await this.keychain.get(JIRA_KEY)
    if (!token) throw new Error('Jira API 토큰을 Keychain에서 찾지 못했습니다.')
    const response = await this.fetcher(`${target.origin}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${configured.email}:${token}`).toString('base64')}`,
        ...(init.headers ?? {}),
      },
      signal: init.signal ?? AbortSignal.timeout(20_000),
    })
    if (!response.ok) throw new Error(`Jira 요청 실패 (${response.status})`)
    if (response.status === 204) return null
    return response.json()
  }

  private async jiraStatus(site: string, key: string): Promise<WorkLinkStatus> {
    const [issue, transitionResult] = await Promise.all([
      this.jiraRequest(site, `/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,status,assignee,priority`),
      this.jiraRequest(site, `/rest/api/3/issue/${encodeURIComponent(key)}/transitions`),
    ]) as [Record<string, any>, Record<string, any>]
    const fields = issue?.fields ?? {}
    const transitions = Array.isArray(transitionResult?.transitions) ? transitionResult.transitions : []
    return {
      kind: 'jira',
      title: fields.summary || key,
      status: fields.status?.name || '상태 없음',
      detail: [key, fields.assignee?.displayName, fields.priority?.name].filter(Boolean).join(' · '),
      actions: transitions.map((transition: any) => ({
        id: `jira.transition:${String(transition.id)}`,
        label: String(transition.name || transition.to?.name || '상태 변경'),
      })),
    }
  }

  private async githubStatus(link: NonNullable<ReturnType<typeof parseGithubLink>>): Promise<WorkLinkStatus> {
    const endpoint = `repos/${link.owner}/${link.repo}/${link.kind === 'pull' ? 'pulls' : 'issues'}/${link.number}`
    const data = JSON.parse(await this.gh(['api', endpoint])) as Record<string, any>
    const merged = link.kind === 'pull' && Boolean(data.merged || data.merged_at)
    const status = merged ? 'Merged' : data.draft ? 'Draft' : data.state === 'closed' ? 'Closed' : 'Open'
    const actions: WorkLinkAction[] = []
    if (!merged) {
      if (data.state === 'closed') actions.push({ id: 'github.reopen', label: '다시 열기' })
      else actions.push({ id: 'github.close', label: '닫기', danger: true })
      if (link.kind === 'pull' && data.draft && data.state !== 'closed') actions.unshift({ id: 'github.ready', label: '리뷰 준비로 전환' })
    }
    return {
      kind: 'github',
      title: String(data.title || `${link.owner}/${link.repo} #${link.number}`),
      status,
      detail: `${link.owner}/${link.repo} #${link.number}`,
      actions,
    }
  }
}
