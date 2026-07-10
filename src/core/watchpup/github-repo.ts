/**
 * GitHub 레포 지정자 파싱(순수 함수). owner/repo · https URL · git@ SSH 형태를 받아
 * { owner, repo, slug } 로 정규화. 클론 대상 폴더명(slug) 생성용.
 */
export interface RepoSpec {
  owner: string
  repo: string
  slug: string
}

export function parseRepoSpec(input: string): RepoSpec | null {
  const s = (input ?? '').trim()
  if (!s) return null
  let m = s.match(/github\.com[/:]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/)
  if (!m) m = s.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/)
  if (!m) return null
  const owner = m[1]
  const repo = m[2]
  if (!owner || !repo) return null
  const slug = `${owner}-${repo}`.replace(/[^A-Za-z0-9_.-]/g, '-')
  return { owner, repo, slug }
}
