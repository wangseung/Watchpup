import { describe, it, expect } from 'vitest'
import { mentionsUser, mentionsAnyGroup, classify } from './matcher.js'

describe('trigger matcher', () => {
  it('detects <@ID> and <@ID|label>', () => {
    expect(mentionsUser('안녕 <@U123> 확인', 'U123')).toBe(true)
    expect(mentionsUser('<@U123|jaden> 여기', 'U123')).toBe(true)
    expect(mentionsUser('<@U999> 딴사람', 'U123')).toBe(false)
  })
  it('my_mention wins', () => {
    const v = classify({ text: '<@U123> 봐줘', myUserId: 'U123', isFollowupInMyThread: false, followThreads: true })
    expect(v.kind).toBe('my_mention')
  })
  it('followup in my thread when enabled', () => {
    const v = classify({ text: '추가 코멘트', myUserId: 'U123', isFollowupInMyThread: true, followThreads: true })
    expect(v.kind).toBe('my_thread_followup')
  })
  it('followup ignored when disabled', () => {
    const v = classify({ text: '추가 코멘트', myUserId: 'U123', isFollowupInMyThread: true, followThreads: false })
    expect(v.triggered).toBe(false)
  })
  it('detects usergroup mention <!subteam^GID>', () => {
    expect(mentionsAnyGroup('<!subteam^S123|@ios-team> 확인', ['S123'])).toBe(true)
    expect(mentionsAnyGroup('<!subteam^S999> 딴그룹', ['S123'])).toBe(false)
    expect(mentionsAnyGroup('그룹 언급 없음', ['S123'])).toBe(false)
    expect(mentionsAnyGroup('<!subteam^S123>', [])).toBe(false)
  })
  it('평문 @핸들(예: GitHub @org/repo)은 그룹 멘션으로 오탐하지 않음', () => {
    // 검색 폴러가 @kakaostyle 로 매칭해도, 진짜 <!subteam^> 토큰이 아니면 false
    expect(mentionsAnyGroup('<PR링크|ux-builder @kakaostyle/server-driven-ui 추출>', ['S01E7PZQBJT'])).toBe(false)
    expect(mentionsUser('@kakaostyle/repo 참고', 'UTEKTL1MH')).toBe(false)
  })
  it('classify triggers my_mention on group mention', () => {
    const v = classify({
      text: '<!subteam^S123> 확인해주세요', myUserId: 'U123',
      isFollowupInMyThread: false, followThreads: true, myGroupIds: ['S123'],
    })
    expect(v).toEqual({ triggered: true, kind: 'my_mention' })
  })
  it('classify ignores group mention when not a member', () => {
    const v = classify({
      text: '<!subteam^S999> 확인해주세요', myUserId: 'U123',
      isFollowupInMyThread: false, followThreads: true, myGroupIds: ['S123'],
    })
    expect(v.triggered).toBe(false)
  })
})
