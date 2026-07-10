// 펫 캐릭터 세트 — 상태(idle/thinking/ready/chatting)별 글리프.
// 색/애니메이션(bg gradient, bob/pulse/bounce/wiggle)은 상태 클래스가 담당하고,
// 여기선 각 상태의 "얼굴"만 바꾼다. 새 세트 추가 = 항목 하나 추가.
// (향후 이미지 세트: glyph 대신 img 경로를 넣도록 확장 가능)
window.PET_THEMES = {
  paw: { label: '🐾 발바닥', idle: '🐾', thinking: '🐾', ready: '🐾', chatting: '🐾' },
  dog: { label: '🐶 강아지', idle: '🐶', thinking: '🐕', ready: '🐶', chatting: '🐩' },
  cat: { label: '🐱 고양이', idle: '🐱', thinking: '🙀', ready: '😺', chatting: '😸' },
  fox: { label: '🦊 여우', idle: '🦊', thinking: '🦊', ready: '🦊', chatting: '🦊' },
  robot: { label: '🤖 로봇', idle: '🤖', thinking: '⚙️', ready: '✅', chatting: '💬' },
  ghost: { label: '👻 유령', idle: '👻', thinking: '🌀', ready: '✨', chatting: '💬' },
  bear: { label: '🐻 곰', idle: '🐻', thinking: '🐻', ready: '🐻', chatting: '🐻' },
  chick: { label: '🐥 병아리', idle: '🐥', thinking: '🐣', ready: '🐤', chatting: '🐥' },
}
window.PET_THEME_ORDER = ['paw', 'dog', 'cat', 'fox', 'robot', 'ghost', 'bear', 'chick']
