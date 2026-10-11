# 구현 및 운영 검증 기록

2026-10-11 추가 진행 반영. 공개 Git Production은 READY이며 실제 변환 통과·말투 품질 검증과 구분한다. secret 값은 기록하지 않는다.

현재 작업본 말투 `2026-10-11-v2`를 source freeze했다. 각 8개×8캐릭터=64개 직접 쓴 예시, 2~3개 대비 예시 선택과 8 KiB prompt 제한을 유지한다. 기존 240개 합성 입력/ID는 그대로이며 fixture version/promptVersion metadata만 갱신했다. 새 품질 평가는 OpenRouter 직접 호출로 8캐릭터×2모델부터 비교하며 Blob/session/IP를 거치지 않는다. 이전 prompt index 0/2의 유료 2회는 참고 이력으로만 보존하고 새 평가에 합산하지 않는다. 새 버전 유료 호출·품질 점수는 아직 없다.

## 확인한 결과

| 항목 | 상태 | 실제 근거 |
|---|---|---|
| backend/frontend 구현 | 완료 | Preview cold start cookie 지속성, quota reset/focus/manual 조회와 race 방지 적용 |
| tests | 말투 v2 포함 통과 | fresh bun run test 41 pass / 0 fail / 503 assertions; 의도·부정·혼합감정·8 KiB 경계 검사 포함, 제품 로직·한도 불변 |
| lint·typecheck·build | v2 typecheck/lint 통과 | 새 작업본 앱+tools typecheck·lint exit 0; 기존 Git 배포 build 성공, 새 통합 build는 root 검증 단계 |
| localhost browser QA | 확인 범위 통과 | demo convert 200/10→9/모델 0; desktop 1280/mobile 375 overflow 0, ArrowRight 선택·Enter 개행·JS error 0; clipboard는 mock 문자열/feedback만 확인 |
| 캐릭터/평가 데이터 | 작성 및 dry-run 통과 | 스타일 8개·새 예시 64개, 합성 입력 240개·최대 평가 480회; 해당 dry-run의 유료 요청 0회 |
| Architect 코드/체험 준비 검토 | APPROVED | Preview instance key 및 자정 quota 복구 수정 후 승인 |
| 최종 운영 준비 Architect 검토 | APPROVED | 코드·mock Preview 및 실제로 확인한 Blob·WAF 운영 준비 증거 승인; Production release와 별개 |
| 원본 Git 기술 candidate 배포 검토 | APPROVED | 원본 build/typecheck/lint와 전체 API/quota 34 pass·93 assertions, Architect provider 회귀 6 pass·22 assertions |
| Vercel 프로젝트 | 연결 완료 | Hobby 팀 sangjinsus-projects-7fe3f5cc, 프로젝트 chiitalk, Production Node 24.x |
| 클라우드 Preview | READY | [검증한 Preview](https://chiitalk-f3bsktfwm-sangjinsus-projects-7fe3f5cc.vercel.app), Vercel 로그인 보호 유지, mock 모드 |
| Preview API 확인 | 통과 | GET /api/session → 200/demo/remaining 10; POST /api/convert → 200/demo/remaining 9; 모델 유료 호출 0회 |
| private Blob | 연결 완료 | chiitalk-quota, 서울 icn1, access private, Production 환경에만 연결 |
| 실제 Blob 계약 검증 | PASS | uncached read·중복 생성 차단·ETag CAS 동시 1 winner·최신 read·cleanup 완료, 남은 검증 객체 0, LLM 0회 |
| WAF 설정 및 실제 응답 | 통과 | 두 API 경로, IP 10/60초 fixed_window; active·valid·live, draft 없음; 동일 IP GET 200×10 후 429×1 |
| Production 환경변수 | 필수 설정 및 모델 key 등록 | 기존 5개 설정과 OPENROUTER_API_KEY sensitive 등록; key 값 미기록 |
| GitHub/Git Production | READY | main/origin 9978f47c0cf3872aef542190e1ecbf60be612c1d; Git-triggered dpl_6yG7DBFXkqwnbp7mDBiGSv2oxMCU; 공개 alias 동일 UID·익명 200 |
| Production browser QA | 차단 동작 확인 | 375px/8 radio 2열/overflow 0, SDK c.js 200; convert 1회 403 BOT_BLOCKED/remaining 10 불변/예약·모델·자동 재시도 0 |
| 임시 운영 자원 정리 | 완료 | own 임시 배포 4개 삭제 exit 0·fresh 인증 목록 잔존 0·raw URL 404×4; token/env/header 임시 파일·.env.local 없음, Production env 기존 6개·원본 verification route 0 |
| 임시 v2 probe 구현 검증 | 통과 | 35 tests·130 assertions 및 별도 build/typecheck/lint 통과; P2 수정·ACK committed-response-lost 회복 테스트 포함 |
| 과거 임시 v2 배포 | 검증 후 삭제 | 보호·no-alias에서 gate/ledger 확인; 첫 ACK 완료 후 두 번째 실패로 halted; 현재 임시 배포 잔존 0 |
| 이전 prompt용 private v3 평가기 | deadline 수정 후 APPROVED | 57 tests·1,009 assertions/build exit 0; 미배포·ACK 2 미실행·추가 paid 0, 새 직접 평가와 별개 |
| 임시 Production session API | 통과 | 로그인 보호 배포에서 GET 200/live/no-store; cookie Secure·HttpOnly·SameSite=Lax |
| BotID 없는 convert 차단 | 통과 | Origin·session·body·idempotency 조건을 갖춘 요청도 403 BOT_BLOCKED; session 10/IP 30/month 1,500 미차감 |
| 첫 read-only key 점검 | 유료 호출 차단 | GET 200, keyPresent·finiteRemaining·sufficientForPilot·nonManagementKey true; monthlyFiveDollarLimit false, allowed false; paid/reserved/completed 모두 0 |
| 설정 수정 후 key 점검 | 허용 확인 | 새 Production GET에서 keyFiveMonthly·allowed true |
| 첫 Qwen 파일럿 | 1회 과금·검증 실패 | index 0 요청 후 임시 route 502; 첫 실패 직후 성공 결과 0·추가 유료 요청 0, 이후 manual ACK 완료; 원 chat 출력 미보관 |
| 첫 generation 독립 감사 | 통과 | readonly GET 200, native reasoning own number 0, 실제 비용 $0.00003312, Darkbloom, native input/output 401/8, finish stop; 공식 catalog alias→canonical mapping 확인 |
| 두 번째 Qwen 평가 | error 보존·즉시 중단 | index 2 Chat 출력 와아…! 응…!, reasoning own number 0·cost $0.00003288; Generation HTTP/body/boundedJSON 감사 단계 실패, 당시 HTTP status 미기록 |
| 두 번째 generation 독립 감사 | 통과 | 후속 readonly GET 200, native reasoning own number 0, native prompt/completion 398/8, cost $0.00003288 |
| Benchmark 임시 평가 총계 | 유료 2·성공 0 | 두 행 error 보존, Benchmark 실비 $0.000066; 이후 평가 호출 0·추가 ACK 0·halted 유지; 사용자 Production 변환 및 계정 총 사용량과 별개 |
| dependency audit | 잔존 제약 | dev 경로 braces의 high 1개, CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm; 확인 당시 패치 없음 |

Preview는 고정 예시를 돌려주는 mock 모드다. demo cookie는 배포 origin별 공개 key로 cold instance 사이 검증하지만, quota는 인스턴스 메모리의 체험 예시다. 분산 환경의 비용·보안 한도를 보장하지 않는다. Production은 별도 live secret을 사용하고 demo cookie를 거절한다.

## 남은 운영 검증

| 항목 | 상태 | 필요한 다음 확인 |
|---|---|---|
| OPENROUTER_API_KEY | sensitive 등록·$5 Monthly 확인 | 수정 후 gate true; raw metadata·key label·잔여 금액 미기록 |
| OpenRouter 운영 제어 | 첫 호출 reasoning/실비 확인·후속 검증 필요 | 독립 generation 감사의 native reasoning 0·실비 확인; 재개 시 현재 endpoint 가격 상한·자동 충전 off 확인 |
| Production Basic BotID/live 변환 | 사용자 직접 성공 확인 | 일반 Chrome에서 사용자가 변환 성공 확인; gstack 403·remaining 10 미차감 차단 근거와 구분 |
| 실모델 말투 비교 | 미완료·halted | 유료 2회, 기술적 평가 성공 0; 첫 출력 누락·두 번째 감사 실패, 16건 파일럿 미완료 |
| 공식 발화 대조 | 공식 자료 관찰·한국어 음성 대조 미완료 | 일본어 본문/파생 sample과 AniBox 245·166화 script UI 후보를 구분; 화자·작성/검수 주체 불명·오탈자·직접 청취 미확인, [coverage](character-style-guide.md) 기준 |
| Blob 실제 사용 잔여량 | 운영 정보 미확인 | CLI 조회 불가; [팀 Observability → Blob](https://vercel.com/sangjinsus-projects-7fe3f5cc/~/observability/blob) 숫자 응답 대기, Blob 미사용 직접 모델 평가의 선행 조건과 분리 |
| 실제 OS clipboard | 미검증 | headless 권한 실패; mock writeText 전달 문자열·성공 feedback 확인과 구분 |
| 공개 서비스 품질 검증 | 미완료 | Production READY·사용자 live 성공과 별개로 전체 말투 평가·사람 채점·한국어 음성 대조 미완료 |

## 운영 검증 증거

실제 Production 환경을 CLI에 주입해 실행했다.

```sh
bunx vercel env run -e production -- bun scripts/check-live-blob.ts --live
```

`/private/tmp/chiitalk-live-blob-probe.log`에서 Blob 계약 PASS와 verification 객체 cleanup 완료를 확인했다. `/private/tmp/chiitalk-firewall-rules-verified.json`에는 두 API path 조건, IP limit 10/window 60/algo fixed_window, active·valid·live 및 draft 없음이 있다. `/private/tmp/chiitalk-waf-response-codes.log`에는 200 10개와 429 1개가 기록되어 있다. 임시 증거 파일은 현재 실행 환경의 자료이며 이 문서에는 secret 값을 포함하지 않는다.

초기 `--temporary --dry` 시도의 프로젝트 미연결 오류는 이후 로그인·프로젝트 연결·READY Preview 배포로 해소됐다. 그 실패 기록을 현재 배포 불가 상태로 표시하지 않는다. Production secret 값·OpenRouter key·실제 사용자 문장은 이 기록에 포함하지 않는다.

로컬 env 기록 정정: `.env.local`은 담당자의 `vercel link --yes --project chiitalk` 실행에서 자동 생성한 OIDC 전용 임시 파일이었다. 생성시각, `/private/tmp/chiitalk-project-link.log`의 `Created .env.local`, CLI 63.1.2의 `refreshOidcTokenAfterLink` 소스가 일치했다. 기존 사용자 파일이 아니었고 본문을 읽지 않고 삭제한 뒤 부재를 확인했다. 과거 로컬 env 파일 0개 주장은 잘못됐으며 현재 잔존 파일은 없다. `env run`은 당시 기존 파일을 읽고 Production 변수를 process 환경에 주입했으며, 실제 소스 업로드는 `.env*` 제외 필터를 적용했다.

2026-10-10 17:29 KST metadata 재확인: `OPENROUTER_API_KEY` 미설정, Production 환경변수 5개 유지, READY Preview 1개·READY Production 0개, `.env.local` 부재다. 유료 평가와 Production 완료로 상태를 올리지 않는다.

이후 상태 변경: GitHub `sangjinsu/chiitalk`과 Vercel repoId 1412978852·productionBranch main 연결에서 SHA 9978f47c0cf3872aef542190e1ecbf60be612c1d를 push했다. Git-triggered Production dpl_6yG7DBFXkqwnbp7mDBiGSv2oxMCU가 READY이며 [공개 alias](https://chiitalk.vercel.app)의 익명 200과 동일 배포 UID를 확인했다. 임시 평가기는 원본 앱에 포함되지 않으며 평가 실패가 기술 candidate 배포를 막지 않았다. docs-only skip marker나 별도 Ignored Build Step은 설정하지 않았다.

첫 보호 런타임 read-only key 점검은 $5+Monthly 조합 불일치로 유료 호출을 차단했다. 이 결과만으로 금액과 reset 중 어느 항목이 다른지 단정하지 않는다. 당시 paid/reserved/completed는 모두 0이었다. 사용자 설정 수정 후 새 Production GET에서 keyFiveMonthly·allowed true를 확인했다.

첫 파일럿 index 0의 Qwen 유료 요청 1회는 임시 검증 route 502로 끝났고 후속 호출을 중단했다. 성공 결과는 0개이며 원 chat 출력과 usage는 보관되지 않아 회수할 수 없다. 독립 generation 감사는 native reasoning 0·실제 비용 $0.00003312·provider Darkbloom·native input/output 401/8·finish stop을 확인했다. 공식 catalog에서 requested `qwen/qwen3.5-9b`와 canonical `qwen/qwen3.5-9b-20260310` mapping을 확인했다. 임시 route의 엄격한 model 동일성 검사는 유효한 canonical을 거절하는 결함이지만 첫 요청의 실제 throw 조건을 확정한 것은 아니다. 앱에는 이 alias 동일성 검사가 없다. 앱 provider의 정상 빈 `tool_calls: []` 거절 결함은 수정했고 fresh 기본 34 tests·93 expect calls 및 앱/tools typecheck·lint·build가 통과했다. 임시 v2 소스는 별도 35 tests·130 assertions와 build/typecheck/lint를 통과했다.

첫 실패는 manual ACK를 완료해 failed-reviewed 상태와 원장·중복 차단을 유지한다. 이후 index 2의 Qwen Chat 출력은 와아…! 응…!였고 reasoning own number 0·cost $0.00003288을 확인했지만 Generation HTTP/body/boundedJSON 감사 단계에서 실패해 즉시 halted가 됐다. 당시 HTTP status를 기록하지 않았으므로 404나 eventual consistency로 원인을 단정하지 않는다. 후속 readonly Generation GET 200에서 native reasoning own number 0·native prompt/completion 398/8·cost $0.00003288을 확인했다. Benchmark 총 유료 POST 2회·기술적 평가 성공 0건·실비 $0.000066이며 이후 평가 호출 0·추가 ACK 0이다. 두 error 행을 보존하고 16건 파일럿/전체 비교 완료로 표시하지 않는다. 원본 앱은 Generation 감사 GET에 의존하지 않는다. 담당자가 생성한 임시 배포 4개와 임시 credential 자료는 삭제·부재 확인을 마쳤다.

이전 prompt용 v3 설계 권고는 index 2의 보존 Chat과 동일 generation의 독립 감사를 별도 auditVerified/qualityEligible 근거로 연결하고 원 error를 유지하는 것이다. 출력 유실 case 01 pair와 미호출 Gemini index 1은 표본에서 제외하고 immutable case 31 pair(indices 480/481)를 보완한다. 계획상 paid cap 481/usable 480=240 pairs이며 새 파일럿 16회는 indices 4/5와 다른 7캐릭터 첫 pair, 이후 잔여 463회(index 3 포함)다. 아직 실행·완성된 표본이 아니며 점수는 작성하지 않았다. 새 v2는 과거 표본을 합치지 않는 직접 모델 평가로 분리한다.

사용자가 일반 Chrome에서 공개 Production 변환 성공을 직접 확인했다. Benchmark 유료 2회/$0.000066 기록에는 이 Production 사용을 합산하지 않는다. clipboard 복사 성공 응답은 없어 실제 OS 복사는 미확인이다. 이전 prompt용 v3의 deadline P2 수정 후 Architect 승인·57 tests/1,009 assertions/build exit 0을 확인했다. v3 배포·두 번째 ACK·추가 유료 호출은 아직 없고 새 v2 평가에는 사용하지 않는다.
