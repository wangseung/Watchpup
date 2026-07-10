/**
 * 표현 레이어 — 펫 idle 혼잣말 라인 선택(순수). 타이머·전송은 electron/main이 담당.
 * 우선순위: 안 읽은 멘션 리마인드 > LLM 생성 위트(quip) > 기본 혼잣말 풀.
 */
export const IDLE_CHATTER: readonly string[] = [
  '오늘은 아무도 절 찾지 않네요… 🥲',
  '평화롭습니다. 멘션 제로 🕊️',
  '심심해요. 누가 절 좀 불러줬으면 🐾',
  '조용하네요. 커피 한 잔 하실래요? ☕',
  '멘션이 없어 낮잠 자는 중… 😴',
  '오늘은 다들 바쁘신가 봐요',
  '저는 늘 여기 있어요. 언제든 불러주세요 👀',
]

/** 안 읽은 멘션이 있으면 리마인드 문구, 없으면 null. */
export function idleUnreadLine(unread: number): string | null {
  if (unread >= 5) return `📬 안 읽은 멘션이 ${unread}개나 쌓였어요. 슬슬 볼까요?`
  if (unread > 0) return `📬 아직 안 읽은 멘션 ${unread}건 있어요`
  return null
}

/**
 * idle 라인 하나 선택. quip 브랜치에 도달할 때만 quipCache에서 하나 꺼낸다(원 동작 보존).
 * rand는 테스트를 위해 주입 가능(기본 Math.random).
 */
export function pickIdleLine(
  unread: number,
  quipCache: string[],
  pool: readonly string[] = IDLE_CHATTER,
  rand: () => number = Math.random,
): string {
  const reminder = idleUnreadLine(unread)
  if (reminder) return reminder
  if (quipCache.length) return quipCache.shift() as string
  return pool[Math.floor(rand() * pool.length)]
}
