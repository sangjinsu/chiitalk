# chiitalk

한국어 문장을 치이카와, 하치와레, 우사기, 쿠리만쥬, 모몽가, 랏코, 시사, 후루혼야 분위기로 바꾸는 웹앱입니다. 캐릭터 설명과 예시는 공식 자료에 기반해 새로 만든 한국어 재해석입니다. 비언어 캐릭터는 문장의 상세 정보보다 감정을 작은 소리로 전합니다.

작업본 말투 v2(`2026-10-11-v2`)는 64개 예시를 유지하며 발화 의도·혼합 감정·상황별 어미를 보강했습니다. 아직 새 버전의 실제 모델 품질 검증은 없습니다. 사이트 운영 경로를 거치지 않는 OpenRouter 직접 8캐릭터×2모델 비교를 먼저 수행하며 이전 prompt의 유료 결과와 합산하지 않습니다.

[공개 Production](https://chiitalk.vercel.app)이 Git 배포로 READY 상태이며 익명 접근 200을 확인했습니다. 일반 Chrome에서 실제 변환 성공은 사용자 직접 확인 결과입니다. [체험 Preview](https://chiitalk-f3bsktfwm-sangjinsus-projects-7fe3f5cc.vercel.app)는 Vercel 로그인 보호를 유지하며 mock 모드로 동작합니다. 전체 말투 품질 검수는 미완료입니다.

## 로컬 실행

Bun 1.3.14와 Node.js 20.9 이상을 사용합니다. Vercel 프로젝트의 Production Node runtime은 24.x로 설정했습니다. 실제 설치 버전은 package.json과 lockfile이 기준입니다.

```sh
bun install
cp .env.example .env.local
bun run dev
```

local과 Vercel Preview는 기본 체험 모드입니다. 실제 LLM 호출 없이 입력 감정에 맞는 고정 예시를 보여줍니다. 이 결과가 원문을 실시간 변환했다고 판단하면 안 됩니다. 체험 quota는 인스턴스 메모리에 있어 다른 인스턴스와 공유되지 않으며, 재시작하면 초기화될 수 있습니다. 화면 동작을 위한 예시이며 분산 환경의 비용·보안 한도가 아닙니다. Preview cookie가 cold start 사이에 유지되도록 배포 origin별 공개 demo key를 사용합니다. Production은 독립된 live secret을 요구하고 demo cookie를 거절하며, 설정 누락 시 요청을 차단합니다.

```sh
bun run test
bun run lint
bun run typecheck
bun run build
bun scripts/evaluate-tones.ts
```

마지막 명령은 240개 합성 평가 입력의 dry-run이며 유료 요청은 0회입니다. 새 말투 v2의 의도 선택/경계 검사 포함 41 tests·503 assertions와 앱/tools typecheck·lint가 통과했으며 build는 통합 검증에서 확인합니다. 사람의 말투 품질 평가 결과는 아직 없습니다.

`bun run typecheck`는 앱(`tsconfig.json`)과 운영 CLI·tests(`tsconfig.tools.json`)를 모두 검사합니다. `bun run typecheck:app`과 `bun run typecheck:tools`로 따로 실행할 수도 있습니다. Next build는 `src`, `next.config.ts`, Next 생성 타입만 검사하므로 배포에서 제외한 평가 script/fixture에 의존하지 않습니다. 운영 CLI의 fixture import와 strict 검사도 별도 검사에 유지하며 TypeScript build 오류를 무시하지 않습니다. 로컬 평가 결과 `evaluation-output/`은 Git에서 제외합니다.

## 운영 설정

Vercel Production의 서버 환경에 `SESSION_SECRET`, `QUOTA_HMAC_SECRET`, `BLOB_READ_WRITE_TOKEN`, `OPENROUTER_API_KEY`, `CRON_SECRET`를 설정합니다. SESSION/QUOTA/CRON secret은 독립적으로 생성한 충분히 무작위인 32 bytes 이상 값이어야 합니다. `APP_ORIGIN`은 실제 HTTPS origin으로 지정합니다. `.env.example`에는 값 없는 placeholder만 있습니다. 키를 소스·브라우저·채팅·평가 결과에 넣지 않습니다.

현재 Hobby 팀 `sangjinsus-projects-7fe3f5cc`의 `chiitalk` 프로젝트에 private Blob `chiitalk-quota`를 서울 `icn1` region·Production 환경에만 연결했습니다. Production에는 `SESSION_SECRET`, `QUOTA_HMAC_SECRET`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `APP_ORIGIN=https://chiitalk.vercel.app`과 sensitive `OPENROUTER_API_KEY`를 등록했습니다. sensitive key는 로컬 `env run`으로 내려받을 수 없어 보호된 임시 런타임 probe로 확인합니다. 첫 read-only 점검에서는 `$5 + Monthly` 조합 불일치로 유료 호출을 차단했고, 사용자 설정 수정 후 새 Production 점검에서 해당 조합과 `allowed=true`를 확인했습니다. [프로젝트 환경변수 설정](https://vercel.com/sangjinsus-projects-7fe3f5cc/chiitalk/settings/environment-variables)에는 key 값 대신 등록 상태만 확인합니다.

1. 별도 Vercel 프로젝트와 private Blob store를 연결하고 Production 환경을 설정합니다.
2. `bun run check:live-blob`은 기본 dry-run입니다. private 테스트 store의 token을 서버 환경에 지정한 뒤 `bun run check:live-blob --live`로 초기 생성 충돌·uncached read·ETag CAS·동시 write의 한 승자·최신 읽기를 확인합니다. 고유한 `verification/chiitalk-<UUID>.json`만 쓰고 finally에서 삭제하며 LLM을 호출하지 않습니다. quota 중복 예약과 불명확 write의 fail-closed 동작은 unit tests에서도 확인합니다. 실환경 테스트 결과를 남긴 뒤 공개합니다.
3. Production Basic BotID가 실제 인간 요청을 통과시키고 차단 요청을 막는지 확인합니다. 개발 모드 bypass만으로 검증 완료로 판단하지 않습니다.
4. Vercel WAF dashboard에서 `/api/session`, `/api/convert`에 적용되는 IP 10 requests/min 규칙 한 개를 구성합니다. Hobby의 사용 가능한 규칙과 실제 적용은 dashboard에서 확인합니다.
5. OpenRouter 전용 API key를 월 $5 한도(UTC)로 설정하고 자동 충전을 끕니다. 기존 계정·결제 설정을 앱이 자동 변경하지 않습니다. 운영 Qwen 공급자가 reasoning off·가격 상한을 실제 지원하는지 소량 호출로 확인합니다.
6. [말투 평가](docs/evaluation.md)의 작은 표본과 전체 480회 비교, [공식 근거](docs/character-style-guide.md)의 실제 발화 대조를 실시합니다.
7. 실제 배포 URL에서 기능·responsive·keyboard 동작과 운영 오류를 확인합니다.

실제 Production 환경을 CLI 실행에 주입해 다음 Blob 검증을 통과했습니다. private uncached read, 같은 경로의 중복 생성 차단, ETag CAS 동시 write에서 승자 한 개, 최신 read와 테스트 객체 정리를 확인했으며 LLM 호출은 0회입니다.

```sh
bunx vercel env run -e production -- bun scripts/check-live-blob.ts --live
```

WAF 규칙은 `/api/session` 또는 `/api/convert`를 대상으로 IP별 60초 fixed window에서 10회로 게시했고 active·valid·live 상태를 확인했습니다. 동일 IP의 실제 GET에서 200 응답 10회 뒤 429 응답 1회를 확인했으며 미게시 draft는 없습니다. 이 검증은 Production Basic BotID의 실제 인간/봇 판별 검증을 대신하지 않습니다.

local live 요청은 `CHIITALK_MODE=live`, `CHIITALK_ALLOW_LOCAL_LIVE=1`과 다섯 서버 secret을 명시적으로 갖춘 경우에만 가능합니다. Preview는 체험 모드를 유지합니다. 평가 CLI의 `--live`는 명시적 유료 호출이며 앱 quota와 별개입니다.

## 비용과 요청 제어

live session cookie는 서버 서명·HttpOnly·SameSite이고 7일 유지됩니다. live에서는 session 하루 10회, trusted IP 하루 30회, 전체 서비스 KST 월 1,500회로 제한합니다. 월별 private Blob ledger에 session/IP HMAC과 요청 중복 키·횟수만 저장하고 사용자 원문과 출력은 저장하지 않습니다. API 응답에는 변환 결과와 quota만 전달하고 session ID·IP·원문·model secret·prompt는 내보내지 않습니다. 소진 뒤 `resetAt`에 자동 조회하고 창으로 돌아올 때 다시 확인하며, 사용자가 수동으로 횟수를 확인할 수도 있습니다. 자동 조회는 변환 요청을 재전송하지 않습니다.

quota를 먼저 예약한 뒤 모델을 한 번 호출합니다. 300 Unicode code points, 8 KiB prompt, 256 output tokens, 30초 timeout, 공급자 fallback·tools·reasoning·자동 LLM retry 없음이 기본입니다. 실패·취소도 예약된 횟수를 사용하며 불명확 write는 fail closed 합니다. cookie 초기화와 IP 변경을 함께 하는 익명 사용자를 완전히 식별할 수는 없고, 전역 월 한도가 총 호출을 제한합니다.

단일 Blob은 모든 요청을 직렬 경쟁시키므로 동시성이 높으면 known CAS 3시도 뒤 잠시 오류가 날 수 있습니다. `@vercel/blob` 2.8.1 내부 소스에서 `VERCEL_BLOB_RETRIES=0` 동작을 확인해 SDK 자동 retry를 끄지만 공개 API 계약은 아닙니다. SDK를 업데이트할 때 재검증해야 합니다. Blob Advanced operations의 포함량/과금은 별도 제한이며 경쟁 요청·session 조회로 월 1,500 호출 이전에 포함량을 쓸 수 있습니다. LLM 예산과 저장소 비용은 별개입니다.

Blob CLI의 billing/metric 조회에서 실제 잔여량을 확인하지 못했습니다. 팀의 [Observability → Blob](https://vercel.com/sangjinsus-projects-7fe3f5cc/~/observability/blob)에서 이번 달 Advanced Operations 사용량을 확인합니다. 월 무료 포함량 2,000회와 실제 남은 수치는 구분하며, 현재 사용자 Usage 숫자 응답 전까지 잔여량은 미확인입니다. Blob을 쓰지 않는 직접 모델 평가는 운영 quota와 분리합니다.

Cron `/api/cron/cleanup`은 bearer `CRON_SECRET`를 요구하고 매일 16:00 UTC(01:00 KST)에 실행하도록 설정되어 있습니다. 현재·이전 달 ledger를 유지하고 더 오래된 월 문서만 삭제합니다. 자동 key 한도 UTC와 앱 quota KST의 월 경계는 서로 다릅니다.

## 현재 검증 범위

provider 수정 후 기본 `bun run test`는 34 pass / 0 fail / 93 assertions, 앱·tools typecheck와 lint·build는 모두 exit 0으로 통과했습니다. Architect의 provider 회귀 검사도 6 pass / 22 assertions로 통과했고 원본 Git 기술 candidate 배포를 APPROVED로 판정했습니다. 월간 1,500회 스트레스 case 한 개의 test timeout만 15초이며 제품의 로직과 한도는 유지합니다. 기술 배포 확인과 말투 품질 검증은 구분합니다. 상세 결과는 [진행 기록](docs/implementation-progress.md)에 남깁니다.

공개 Production의 375px 화면에서 캐릭터 8개 2열·가로 overflow 0과 BotID SDK `c.js` 200을 확인했습니다. gstack 브라우저의 변환 요청 1회는 403 `BOT_BLOCKED`였고 remaining 10을 유지했으며 quota 예약·모델 호출·자동 재시도는 모두 0회였습니다. 일반 Chrome의 Production live 변환·정상 사용자 BotID 통과는 사용자가 변환 성공을 직접 확인했습니다. 사용자 확인과 자동화 브라우저의 차단 검증을 구분합니다. 실제 clipboard 복사는 사용자 확인이 없어 미검증 상태를 유지합니다.

localhost demo에서는 변환 200·10→9·모델 호출 0, desktop 1280px/mobile 375px overflow 0, ArrowRight 캐릭터 선택·Enter 개행·JS error 0을 확인했습니다. 실제 clipboard는 headless 권한 실패로 확인하지 못했으며 mock `writeText`에 전달한 결과 문자열과 성공 feedback만 확인했습니다. 기존 mock Preview API도 demo 10→9를 확인했습니다. 임시 Production proof의 live session·no-store·Secure/HttpOnly/SameSite=Lax cookie와 BotID 차단 시 quota 미차감은 별도 확인 기록입니다.

Benchmark의 임시 평가 유료 POST는 총 2회이며 두 행 모두 error로 보존되어 기술적 평가 성공은 0건입니다. 이 횟수와 실비는 사용자의 Production 변환을 포함한 계정 전체 사용량이 아닙니다. 첫 index 0은 출력이 유실됐고 manual ACK를 완료한 뒤 failed-reviewed 상태와 중복 차단을 유지합니다. 두 번째 index 2의 Qwen Chat 출력은 `와아…! 응…!`였지만 Generation 감사 단계에서 실패해 즉시 중단했습니다. 각 독립 Generation GET에서 native reasoning 0과 실제 비용 $0.00003312/$0.00003288을 확인했으며 Benchmark 총 실비는 $0.000066입니다. 실패 당시 HTTP status를 기록하지 않아 404나 eventual consistency가 원인이라고 단정하지 않습니다. 이후 추가 Benchmark 호출·ACK는 없고 평가 halted 상태입니다. 이전 prompt용 private v3는 deadline 수정 후 Architect 승인·57 tests/1,009 assertions/build exit 0을 확인했지만 미배포·두 번째 ACK 미실행·추가 유료 0입니다. 새 v2 평가는 OpenRouter 직접 호출로 분리합니다. 원본 앱은 Generation 감사 GET에 의존하지 않습니다. 16건 파일럿·전체 품질 비교·사람 채점·한국어 더빙 검수는 미완료입니다. 자세한 감사 범위는 [평가 절차](docs/evaluation.md), 공식 원작 본문과 파생 자료의 구분은 [말투 coverage](docs/character-style-guide.md)에 기록했습니다.

GitHub `sangjinsu/chiitalk`의 main/origin SHA `9978f47c0cf3872aef542190e1ecbf60be612c1d`에서 Git-triggered Production `dpl_6yG7DBFXkqwnbp7mDBiGSv2oxMCU`가 READY입니다. 공개 alias와 배포 UID 일치 및 익명 200을 확인했습니다. 담당자가 만든 임시 배포 4개는 삭제 exit 0·인증 목록 잔존 0·각 raw URL 404를 확인했고, 임시 token/env/header 파일과 `.env.local`은 없습니다. Production 환경변수는 기존 6개만 남고 원본에 verification route는 없습니다. docs-only skip marker나 별도 Ignored Build Step을 설정하지 않았습니다.

프로젝트 연결 시 CLI가 OIDC용 임시 `.env.local`을 자동 생성했던 사실을 확인해 기존의 로컬 env 파일 0개 주장을 정정했습니다. 본문을 읽지 않고 해당 임시 파일을 삭제했으며 현재 잔존 파일이 없습니다. 업로드에서는 `.env*`를 제외했습니다. Production 변수는 `vercel env run`이 실행 process에 주입했습니다.

2026-10-10 dependency audit에서 dev dependency 경로 `eslint-config-next > @next/eslint-plugin-next > fast-glob > micromatch > braces`에 [CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)이 남아 있습니다. 확인된 registry 최신 `braces` 3.0.3까지 영향이 있고 패치 버전은 없습니다. Next ESLint의 고정 `settings.next.rootDir` glob 경로에서 사용되며 Production API의 사용자 문장을 이 경로에 전달하지 않습니다. 자동으로 해결됐다고 판단하지 않고, 패치가 나오면 dependency와 audit을 다시 확인합니다.

[구현 계획](docs/implementation-plan.md) · [캐릭터 근거와 스타일](docs/character-style-guide.md) · [디자인 기준](docs/design-reference.md) · [평가 절차](docs/evaluation.md)
