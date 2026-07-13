# Session HUD Design QA

- reference: Clawd on Desk 세션 HUD 캡처 (`image-1.png`)
- implementation: 로컬 Electron의 `watchpup pet` 창
- comparison: `.design-qa/comparison.png` (로컬 QA 산출물, Git 제외)
- viewport: 구현 창 560 x 270, 레퍼런스 HUD 영역을 동일 폭 560으로 맞춰 비교

## 확인 결과

- P0: 없음. Claude/Codex 행과 실제 앱 아이콘이 정상 표시됨.
- P1: 없음. 제목, 상태, 컨텍스트 비율, 경과 시간이 창 밖으로 잘리지 않음.
- P2: 없음. 어두운 반투명 배경, 1px 테두리, 16px 모서리와 조밀한 행 간격이 레퍼런스의 정보 밀도와 일치함.
- interaction: 각 행은 버튼으로 노출되며 Codex/Claude 딥링크와 Slack 스레드 이동 경로가 연결됨.
- regression: HUD가 없으면 기존 340px 펫 창 폭으로 복귀하고, HUD가 있으면 중심점을 유지한 채 560px로 확장됨.

final result: passed
