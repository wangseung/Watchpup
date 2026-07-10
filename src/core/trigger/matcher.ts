/**
 * 개인화 trigger matcher (순수 함수): @나 멘션 + 내 스레드 후속 감지.
 */

export function mentionsUser(text: string, userId: string): boolean {
  return new RegExp(`<@${userId}(\\|[^>]*)?>`).test(text)
}

export function stripMention(text: string, userId: string): string {
  return text.replace(new RegExp(`<@${userId}(\\|[^>]*)?>`, 'g'), '').trim()
}

const SUBTEAM_RE = /<!subteam\^([A-Z0-9]+)(?:\|[^>]*)?>/g

/** 텍스트에 내가 속한 유저그룹(<!subteam^GID>) 멘션이 있는지 */
export function mentionsAnyGroup(text: string, groupIds: string[]): boolean {
  if (!groupIds.length) return false
  SUBTEAM_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = SUBTEAM_RE.exec(text)) !== null) {
    if (groupIds.includes(m[1])) return true
  }
  return false
}

export interface TriggerVerdict {
  triggered: boolean
  kind: 'my_mention' | 'my_thread_followup' | 'none'
}

export function classify(args: {
  text: string
  myUserId: string
  isFollowupInMyThread: boolean
  followThreads: boolean
  /** 내가 속한 유저그룹 ID 목록 — <!subteam^GID> 멘션 감지용 (없으면 그룹 감지 skip) */
  myGroupIds?: string[]
}): TriggerVerdict {
  if (args.myUserId && mentionsUser(args.text, args.myUserId)) {
    return { triggered: true, kind: 'my_mention' }
  }
  if (args.myGroupIds?.length && mentionsAnyGroup(args.text, args.myGroupIds)) {
    return { triggered: true, kind: 'my_mention' }
  }
  if (args.followThreads && args.isFollowupInMyThread) {
    return { triggered: true, kind: 'my_thread_followup' }
  }
  return { triggered: false, kind: 'none' }
}
