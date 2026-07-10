// Codex Pet 팩 스펙(codex-pets.net / codexpets.org) — 스프라이트시트 아틀라스 상수 + 프레임 표.
// 아틀라스: 1536x1872px, 8열 x 9행, 셀 192x208px, 투명 배경.
// 9개 행 = 애니메이션 상태(이 순서 고정). 각 상태의 프레임 수 만큼 열 0..(frames-1) 사용,
// per-frame duration(ms)만큼 유지 후 다음 프레임으로 — 끝까지 가면 처음으로 루프.
window.CODEX_ATLAS = { cols: 8, rows: 9, cellW: 192, cellH: 208 }

window.CODEX_ROWS = [
  { name: 'idle', frames: 6, durations: [280, 110, 110, 140, 140, 320] },
  { name: 'running-right', frames: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  { name: 'running-left', frames: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  { name: 'waving', frames: 4, durations: [140, 140, 140, 280] },
  { name: 'jumping', frames: 5, durations: [140, 140, 140, 140, 280] },
  { name: 'failed', frames: 8, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
  { name: 'waiting', frames: 6, durations: [150, 150, 150, 150, 150, 260] },
  { name: 'running', frames: 6, durations: [120, 120, 120, 120, 120, 220] },
  { name: 'review', frames: 6, durations: [150, 150, 150, 150, 150, 280] },
]

// watchpup 펫 상태(idle/thinking/ready/chatting) → Codex 스프라이트 행 인덱스
window.CODEX_STATE_ROW = { idle: 0, thinking: 7, ready: 3, chatting: 8 }
