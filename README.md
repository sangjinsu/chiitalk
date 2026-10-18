# chiitalk

한국어 문장을 치이카와·하치와레·우사기·쿠리만쥬·모몽가·랏코·시사·후루혼야의 말투로 바꾸는 웹앱입니다. 한 화면에서 캐릭터 선택 → 문장 입력 → 변환 → 결과 복사를 제공합니다.

**핵심 뜻과 감정을 지키면서 캐릭터가 직접 말하는 듯 완전히 다시 표현하는 것**이 목표입니다. 한국어 더빙에 더해 일본 애니메이션의 한국어 번역 자막을 참고합니다. 긴 입력도 상황에 맞으면 감탄·의성어·끊긴 말·한마디로 압축하며, 말할 수 있는 캐릭터도 완결 문장을 채울 필요는 없습니다. 배경 설명을 생략하는 것과 부탁·거절이나 소유 방향을 뒤집는 것은 구분합니다. 후루혼야의 작은 발성은 본인 한국어 발화 자료가 부족한 잠정 정책입니다.

[사이트 열기](https://chiitalk.vercel.app/) · [한국어 더빙 자료](docs/korean-dub-research.md) · [모델 비교](docs/evaluation-v3.md)

기본 모델은 **Claude Haiku 5.5**, 이번 릴리스 source는 **`2026-10-18-v8-subtitle-voices`**입니다. 새 자막·압축 기준의 첫 v7에서 하치와레의 부탁·진술이 상대의 답변·질문으로 바뀐 오류를 확인하고, 보정한 v8의 실제 32개 재검수를 완료했습니다. 비맹검 AI 판정은 **pass 29·weak 3·major 0**이며 같은 표본을 보고 교정한 결과로 원작 정확도 전체를 보장하지는 않습니다. [검수 결과와 보정 범위](docs/evaluation-v3.md#v8의-발화행위와-발성-보정)에 한계를 기록하며, 공개 배포의 Git SHA·Vercel `READY`·도메인 연결은 별도로 확인합니다. 검수 당시 공개 기준점은 10/17 배포한 v5 Git `3dcaf8b`였으며, 이전 비교·추가 검수·원 208개 HOLD는 각 이력으로 보존합니다.

## Bun으로 실행

`package.json`과 `bun.lock`에 고정한 버전을 사용합니다. 현재 Bun 1.3.14, Next.js 16.4.0, React 19.3.0이며 Vercel 배포 runtime은 Node.js입니다.

```sh
bun install
cp .env.example .env.local
bun run dev
```

localhost와 Vercel Preview는 기본 체험 모드입니다. 실제 LLM을 호출하지 않고 입력 의도에 맞는 고정 예시를 보여 줍니다. 체험 횟수는 인스턴스 메모리에 있어 재시작하면 초기화될 수 있습니다. Production은 live 설정과 독립 서버 secret을 요구합니다.

```sh
bun run test
bun run lint
bun run typecheck
bun run build
bun scripts/evaluate-tones.ts
```

마지막 명령은 기본 dry-run이며 유료 요청을 하지 않습니다. [평가 절차](docs/evaluation.md)에 따라 최종 source·입력·예산을 동결한 별도 실행에서만 실제 모델을 비교합니다. build와 test가 live 평가를 실행하지는 않습니다.

## 서버 환경과 사용 제한

Vercel `chiitalk` 프로젝트의 Production에 private Blob store를 연결하고 아래 서버 환경변수를 설정합니다. 값은 저장소·브라우저·채팅·평가 결과에 넣지 않습니다.

| 환경변수 | 용도 |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter inference 전용 key |
| `SESSION_SECRET` | 익명 세션 서명 |
| `QUOTA_HMAC_SECRET` | IP·세션 식별자의 HMAC |
| `BLOB_READ_WRITE_TOKEN` | private quota ledger 접근 |
| `CRON_SECRET` | 오래된 월 ledger 정리 endpoint 인증 |
| `APP_ORIGIN` | 실제 HTTPS origin, 예: `https://chiitalk.vercel.app` |
| `VERCEL_BLOB_RETRIES=0` | 고정 Blob SDK의 자동 retry 비활성화 설정 |

SESSION·QUOTA·CRON secret은 각각 독립적인 32 bytes 이상 무작위 값으로 준비합니다. local live 확인은 서버 secret과 `CHIITALK_MODE=live`, `CHIITALK_ALLOW_LOCAL_LIVE=1`을 명시적으로 갖춘 환경에서만 실행합니다. Preview는 체험 모드를 유지합니다.

Redis와 외부 DB 없이 월별 Vercel Private Blob 하나에 사용 횟수·HMAC 식별자·중복 요청 키를 저장합니다. 사용자 원문·결과·원 IP는 ledger에 저장하지 않습니다.

| 범위 | 한도 / 기준 |
|---|---|
| 서명된 익명 세션 | 유효기간 7일; HttpOnly·Secure·SameSite=Lax |
| 세션별 변환 | 한국 시간 하루 10회 |
| trusted IP별 변환 | 한국 시간 하루 30회 |
| 서비스 전체 변환 | 한국 시간 월 1,500회 |
| API Firewall | IP당 분당 10회; `/api/session`, `/api/convert` |

쿠키와 IP를 동시에 바꾸는 익명 사용자를 완전히 식별할 수는 없습니다. 세 한도를 함께 예약하고 전체 월 한도로 비용을 통제합니다. 예약 뒤 생성 실패·timeout은 횟수를 소비하며 입력 오류·예약 전 한도 거절은 차감하지 않습니다.

## 한국어 말투 근거와 비교

공식 TV 24편·영화 홍보 8편·성우 본인 자료 2편의 출처·전체 길이·범위를 [연구 목록](docs/korean-dub-research.md)에 공개합니다. 실제 미디어 요청 17회는 제한적 AI 후보 9건·근거 부족 5건·형식 실패 3건으로 구분했습니다. 후보의 관찰을 새로 작성한 제품 예시에 좁게 적용하며, 모몽가의 중복 장면 가능성·랏코의 조건부 화자 해석·후루혼야의 한국어 발화 공백을 표시합니다. 사람의 직접 청취·정확 전사·발화 시각 확정은 아직 0건입니다.

10/18에는 한일 비교 팬 영상의 화면 자막에서 모몽가의 짧은 요구, 하치와레의 끊긴 호칭, 시사의 정중한 부탁·호칭을 확인했습니다. 이는 한정된 장면의 팬 번역이며 공식 한국어 대본이나 음성 대조 결과가 아닙니다. 나머지 다섯 캐릭터의 새 한국어 자막 발화는 확보하지 못했습니다. 우사기의 큰 외침은 공식 일본어 소개를 보조 근거로 삼고, 사용자 제공 하치와레 노래 영상은 일반 대화 자료와 분리합니다. [출처와 확인 시점](docs/korean-dub-research.md#2026-10-18-한국어-자막-추가-조사)을 기록했습니다.

이전 v4의 실제 128개 비교는 의미·화자·소유·요청/거절, 제품 규칙, 출처 범위의 스타일을 먼저 보고 재구성·자연스러움을 따로 평가했습니다. 판정 동결 뒤 공개한 Chat 실측 합은 $0.0196081이며 Haiku 32개에는 weak 14개가 있습니다. 이 중 모몽가 4개는 원 v4 표본이고 다른 7캐릭터 28개는 payload 동등성에 따라 근거를 재사용할 수 있습니다. 원 8개 미리보기도 v4 실제 출력으로 보존합니다. 새 v5 모몽가 품질을 이 결과로 확인했다고 표시하지 않습니다. 사람 청취·채점은 0, native 독립 감사는 원 128개 모두 HTTP 404 pending입니다. [이전 strict 판정](docs/evaluation-v3.md#이전-strict-128개의-실제-판정)과 불변 [v2 보고서](docs/evaluation-v2.md)는 각 조건의 기록으로 보존합니다.

기본 모델·가격 상한은 서버의 [모델 설정](src/lib/server/model-config.ts)에서 관리하며 클라이언트가 바꾸지 못합니다. v5의 기본 240개 payload는 같은 source의 explicit Haiku 240개와 일치했고, 다른 7캐릭터 210개는 v4 동결 payload와 같았습니다. v7은 공통 압축 규칙도 바꾸므로 이 동등성을 새 source에 재사용하지 않습니다. 10/17 v5 배포 직전 Bun 91 tests·1,811 assertions, 앱/tools typecheck·lint·build가 통과했습니다. [가격 snapshot과 검증 범위](docs/evaluation-v3.md#haiku-기본-모델-적용과-모몽가-추가-검증)는 날짜별 기록이며 공식 더빙과 똑같은 표현을 보장하지 않습니다.

## 호출 제어와 운영 확인

OpenRouter는 서버에서만 호출합니다. 입력 300 Unicode code points·프롬프트 8 KiB·출력 256 tokens·timeout 30초로 제한하고 reasoning·tools·plugins·공급자 fallback·자동 LLM retry를 사용하지 않습니다. 필요한 옵션·가격 상한을 만족하는 제공자가 없으면 호출하지 않습니다.

`POST /api/convert`는 입력·Origin·BotID·세션·현재 월의 Idempotency-Key를 검증한 뒤, 최신 Blob과 ETag의 조건부 쓰기로 세 한도를 함께 예약합니다. 예약이 확인된 요청만 모델을 한 번 호출합니다. Blob 장애·쓰기 결과 불명확·CAS 최대 3시도 실패·한도 소진은 fail closed로 처리합니다. 세션·변환 응답은 캐시하지 않습니다. pinned Blob SDK의 retry 설정은 공개 API 계약이 아니므로 SDK 변경 때 실제 동작을 재검증합니다.

배포 전후에는 다음을 확인합니다.

1. OpenRouter 전용 key의 월 $5 제한·Monthly reset과 자동 충전 해제. 공급자 한도는 UTC, 앱 월 한도는 KST 기준입니다.
2. Vercel Production 환경변수·private Blob 연결·BotID·Firewall 규칙의 실제 적용.
3. `bun run check:live-blob` dry-run과 명시적인 live 검사에서 ETag CAS·동시 예약·불명확 쓰기 차단. live 검사는 Blob을 사용하지만 모델을 호출하지 않습니다.
4. [Vercel Blob 사용량](https://vercel.com/sangjinsus-projects-7fe3f5cc/~/observability/blob)의 이번 달 Advanced Operations 잔여량. 저장소 작업과 LLM 호출 예산은 별개이며 잔여량은 아직 미확인입니다.
5. 실제 배포의 일반 브라우저 변환·모바일 선택·키보드 입력·결과 복사·남은 횟수 표시. 자동화 브라우저의 BotID 차단은 정상 사용자 성공 검증을 대신하지 않습니다.

원 v4의 근거·예시는 [재표현 기준](docs/evaluation-v3.md#재표현-v4의-새-검수-기준), v5의 source 검증·추가 30개·공개 배포는 [적용 기록](docs/evaluation-v3.md#haiku-기본-모델-적용과-모몽가-추가-검증)에 있습니다. 첫 v7의 32개는 사이트 API와 Blob quota를 쓰지 않고 보호된 모델 서버에서 직접 검수했습니다. v8은 같은 결과를 보고 고친 뒤 같은 32개로 재검수하므로 독립 holdout 평가가 아닙니다. 계정 전체 credit은 앱 inference key로 조회하지 않았으며 사용 가능한 credit은 사용자 확인 정보입니다. 과거 초기 배포·503 수정·평가 중단 이력은 [이전 운영 기록](docs/implementation-progress.md)과 [평가 기록](docs/evaluation.md#이전-프롬프트의-중단복구-이력)에 보존합니다.

[말투 가이드](docs/character-style-guide.md) · [디자인 기준](docs/design-reference.md) · [구현 계획](docs/implementation-plan.md)
