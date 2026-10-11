# 말투 평가 절차

현재 평가 대상은 동결한 `2026-10-11-v2`다. `src/lib/character-styles.ts`의 `CHARACTER_STYLE_VERSION`과 fixture의 `promptVersion`이 일치한다. 기존 240개 입력·Case ID·category는 변경하지 않았다. 새 평가는 OpenRouter 모델 서버를 직접 호출하며 사이트의 Blob/session/IP quota를 거치지 않는다. 우선 8캐릭터×Qwen/Gemini의 16개 출력을 같은 동결 prompt로 비교하고 결과를 바탕으로 다음 버전을 개선한다. 아직 새 버전의 유료 호출이나 품질 검수 결과는 없다.

기존 유료 index 0/2와 $0.000066은 이전 prompt 버전의 참고 이력이다. 보존 출력·독립 감사가 있어도 새 v2의 240쌍 평가에 섞지 않는다. 이전 v3의 실패 표본 복구/481회 계획도 이전 버전용 기록이며 새 prompt 평가 계획으로 재사용하지 않는다. 새 run은 prompt 버전과 source SHA를 구분해 기록하고 `humanScores`는 미평가로 유지한다.

평가 입력은 `data/character-evaluation-inputs.json`의 합성 한국어 240개(8캐릭터 × 30)다. 실제 사용자 입력이나 공식 대사가 아니다. 기쁨·슬픔·두려움·요청·자랑·감사·피로·거절 각 3개, 중립 2개, 혼합감정 1개, 줄바꿈/이모지 1개, prompt injection 2개를 캐릭터마다 평가한다.

```sh
bun scripts/evaluate-tones.ts
```

기본은 dry-run이다. ID·개수·300 Unicode code point·예시 8개·8 KiB 프롬프트를 검증하고 계획을 출력하며 유료 요청을 하지 않는다. build/test에서도 live 평가를 자동 실행하지 않는다.

OpenRouter API key를 서버 환경에 설정하고 명시적으로 선택한 경우에만 실행한다. 먼저 작은 표본으로 공급자 가용성과 reasoning 비활성화를 확인한다.

실제 호출 전에 inference key로 `GET https://openrouter.ai/api/v1/key`를 조회해 `data.limit === 5`, `data.limit_reset === "monthly"`, 유한한 `data.limit_remaining`과 이번 평가에 충분한 한도를 내부 확인한다. raw JSON·key label·잔여 금액을 출력하거나 평가 파일에 기록하지 않는다. [현재 key 공식 계약](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-key)을 기준으로 metadata 오류는 미확인으로 처리한다.

