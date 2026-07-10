# Watchpup 아키텍처 — 이벤트 흐름 레이어

Watchpup는 "Slack 이벤트가 들어온 뒤의 흐름"을 레이어로 나눠 설계한다. 각 레이어는 한 가지 책임만 지고, 가능한 한 **순수 함수 + 단위 테스트**로 떼어내 두어 흐름 파악과 수정이 쉽도록 한다.

```
[감지]        socket / search-poller / thread-poller ──▶ RawMention
   │            src/core/slack/{search-poller,thread-poller}.ts, gateway.attach*
   ▼
[수집·필터]   dedup + 나이 컷오프 결정                     ★순수: decideIngest()
   │            src/core/slack/ingest-filter.ts (+ .test)
   ▼
[보강]        스레드/이름/채널/그룹(subteam) 해석
   │            src/core/slack/context.ts  (resolveMentions/Subteams/Channel …)
   ▼
[분석]        claude -p → 구조화 파싱(요약·카테고리·todo·라우팅…)  ★순수: parseAnalysis()
   │            src/core/watchpup/pipeline.ts, src/core/agent/{prompts,analysis,executor,stream}.ts
   ▼
[후처리]      sources 태깅 · 자가평가 · Obsidian 노트 · audit    ★순수: sourcesFromTools()
   │            src/core/watchpup/reflect.ts, src/core/knowledge/obsidian.ts, observability/audit.ts
   ▼
[도메인 이벤트] gateway.emit(pet / mention:new·ready / badge / mentions:refresh …)
   │            src/core/slack/gateway.ts  (EventEmitter)
   ▼
[브리지]      도메인 이벤트 → IPC broadcast + 펫 말풍선          ★순수: bubble*/pickIdleLine
   │            electron/main.ts, src/core/presentation/{bubble,idle}.ts (+ .test)
   ▼
[표현]        목록/상세/설정/뷰 렌더, 말풍선                     ★순수: format.js, richtext.js (+ .test)
                renderer/panel/*(ESM 모듈), renderer/pet/*
```

`★순수` = DOM·네트워크·상태 의존 없이 입력→출력만 하는, 단위 테스트가 붙은 함수.

## 사용자 명령 흐름 (역방향)

멘션 감지와 별개로, 사용자가 UI에서 트리거하는 명령은 다음 경로를 탄다:

```
renderer(클릭) ─IPC▶ electron/main(핸들러) ─▶ gateway.<command>() ─▶ pipeline/dev/reflect ─▶ emit ─▶ 브리지 ─▶ 표현
```

주요 명령: `runAction`(playbook 실행) · `runDev`(개발→PR) · `chat`(의견 더 구하기) · `feedback`/`rate`(자가발전) · `reanalyze` · `setTracked`/`removeMention`/`setCategory`.

## 자가발전 루프

`feedback`(사용자 피드백 증류) + `rate`(만족도) + 백그라운드 `selfCritique` → 워크플로우별 **교훈(LessonStore)** 축적 → 다음 실행 프롬프트에 자동 주입. `src/core/watchpup/reflect.ts`, `src/core/state/lessons.ts`.

## 렌더러(패널) 모듈 구성

`panel.js`(2052줄 모놀리스)를 기능별 ESM 모듈로 분해. 공유 결합은 `store.js`의 `nav` 레지스트리와 `settings.js`의 `setOnPlaybooksChanged` 훅으로만 — 순환 import 없음.

| 모듈 | 책임 |
|---|---|
| `panel.js` (~300) | 멘션 목록·필터·검색·탭 전환·창 컨트롤·init(조율) |
| `detail.js` (~880) | 상세: 헤더·스레드·watchpup pane·답장·액션·채팅 + 스트림 반영 |
| `settings.js` (~520) | 설정(슬랙·펫·저장소)·워크플로우 CRUD·교훈·그룹·레포·토큰 |
| `views.js` (~170) | 주간 요약·할 일 탭(집계 화면) |
| `store.js` | 공유 `state` + `getChat`/`getActionLog`/`sortedMentions` + `nav` 레지스트리 |
| `format.js` ★ | 순수 포맷/유틸(테스트) |
| `richtext.js` ★ | 링크·멘션·마크다운·코드블록 DOM 렌더(jsdom 테스트) |
| `playbooks.js` | playbook 공유 캐시 |

## 레이어 규칙

- **감지·보강·이벤트**는 부수효과가 있으니 얇게 유지하고, **판단 로직은 순수 함수로 떼어** 테스트한다(`ingest-filter`, `presentation/*`, 렌더러 `format`/`richtext`).
- **시크릿은 Keychain에만**(`src/core/secrets/keychain.ts`). config/코드/로그에 토큰 금지. `data/`·`watchpup.config.yaml`은 `.gitignore`.
- **렌더러는 ESM 모듈**(`panel.js`가 `format.js`/`richtext.js`를 import). CSP `script-src 'self'` 하에서 동작 확인됨.

## 테스트

`npm test` (vitest). 백엔드는 `src/**/*.test.ts`, 렌더러 순수 모듈은 `renderer/**/*.test.js`(DOM 테스트는 jsdom). 리팩토링은 **테스트를 먼저 쓰고** 각 레이어를 떼어낸다.
