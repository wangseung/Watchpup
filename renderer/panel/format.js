// 표현 레이어 — 순수 포맷/유틸 (DOM·전역 상태 의존 없음). panel.js가 import, vitest가 테스트.

export const STATUS_LABEL = { analyzing: '분석중', ready: '준비됨', replied: '답장완료', dismissed: '닫힘' }
export const CAT_LABEL = { issue: '이슈', project: '프로젝트', inquiry: '문의', review: '리뷰·승인', share: '공유·정보', schedule: '일정·미팅', chat: '잡담' }
export const CAT_ORDER = ['issue', 'project', 'inquiry', 'review', 'share', 'schedule', 'chat']
// 발화자별 색(이름 해시 → 팔레트, Tableau10 계열).
export const AUTHOR_COLORS = ['#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#b07aa1', '#76b7b2', '#d4a017', '#9c755f']

export function shortText(text, n) {
  if (!text) return ''
  return text.length > n ? text.slice(0, n) + '…' : text
}

export function relativeTime(ts, now = Date.now()) {
  if (!ts) return ''
  const diffMin = Math.floor((now - ts) / 60000)
  if (diffMin < 1) return '방금'
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}시간 전`
  return `${Math.floor(diffHr / 24)}일 전`
}

export function shortRef(id) {
  return String(id || '').replace(/-/g, '').slice(0, 6)
}

// 복사용 상세 디버그 정보(스레드 지목/로그 대조용)
export function debugRef(m) {
  return [
    `ref #${shortRef(m.id)}`,
    `id: ${m.id}`,
    `channel: ${m.channelName || ''} (${m.channel})`,
    `threadTs: ${m.threadTs}`,
    `messageTs: ${m.messageTs}`,
    m.permalink ? `permalink: ${m.permalink}` : '',
  ].filter(Boolean).join('\n')
}

// 검색어 매칭(채널·작성자·내용·요약)
export function matchesQuery(m, q) {
  if (!q) return true
  const hay = [m.channelName, m.channel, m.authorName, m.authorId, m.text, m.analysis && m.analysis.summary]
    .filter(Boolean).join(' ').toLowerCase()
  return hay.includes(q)
}

export function hasOpenTodos(m) {
  return (m.todos || []).some((t) => !t.done)
}

// 스레드 메시지 시간(Slack ts=초.마이크로): 오늘이면 시각, 아니면 M/D 시각
export function fmtMsgTime(ts) {
  if (!ts) return ''
  const ms = parseFloat(ts) * 1000
  if (!Number.isFinite(ms)) return ''
  const d = new Date(ms)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
  return sameDay ? time : `${d.getMonth() + 1}/${d.getDate()} ${time}`
}

export function authorColor(name) {
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AUTHOR_COLORS[h % AUTHOR_COLORS.length]
}

// 이번 주(월요일 0시) 시작 epoch ms
export function weekStart(now = Date.now()) {
  const d = new Date(now)
  const day = (d.getDay() + 6) % 7 // 월=0
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - day)
  return d.getTime()
}

export function lessonKeyLabel(key) {
  if (key === 'analysis') return '기본 분석'
  if (key === 'dev') return '개발 → PR'
  return key
}