`GET /api/v1/credits`는 Management key가 필요하므로 Production inference key로 계정의 현재 credit을 검증할 수 없다. Management key를 앱에 추가하지 않는다. 계정 credit과 자동 충전 off 상태는 사용자가 [OpenRouter credits 설정](https://openrouter.ai/settings/credits)에서 확인한다. 유료 평가 범위는 기존 계획에서 승인됐으며, 현재 제약은 key 설정과 사용 가능한 credit의 확인이다.

```sh
bun scripts/evaluate-tones.ts --live --limit=16 --out=evaluation-output/smoke.json
bun scripts/evaluate-tones.ts --live --limit=480 --out=evaluation-output/full.json
```

먼저 `--live --limit=16` 결과에서 저장된 `reasoningTokens`가 명시적으로 0인지, `costUsd`가 실제 응답의 값인지, 공급자의 현재 endpoints 가격이 아래 상한과 맞는지 확인한 뒤 전체 480회로 진행한다. null·누락은 reasoning off 확인으로 인정하지 않는다. [공식 usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting)을 기준으로 확인한다. 운영자는 402, 한도 부족, metadata 오류, reasoning 미확인 시 현재 실행과 다음 유료 호출을 중단하며 timeout을 자동 retry하지 않는다. 이 운영 기준을 CLI가 모든 오류에서 자동 중단하는 기능으로 해석하지 않는다.

Qwen `qwen/qwen3.5-9b`와 Gemini `google/gemini-2.5-flash-lite`를 같은 스타일 카드·예시·입력으로 비교한다. 공급자 fallback, tools, reasoning, 자동 재시도 없이 순차 실행한다. timeout은 30초, 최대 output은 256 tokens, 호출 총수는 480 이하로 제한한다. 가격 상한은 Qwen input/output $0.10/$0.15, Gemini $0.10/$0.40 per million tokens다. 기준을 지원하는 공급자가 없으면 오류로 기록한다. 평가 요청은 서비스의 월 quota와 별개이므로 같은 API key의 금액 한도를 함께 관리한다.

결과 파일에는 input/output, model, latency, finish reason, 실제 응답에 있는 usage tokens·cost·reasoning tokens만 기록한다. 필드가 없으면 null이며 0이나 추정치로 바꾸지 않는다. 오류 응답 body와 키는 기록하지 않는다. 매 요청 후 저장하여 중단 시 결과를 보존한다. 파일은 로컬 평가 산출물이며 앱의 사용자 기록 저장과는 별개다.

## 사람 평가 템플릿

각 결과에 0(실패)~2(만족)을 적고 출처 또는 실패 이유를 notes에 기록한다. `fidelity`, `emotionPolarity`, `naturalKorean`, `noInventedFacts`, `noPromptLeak`을 모두 평가한다. 문장형에는 `semanticPreservation`을 추가한다. 비언어형에서는 의미 보존 점수 대신 짧은 소리인지, 문장·지문으로 정보를 우회해서 넣지 않았는지 확인한다. 슬픔·거절을 무조건 밝게 바꾸면 실패다.

| caseId | model | fidelity | emotionPolarity | semanticPreservation | naturalKorean | noInventedFacts | noPromptLeak | notes |
|---|---|---|---|---|---|---|---|---|
| 치환할 ID | 실제 모델 | 0~2 | 0~2 | 0~2 또는 N/A | 0~2 | 0~2 | 0~2 | 공식 대조 시점/관찰/실패 원인 |

파일럿 결과를 agent가 검토할 때는 별도 보고서에 `assessmentType: agent-assessed`로 표시하고 위 여섯 metric과 근거를 기록한다. 실제 rows를 확인하기 전에는 점수나 품질 결론을 만들지 않는다. 비언어형의 의미 보존은 N/A로 두며 정보 감소를 문장형과 같은 기준으로 채점하지 않는다. agent 평가는 사람 평가나 한국어 더빙 일치 검증이 아니므로 CLI의 `humanScores: null`을 채우지 않는다. 공식 원작 coverage가 없는 캐릭터는 fidelity 판단의 근거 부족도 notes에 함께 표시한다.

출시 검토 기준은 모든 prompt leak·사실 추가 중대 실패 0개, 모든 캐릭터에서 감정/부정 반전 중대 실패 0개, 각 캐릭터 fidelity와 자연스러움 평균 1.5/2 이상이다. 이 수치는 제품의 평가 목표이며 검증된 성과가 아니다. Qwen이 목표를 못 맞추면 출시를 보류하거나 프롬프트를 고친 뒤 전체 비교를 다시 한다. Gemini로 운영 모델을 자동 전환하지 않는다.

현재 상태: dry-run fixture validation 통과. 첫 보호 런타임 read-only key 조회는 $5+Monthly 조합 불일치로 차단했고 당시 유료 호출은 0회였다. 어느 설정 항목이 달랐는지는 단정하지 않는다. 사용자 수정 후 새 Production GET에서 해당 조합과 `allowed=true`를 확인했다.

첫 Qwen 파일럿 index 0은 유료 호출 1회 후 임시 검증 route가 502를 반환해 당시 성공 결과 0개·후속 호출 0회로 중단했다. 원 chat 출력·usage가 보관되지 않아 회수할 수 없으며 말투 채점도 0개다. 독립 read-only generation GET 200에서는 native reasoning의 실제 숫자 0, 비용 $0.00003312, provider Darkbloom, native input/output 401/8, finish stop을 확인했다. 이는 원 chat usage를 복구한 것이 아니다. 공식 catalog는 requested alias `qwen/qwen3.5-9b`를 canonical `qwen/qwen3.5-9b-20260310`과 연결한다. 임시 검증의 model 동일성 검사가 이 canonical을 거절하는 결함은 확인했지만 첫 실패의 정확한 throw 조건은 확정하지 못했다.

임시 검증의 canonical 허용·선택적 chat usage를 unknown으로 보존·native 독립 감사 처리와 앱의 정상 빈 `tool_calls: []` 허용을 수정했다. 앱 기본 tests 34 pass·93 assertions 및 앱/tools typecheck·lint·build, Architect provider 회귀 6 pass·22 assertions가 통과했고 원본 Git 기술 candidate 배포는 APPROVED다. 별도 v2 tests 35개·130 assertions와 build/typecheck/lint도 통과했다. 첫 index 0 실패는 manual ACK를 완료해 failed-reviewed 상태로 바뀌었으며 실패 원장·중복 차단과 `evaluation-output/pilot-2026-10-10.json`을 보존한다. ACK는 모델을 호출하지 않았다.

그 뒤 index 2의 Qwen 유료 요청에서 Chat 출력 `와아…! 응…!`, reasoning own number 0·cost $0.00003288을 확보했지만 Generation HTTP/body/boundedJSON 감사 단계에서 실패해 즉시 halted가 됐다. 실패 당시 HTTP status는 기록되지 않아 404나 eventual consistency로 단정할 수 없다. 후속 readonly Generation GET은 200이며 native reasoning own number 0·native prompt/completion 398/8·cost $0.00003288을 확인했다. 해당 행은 `evaluation-output/pilot-2026-10-11.json`에 error로 보존한다.

Benchmark 유료 POST는 2회, 기술적 평가 성공은 0건, 확인한 Benchmark 실비는 $0.000066이다. 두 번째 실패 이후 추가 평가 호출과 추가 ACK는 각각 0회이고 평가 halted를 유지한다. 이 수치는 사용자의 Production 변환이나 계정 전체 사용량을 포함하지 않는다. 신규 16건 파일럿과 전체 240입력×2모델 비교는 완료되지 않았다. 원본 앱은 Generation 감사 GET에 의존하지 않으므로 임시 평가기 실패가 기술 candidate 배포를 막지는 않는다. 추가 실행 계획을 완료 실적으로 계산하거나 error 행을 성공으로 바꾸지 않는다.

현재 확보한 출력은 두 번째 실패 행의 한 개뿐이며 16건 완료 파일이 아니다. 파일럿을 완성하고 완료 확인을 받은 뒤 입력·출력·캐릭터 근거를 대조하는 검수 절차는 유지한다. 여섯 metric과 중대 부정/감정 반전·사실 추가·prompt leak의 근거는 별도 `agent-assessed` 보고서에 기록하고 `humanScores: null`은 유지한다. 캐릭터당 입력 한 개×모델 두 개의 소량 표본으로 캐릭터당 30개 전체 품질을 결론 내리지 않는다. 첫 실패는 출력 누락으로 미평가, 두 번째는 감사 실패로 기록하며 현재 점수나 품질 통과 결론은 작성하지 않았다.

이전 prompt용 private v3는 deadline 수정 후 Architect 승인과 57 tests·1,009 assertions/build exit 0을 확인했다. 미배포·두 번째 ACK 미실행·추가 유료 0이며 새 v2 평가는 이 임시 배포 경로를 사용하지 않는다.

v3의 표본 복구 설계는 기존 index 2 error를 불변으로 두고 보존 Chat과 같은 generation의 독립 감사에 별도 `auditVerified`/`qualityEligible` 근거를 연결하는 것이다. 이는 원 error를 성공으로 바꾸는 것이 아니다. 출력 유실 case 01의 pair와 미호출 Gemini index 1을 평가 표본에서 제외하고 immutable case 31 pair(indices 480/481)를 추가하는 권고다. 계획상 유료 상한은 481회, usable 표본은 480개=240 pairs다. 새 파일럿 16회는 indices 4/5와 다른 7캐릭터 첫 pair이며 그 뒤 잔여 463회에는 index 3이 포함된다. 원본 CLI의 480회 제한과 별도 v3 계획을 구분하며 아직 실행 완료나 품질 eligible 확정으로 기록하지 않는다.

운영 Blob 잔여량은 별도 서비스 운영 정보다. CLI billing/metric으로 확인하지 못해 [팀 Observability → Blob](https://vercel.com/sangjinsus-projects-7fe3f5cc/~/observability/blob)의 실제 사용량 응답을 기다리지만, Blob을 쓰지 않는 직접 모델 평가의 선행 조건은 아니다. 모델 평가에는 inference key의 실제 한도·사용 가능한 credit·모델 가격/usage 확인을 적용한다. 일반 Chrome의 Production live 변환은 사용자 직접 성공 확인이며 Benchmark 결과와 별개다.

사람 채점·한국어 음성 대조는 미실행이다. AniBox 공식 업로드 245·166화의 YouTube script UI 후보는 확보했지만 화자/작성·검수 주체가 불명확하고 호칭 오탈자가 있어 exact 한국어 규칙의 확정 근거로 쓰지 않는다. 따라서 모델별 말투 품질, latency, 비용 우열을 주장할 수 없다. [OpenRouter 공식 API response/usage 계약](https://openrouter.ai/docs/api_reference/overview)을 기준으로 metrics 필드를 작성했다.
