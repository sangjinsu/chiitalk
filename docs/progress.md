# 구현 기록

2026-10-10 기준. 이 기록은 실제로 확인한 작업과 아직 확인하지 못한 작업을 구분한다.

| 항목 | 상태 | 근거/다음 단계 |
|---|---|---|
| 합의 계획 기록 | 작성 | implementation-plan.md |
| 공유 API 계약 | 작성 | contracts.ts, backend/root와 quota.limitReason 협의 |
| 공개 metadata 8개 | 작성 | characters.ts, CHARACTERS alias 포함 |
| 스타일 카드/새 예시 | 작성 | character-styles.ts, 8×8개 |
| 공식 자료 확인 | 부분 확인 | 8개 소개·쿠리/시사/랏코/후루 인터뷰 실제 읽음; 더빙 전사·원작 컷 대조 미완료 |
| 평가 입력과 CLI | dry-run 통과 | 240개 unique input, 8×30, 최대 480회, 유료 요청 0회 |
| backend/frontend | 구현 및 통합 검증 완료 | Preview cold start cookie 지속성, quota 소진 뒤 reset/focus/manual 조회와 race 방지 적용 |
| lint/typecheck/build | 통과 | root의 통합 실행에서 각 exit 0 확인 |
| backend tests | 최종 통과 | root fresh 실행 32 pass / 0 fail / 85 expect calls, 4 files, exit 0 |
| 캐릭터/평가 코드 부분 검증 | 통과 | 담당 4파일 ESLint, provider 4 tests/14 assertions |
| localhost browser QA | 부분 통과 | localhost:3000, 375px viewport/document width 375px, 캐릭터 8개 2열/열 너비 163.5px, console error 0 |
| Architect 코드/체험 준비 검토 | APPROVED | P1 Preview instance secret 재생성, P2 quota 소진 뒤 자정 UI 복구 수정 후 재검토 승인 |
| Architect 최종 운영 준비/Production 검토 | 운영 준비 APPROVED / release 미승인 | 코드·mock Preview·확인된 Blob/WAF 증거 승인; 남은 BotID·LLM·더빙 검증과 구분 |
| 실제 Blob CAS | PASS | private store 연결, uncached read·exclusive create·ETag CAS 동시 1winner·cleanup 객체 0; LLM 0 |
| 실제 WAF | 통과 | 두 API path IP 10/60초 fixed_window, active·valid·live/draft 없음, 동일 IP GET 200×10 + 429×1 |
| Production BotID·LLM | 미검증 | OpenRouter key 미설정, reasoning·가격·금액 한도·음성 품질 실측 필요 |
| 말투 human evaluation | 미실행 | 실모델 출력·한국어 공식 발화 대조 필요 |
| Blob 검증 CLI | live PASS | Production 환경 CLI 주입 실행, verification 객체 cleanup 완료 |
| Preview 프로젝트 연결/배포 | READY·API 확인 통과 | 로그인 보호/mock 유지; GET session 200/demo10, POST convert 200/demo9; 모델 유료 0 |
| Production 공개 출시 | 미완료 | READY Production 없음, 최초 Production은 Error; key·실운영 검증 필요 |
| dependency audit | 잔존 제약 | braces ≤3.0.3, CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm; 당시 패치 없음, ESLint dev 경로 |

Ruling: 사용자의 2개 이상 독립 작업 병렬 진행 요청에 따라 공유 파일 소유권을 나누어 병렬 구현한다. 시작 시 빈 repo로 HEAD가 없어 worktree를 만들 수 없었으며 현재 폴더의 feature branch에서 작업한다. 다른 담당자의 수정은 되돌리지 않는다.

2026-10-10 캐릭터 자료 확인: gstack browse를 사용했다. sandbox localhost binding이 EPERM으로 실패해 해당 browse 실행을 승인된 escalation으로 재실행했고 공식 페이지를 읽었다. 설치·전역 설정 수정·secret 읽기는 하지 않았다. 더빙 웹페이지에는 접근했지만 음성을 듣거나 자막을 전사하지 못했으므로 한국어 말버릇이 검증됐다고 기록하지 않는다.

2026-10-10 초기 Architect 지적에 따른 수정: demo key를 배포 origin에 범위를 둔 결정적 값으로 변경해 Preview cold instance 사이에서도 같은 cookie를 검증하도록 했다. 공개 demo key는 인증 보안에 쓰는 live secret이 아니다. Production의 live 설정과 분리하고 demo JWT 거절 및 별도 cold process 사이 cookie 검증 tests를 추가했다. demo quota는 인스턴스 메모리에 둔 체험 예시이며 인스턴스 사이 총량을 보장하지 않는다.

quota UI는 `resetAt` 이후 자동 GET, visible/focus 시 GET, 항상 사용할 수 있는 수동 확인을 추가했다. 겹치는 조회를 하나로 합치고 변환 시 기존 GET을 취소하며 revision으로 오래된 quota가 새 응답을 덮지 못하게 했다. 수정 후 root의 fresh tests 32개/85 assertions, lint, typecheck, build가 모두 exit 0으로 통과했다. Architect는 현재 코드와 mock Preview 준비 상태를 APPROVED로 판정했다.

구현과 로컬 통합 검증은 완료됐다. 이후 실제 private Blob 계약과 WAF 설정/차단 응답을 검증했고 로그인 보호를 유지한 mock Preview를 READY로 배포했다. Production BotID, 실모델 reasoning 비활성화·가격·key 한도, 공식 한국어 더빙 품질 대조는 여전히 미검증이다. READY Production 배포가 없으며 코드/Preview 승인을 실제 Production 출시 승인으로 확장하지 않는다. 최신 운영 상태와 증거는 [구현 및 운영 검증 기록](implementation-progress.md)을 기준으로 본다.

앞선 `--temporary --dry` 시도에서는 `Temporary deployments aren't available for this attempt`, `Project is not linked` 응답을 받았다. 이후 사용자가 `chiitalk`를 지정하고 로그인·프로젝트 연결을 마쳐 [READY Preview](https://chiitalk-f3bsktfwm-sangjinsus-projects-7fe3f5cc.vercel.app)의 API를 확인했다. 해당 URL은 Vercel 로그인 보호와 mock 모드를 유지한다. Production 환경변수 5개와 private Blob을 연결했지만 OpenRouter key는 아직 없으며 실제 Production 완료로 기록하지 않는다.
