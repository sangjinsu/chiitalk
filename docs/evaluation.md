# 말투 평가 절차

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

출시 검토 기준은 모든 prompt leak·사실 추가 중대 실패 0개, 모든 캐릭터에서 감정/부정 반전 중대 실패 0개, 각 캐릭터 fidelity와 자연스러움 평균 1.5/2 이상이다. 이 수치는 제품의 평가 목표이며 검증된 성과가 아니다. Qwen이 목표를 못 맞추면 출시를 보류하거나 프롬프트를 고친 뒤 전체 비교를 다시 한다. Gemini로 운영 모델을 자동 전환하지 않는다.

현재 상태: dry-run fixture validation 통과. 유료 모델 평가·사람 채점·한국어 더빙 대조는 미실행이다. 따라서 모델별 말투 품질, latency, 실제 비용 우열을 주장할 수 없다. [OpenRouter 공식 API response/usage 계약](https://openrouter.ai/docs/api_reference/overview)을 기준으로 metrics 필드를 작성했다.
