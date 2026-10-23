# 말투 평가 절차

현재 저장소 구현은 **말 중심 네 캐릭터에 GPT-5.4 mini(H), 발성 네 캐릭터에 Haiku**를 사용한다. H는 같은 12입력에서 전체 4/8/0·원 의미 10/2/0·독립 의미 9/3/0이며 weak는 남는다. **제품 통합·최종 기술 검사·Architect 소스 승인은 완료**했다. 변경 전 공개 baseline은 c052·v8·Haiku다. Git push·실제 새 배포·canary는 별도 릴리스 근거로 확인하며 소스 검사 통과로 대신하지 않는다. 최근 네 단계 실제 생성은 88회·관측 Chat 합 $0.0269819이며 최종 청구는 미확인이다. [추가 검증 기록](evaluations/2026-10-23-model-comparison.md)에 첫 24개·repair16·speaker-fix의 HOLD와 최종 선정 범위를 각각 보존한다. v11 실제 56개 판정 20 pass·28 weak·8 major·HOLD도 유지한다. v10 실제 48개의 pass 16·weak 30·major 2·HOLD와 v9 실제 32개의 pass 17·weak 11·major 4·HOLD는 보존한다. [평가 기록](evaluation-v3.md)은 이전 strict/v4 128개·미디어 17개·v5 추가 30개·v7/v8/v9/v10/v11 결과를 구분한다. source 기술 검사·응답 수집·모델 품질·공개 배포는 별도 근거로 확인하며 원 208개 확대는 HOLD다.

이전 [v2 보고서](evaluation-v2.md)는 고유 480시도 중 실제 언어 결과 479개를 AI 검수한 불변 기록이다. 응답 미확인 1건을 재호출하지 않았고 major 76개 중 명백한 의미·화자·의도·역할 충돌은 37개였다. v2의 사람 채점·한국어 더빙 음성 대조는 0건이고 native 감사는 pending이다. 기존 실패 표본·출력·판정을 v3 결과로 고치거나 서로 다른 조건의 개선율로 합산하지 않는다.

## 평가 CLI의 현재 범위

기본 4모델 목록과 8캐릭터 전체 범위는 유지한다. 말 중심 캐릭터만 고르는 옵션은 없다. 이 기본 범위로 live를 실행하면 Haiku 전용인 발성 preflight가 `UNSUPPORTED_VOCAL_MODEL`로 거절하며 Chat POST는 0이다. 다른 모델을 Haiku로 몰래 바꾸는 fallback도 없다.

계획용 예시는 다음과 같다. `--out`은 매 평가에 사용하지 않은 고유 경로로 정한다.

```sh
bun scripts/evaluate-tones.ts --dry --models=anthropic/claude-haiku-5.5 --pilot --out=evaluation-output/haiku-pilot-2026-10-23-plan01
```

`--live`와 `--dry`는 동시에 사용할 수 없다. 실제 live 평가는 별도 실행 승인·key/catalog·예산 확인 뒤 `--dry` 대신 `--live`를 쓰되 8캐릭터 범위의 모델 선택은 위 Haiku 단일값으로 한정한다. 기본 또는 `--dry` 실행은 계획용이다. 현재 parser에 `--help`나 말 중심 filter 옵션은 없다.

GPT-5.4 mini의 이번 말 중심 12개 비교는 고정 QA runner의 별도 실행이다. 일반 CLI가 제품 HTTP의 캐릭터별 혼합 routing을 대신하지 않으며 CLI의 이 제한은 제품 HTTP의 지원 범위를 뜻하지 않는다. 코드 기본값이나 CLI filter 기능을 새로 추가한 기록은 아니다.

## dry-run과 실제 실행

```sh
bun scripts/evaluate-tones.ts
```

기본은 dry-run이다. 합성 입력·ID·300 Unicode code point·직접 작성 예시·8 KiB 프롬프트를 검증하며 유료 모델을 호출하지 않는다. build와 test에도 live 평가를 넣지 않는다. 원 v4의 네 문장 × 8캐릭터 × 4후보 128행과 기존 fixture 240개는 별개다. v5에서 확인한 타 7캐릭터 210개 payload 동등성은 v5에만 적용하며 공통 규칙이 바뀌는 v7에 재사용하지 않는다. 원 후속 208개 계획은 HOLD·추가 POST 0이다. 완료한 v5 모몽가 30개와 기존 strict/v4 판정·8개 미리보기를 새 v7 결과로 자동 변환하지 않는다.

실제 평가는 사이트의 `/api/convert`와 Blob/session/IP quota를 거치지 않고, 보호된 서버에서 OpenRouter 모델을 직접 호출한다. 따라서 Blob 잔여량은 모델 비교의 선행 조건이 아니다. 모델 비용은 같은 inference key의 월 제한 안에서 별도로 예약·기록한다. source·예산·실제 요청 수가 동결되지 않은 준비 파일을 실행 승인이나 완료 결과로 세지 않는다.

실제 호출 전 inference key로 `GET https://openrouter.ai/api/v1/key`를 조회해 월 $5 제한·Monthly reset·유한한 잔여 한도·보수적 실행 예산을 내부 확인한다. key 값·label·raw JSON·잔여 금액은 평가 파일에 넣지 않는다. `GET /api/v1/credits`는 Management key가 필요하므로 앱 inference key로 계정 전체 credit을 검증했다고 표시하지 않는다. 자동 충전 off는 사용자가 확인한 계정 설정이다. Management key를 앱에 추가하지 않는다. [공식 key 계약](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-key)을 기준으로 불명확한 한도는 미확인으로 처리한다.

원 후속 208개 확대는 사용자의 새 방향에 따라 HOLD다. 사용 가능한 credit은 사용자 확인 정보이며 앱 inference key로 계정 전체 잔액을 실제 조회하지 않았다. 공식 API 계약상 이 조회에는 Management key가 필요하다. 사용자 확인·key의 월별 잔여 허용량·source 예산 계산을 API로 검증한 account wallet 잔액이나 추가 생성 성공으로 표시하지 않는다. 새 v7 실행은 새 source·예산·현재 key와 공급자 조건을 확인하는 별도 절차다.

## v11의 말 중심 압축과 56개 검수 계획

v11은 말 중심 네 캐릭터의 **현재 핵심 대사와 필요한 조건을 반복 없이 한 번씩** 표현하도록 보강한다. 완료해야 하는 선행조건은 짧아지더라도 남긴다. 직접 작성한 요청·조건·약속 대조 예시를 줄이면서 빌림 허락과 빌려주겠다는 약속, 부정 부탁·아쉬움이 남은 휴식 의사·간접 허용 질문을 구분하도록 한다. 시사의 정중한 1인칭 `제`와 상대의 소유를 혼동하지 않고 화자의 의지·부탁을 다른 화자의 답변으로 바꾸지 않도록 안내한다. 이는 D 제품 정책이며 아직 실제 모델 품질이 확인된 결과가 아니다.

발성 네 캐릭터·palette·decoder·provider와 운영 경로는 이전 후보와 동일하다. 동결 style SHA는 `19d11cd3ccf06d0b03ff68207233870bc24a42c6aa797a77b6a8dba10444501f`다. 제품 **162 tests·3,225 assertions·실패 0**, 앱/tools typecheck·lint·Bun build·diff 검사 통과가 보고됐다. 검사한 512개 payload는 최대 3 shots·입력 300 code points·전체 body 최대 7,768/8,192 bytes였다. 기술 검증·source 준비 승인은 모델 품질 승인과 다르며, 동등한 이전 payload를 새 실제 검수 실적으로 세지 않는다.

실행 계획은 **기존 48개 실패를 검토한 뒤 보정한 비맹검 회귀 + 신규 목표 합성 8개 = 56개**다. 발성 24개·말 중심 32개이며 새 8개는 245–259 Unicode code points다. 기본 240개·32개 fixture 본문은 유지한다. 이 56개를 사람의 맹검 평가·일반 사용자 분포로 부르지 않는다. **$0.0989184는 보수 예약 상한이며 실제 지출이 아니다.** 이 절의 준비·실제 0 상태는 실행 전 시점의 기록이다.

2026-10-23 후속 기록: v11 실제 56개 호출·56개 AI 판정은 완료됐고 **20 pass·28 weak·8 major·HOLD**, Chat 보고 비용은 **$0.0144954**다. 같은 기존 48개의 표시 길이는 **2,101→1,475 code points**였지만 소유·선행조건·화자/발화행위 오류가 남았다. native 감사 56개는 HTTP 404 pending이며 v11 공개 배포는 보류다. 원본 hash·분모와 [후속 근거](evaluations/2026-10-23-model-comparison.md#v11-실제-56개의-후속-기록)는 별도로 보존한다.

## v10의 출력 제약과 48개 검수 계획

v10은 말 중심 네 캐릭터에서 **핵심 조건·아직 확인하지 못한 사실·소유자와 보관자의 구분·요청/반환 방향·주된 거절**을 압축보다 먼저 지킨다. 나머지 과거 경위·중복 설명을 덜고 표현을 다시 구성한다. 발성 중심 치이카와·우사기·쿠리만쥬·후루혼야는 캐릭터별 20개 D 제품 표현의 유한한 palette에서 모델이 하나를 선택한다. palette는 공식 대사나 감정별 정답 목록이 아니며 새 한국어 발화 근거도 아니다.

발성형은 native JSON schema의 `text` enum으로 요청하고 공통 서버 decoder가 정상 완료·JSON 객체·정확한 단일 `text` key·문자열·정확한 enum 일치를 확인한다. 잘못된 JSON·비정상 종료·거절·추가 key·범위 밖 표현은 실패로 처리하며 자동 재시도·fallback·문자 수정·다른 표현 대입을 하지 않는다. 서비스와 Preview mock은 모두 사용자에게 plain text만 반환한다. 평가 기록의 `rawOutput`은 원 Chat 문자열을 그대로 보존하고, `displayOutput`은 공통 decoder로 검증한 표현을 별도 보존한다. 원문을 정리해 성공 응답으로 바꾸지 않는다.

실행 범위는 **v9의 실패를 보고 보정한 기존 32개 비맹검 회귀 + 신규 16개 = 48개**다. 기존 32개와 그 안의 원 신규 16개는 노출된 회귀 표본이다. 새 16개는 각 231–249 Unicode code points의 목표를 둔 자체 합성 입력이며 저자는 v10 source를 보지 않았고 구현자에게도 비공개로 동결했다. 이를 일반 사용자 분포나 사람의 맹검 평가로 확대하지 않는다. 전체 48개 fixture SHA는 `876f1d558e36ff525b9a834ae0a1039ac361d17c2ed883629fbdd0c959f8de91`이며 보수적 실행 예약액은 **$0.0847872**다.

- `rawOutput`·`displayOutput`·입력·캐릭터·payload·source의 연결, 정상 종료·정확 enum 통과와 실패 상태를 따로 검수한다.
- 소유·조건·반환/거절 방향, 현재 감정·새 사건 추가, palette 선택의 적합성·단조로움을 판정한다. enum 통과만으로 의미·말투를 pass로 만들지 않는다.
- Haiku·가격 상한·입력 300 code points·최대 3 shots·출력 256 tokens·timeout 30초·reasoning off·retry 0을 유지한다. 사이트 API·Blob quota를 거치지 않는다.

style SHA는 `aa3e13a9d6d5d59257f94728d567f47f471880f9baeb604c6bd8321e32236b49`다. 제품 153 tests·3,068 assertions·실패 0, 앱/tools typecheck·lint·Bun build·diff 검사 통과가 보고됐다. 검사한 300자 control/emoji 등의 경계 입력에서 전체 요청 body 최대는 **7,768/8,192 bytes**였으며 모든 가능한 입력의 전역 최대값으로 주장하지 않는다.

실제 단발 호출 48개·정상 응답 48개, 원 HTTP 48개·journal 97 events·결과 48개의 연결, 원 Chat `rawOutput` 보존 48개·공통 decoder `displayOutput` 일치 48개를 확인했다. 발성 JSON 24개와 말 중심 plain text 24개, 요청/반환 Haiku·Anthropic·`stop`/native `end_turn` 각각 48개다. runner exit 0·finish `complete`, retry·unknown·추가 모델 호출·공개 API/Blob 작업은 0이다. 안전 export SHA는 `9002a5e27f488c45d2b3a21f8575075689eb79d7ecda68f5a03cb392481e9051`이다.

Chat 보고 비용은 **$0.0123316**, prompt **110,526**·completion **2,558**·total **113,084 tokens**다. reasoning 0·completion 최대 239 tokens이며 이 48개 실제 요청의 body 최대는 6,233 bytes다. 최종 실행 근거 `actual48-v10-final-evidence.json` SHA는 `9162e43a72dec909a747c30b6b57eb73d3a6e35fb0562ffce2fdd3e73de1bbd4`다. native 감사 48개는 HTTP 404 pending이므로 계정 전체 지출·최종 청구 확인과 구분한다.

표시 대사 48개를 모두 읽은 최종 독립 AI 판정은 **전체 pass 16·weak 30·major 2**, 별도 의미 축은 **26/20/2**다. 기존 32개 회귀는 13/18/1, 신규 16개는 3/12/1, 발성 24개는 8/16/0, 말 중심 24개는 8/14/2다. 시사의 소유자 전환과 모몽가의 여전히 유효한 선행조건 누락 때문에 **v10 공개 배포는 HOLD**다. `quality-actual48-review.json` SHA는 `94cb01b2e64de7e6fbe5124ccab3dd2fff71711b65cac607273e26575078e61b`, 서면 보고서 SHA는 `45e4a4a4c4eeb70eb54580f433f7e5e9e966f782235987ec61f647043f529db6`다.

같은 기존 32개의 표시 대사 길이는 v9 총 558→v10 총 1,072 code points(+92.11%)다. 그 안의 원 긴 입력 16개도 204→221(+8.33%)이며 발성 8개 49→37, 말 중심 8개 155→184로 나뉜다. 전반적으로 짧아졌다고 주장하거나 옛 점수와 일반화된 개선율을 계산하지 않는다. 사람 청취/채점·원작 정확 일치 확인은 0이고 형식 통과는 의미·감정 pass가 아니다. 당시에는 공개 v8·BotID·사용 제한을 유지했다.

후속 v11의 동결 source·56개 준비는 위 별도 절로 구분한다. v10의 원 응답·판정·비용과 길이 증가를 후속 결과로 덮어쓰지 않는다.

## v9의 현재 의도 압축과 32개 계획

당시 v9은 긴 문장에 나온 감정을 순서대로 모두 재연하지 않고 **지금 말하려는 핵심 의도·감정**을 먼저 고른다. 과거의 걱정이 해소된 입력에서 걱정 소리를 다시 붙이지 않는다. 현재 기쁘면서도 불안한 경우처럼 두 감정이 동시에 남아 있을 때만 두 박자를 허용한다. 발성형은 보통 1–2개·최대 3개이며, 말 중심 캐릭터에도 짧은 감탄·말 조각을 허용한다. 이 수치와 압축 방식은 D 제품 정책이다.

치이카와의 명백한 현재 거절 입력에만 짧은 `아니`를 한 번 허용하는 예외를 검수한다. [새 팬 자막 관찰](korean-dub-research.md#v9의-추가-자막-관찰과-압축-정책)은 짧은 부정 반응을 뒷받침하지만 제안 거절과 사실 부정 중 어느 뜻인지는 확정하지 못했다. 따라서 예외를 사실 부정·부정어가 든 모든 문장·다른 뜻단어·단어 조각으로 확대하지 않는다. 우사기의 변신 장면 발성도 평상시 기본 어휘에 추가하지 않는다.

수집한 새 32개는 **v8의 긴 감정 입력 16개를 재사용한 paired 비교 + 독립 신규 16개**다. paired 기준 출력은 기존 v8 원본으로 보존하고 새 실행 결과와 구분한다. 신규 16개는 8명당 2개·각 217–248 Unicode code points다. 제품 source 동결 뒤 저자가 v9 스타일 본문을 보지 않고 작성했고 제품 구현자에게도 공개하지 않은 입력으로 별도 동결했다. 신규 16개의 독립 첫 검수와 전체 32개의 paired 포함 범위를 구분하며, 사람의 맹검 평가라고 표시하지 않는다. fixture의 원문을 예시·문서에 옮기거나 결과를 본 뒤 같은 입력을 교정하지 않는다.

- 현재 감정·발화행위·거절/반환 방향 보존, 지나간 감정의 불필요한 재연, 새 행동·약속·요구 추가를 따로 판정한다.
- 발성 개수·현재 두 감정의 동시성·불필요한 장식·치이카와 예외의 범위를 검사한다. 짧아졌다는 사실만으로 의미 보존이나 원작 일치를 통과시키지 않는다.
- Haiku·서버 provider·요청 제한을 유지하고 최종 style·fixture·검수 기준·payload·예산을 실행 전에 고정한다. 실제 실행은 사이트 API·Blob quota를 거치지 않는다.

동결 style SHA는 `1617115a7855e8e7cf14af652d075c65963cb1bf0643798c9ab8d2b50b1c9428`다. 신규 16개 snapshot SHA는 `812c49b8efe5243e2a1d56cdd54be6bb1227b1eeea06e0a3ee401162ad0a7e58`, 평가 32개 snapshot SHA는 `d4206d5ff01f4061c1b28f60eddbe5c226c55b4bb0845539c47c994ff2b5c028`다. 최종 source의 기술 검증은 제품 **130 tests·2,018 assertions·실패 0**, 앱/tools typecheck·lint·Bun build exit 0으로 보고됐다. 이는 새 모델 출력의 품질 검수가 아니다.

Haiku 요청 **32개를 한 번씩 호출해 정상 응답 32개**를 수집했다. 원 HTTP 32개·journal 65 events·결과 32개의 연결, runner exit 0·finish `complete`, retry·unknown 0을 최종 실행 근거로 확인했다. 안전한 검수 export에서도 8명당 4개·paired 16개/신규 16개, 요청/반환 Haiku·Anthropic·`stop` 각각 32개, reasoning 0을 확인했다. 이 export `actual32-v9-quality-export.json`의 SHA는 `6723077a4df9a193fac6b1c98874fc2ba79267f9b556d45837b96cdb9b3bf03b`다.

Chat 보고 비용은 **$0.0073214**, prompt **69,754**·completion **692**·total **70,446 tokens**다. completion 최대는 66 tokens다. 최종 실행 근거 `actual32-v9-final-evidence.json` SHA는 `2d1bafb781ca66c4898c7cb988169fd31f6c578eace9873a5f56e89a152fb617`다. native 독립 감사는 32개 모두 HTTP 404 pending·최종 비용 검증 0개이므로 이 Chat 비용을 계정 전체 지출이나 최종 청구 확정으로 확대하지 않는다.

독립 AI의 32개 최종 판정은 **pass 17·weak 11·major 4**다. 기존 긴 입력 16개는 13/3/0, 당시 신규 16개는 4/8/4이며 발성 스타일 불확실성은 9개다. 소유 방향의 전환·미확인 조건의 확정 사실화·발성형의 뜻문장 잔존과 거절 방향 유실로 **v9 배포를 보류**한다. 판정 원본 `quality-actual32-review.json` SHA는 `34232ff5e7e524fcccb8da22b0cafb7b52ef59bd72d41c027474aceb939a81f7`다. paired 16개의 길이는 총 288→204 code points로 줄었지만 옛 v8 점수와 품질 개선율을 계산하지 않는다. `qualityValidated: false`·사람 청취/채점 0을 유지하며 수집 성공을 최종 개선판의 품질 통과로 표시하지 않는다. 당시 공개 baseline은 v8이었고 BotID·사용 제한과 원 208개 HOLD도 유지했다.

## v7의 고정 32개와 압축 기준

8캐릭터 각각에 같은 합성 입력 4개를 사용한다. 긴 안도·기쁨, 긴 속상함·휴식 의사, 구체적인 우산 반환 요청, 중립적인 상자 이동 사실이다. 긴 감정 입력도 한마디·감탄·호흡으로 끝낼 수 있다. 직접 작성 예시·원작 대사와 exact 중복이 없는 입력, style version·source·fixture·요청 payload SHA를 실행 전에 고정한다. Haiku를 유지해 모델 변경과 프롬프트 변경을 섞지 않는다. 첫 v7 32개는 실제 실행·검수했고 v8은 그 오류를 보정한 뒤 같은 입력으로 재검수한다.

- 핵심 감정·주요 의도와 화자·소유·반환 방향을 보되, 배경·이유·중복·세부 시점 생략을 단어별 누락 오류로 세지 않는다.
- 말할 수 있는 캐릭터도 짧은 말 조각·감탄을 쓸 수 있다. 구체 요청에서는 핵심 대상·행위·방향을 남기고 발성형에는 명사·날짜의 발음을 강요하지 않는다.
- 감정·거절의 반전, 새 구체 사건·행동·약속·요구, 소유/반환 반전, 문자 손상, 지문·해설·변환 대신 답변은 별도로 검사한다. 문맥에 맞는 수사적 허세와 감탄을 새 사건으로 자동 판정하지 않는다.
- 고정 job당 최대 한 번 호출하고 불확실한 응답·저널 누락이 있으면 중단한다. 32개 보수 예약액은 **$0.0565248**이며 실제 Chat usage 비용과 별도로 기록한다. 입력 300자·프롬프트 8 KiB·출력 256 tokens·timeout 30초·reasoning off·retry 0을 유지한다.

첫 v7은 32개 정상 결과·retry/unknown 0·Chat 비용 $0.0057758이었다. 비맹검 AI 판정은 pass 23·weak 7·major 2이며 하치와레의 반환 요구→수락 약속, 중립 진술→확인 질문을 수정 대상으로 삼았다. 발성형의 뜻단어·단어 조각 잔존도 별도로 보정했다. 원 응답·판정·비용은 그대로 보존한다.

v8은 32개 정상 결과·retry/unknown 0·Chat 비용 $0.0064297이었다. 비맹검 AI 판정은 pass 29·weak 3·major 0으로, 첫 v7의 하치와레 두 발화행위 오류·발성형 뜻단어/음절 조각·발성 개수 초과는 재발하지 않았다. 남은 weak는 치이카와의 제한 발성 재료 변형 2건과 쿠리만쥬의 음표 장식 1건이다. 첫 v7과 합친 보고 비용은 $0.0122055이며 두 run 각각의 native 감사 32개는 pending이다. 결과를 보고 고친 같은 표본의 재검수이므로 독립 holdout이 아니다. 사람 채점·8명 공식 한국어 자막 검증·공개 배포 확인을 대신하지 않는다. v5의 옛 점수도 보존하고 새 기준과 같은 조건의 개선율로 비교하지 않는다. [새 자막 근거](korean-dub-research.md#2026-10-18-한국어-자막-추가-조사)와 [보정·결과](evaluation-v3.md#v8의-발화행위와-발성-보정)를 함께 읽는다.

모델·가격 상한은 서버 registry에서 선택한다. 입력·프롬프트·생성 설정·제공자 조건을 동결하고 같은 입력을 후보별 한 번씩 보낸다. reasoning·tools·plugins·fallback·자동 재시도를 사용하지 않는다. 응답·저장 결과·Chat reasoning·가격 조건이 불명확하면 다음 유료 요청을 멈추고 원본을 보존한다. 같은 run·모델·case 또는 같은 미디어 분석 요청을 새로운 ID로 바꿔 재전송하지 않는다. 별도 버전 비교는 새 source와 승인 범위로 구분한다.

## 한국어 근거와 이전 블라인드 검수

[공식 자료 목록](korean-dub-research.md)의 출처·전체 길이 확인과 실제 발화는 구분한다. 공식 영상 AI 후보도 사람 청취·정확 전사·canonical 대사의 검증이 아니다. 비언어 소리를 한국어 뜻단어로 세지 않고 내레이터·노래·다른 화자의 말을 대상 캐릭터에게 배정하지 않는다. source가 부족한 캐릭터는 기존 제품 해석과 공백을 명시한다.

아래는 완료한 v4 source의 4모델·128개 비교 절차다. 새 v7의 32개 비맹검 검수와 구분한다.

1. 최종 prompt·64개 직접 작성 예시·32개 case·provider 설정·근거 rubric과 source SHA를 동결한다.
2. 모델 매핑·가격을 분리하고 익명 표본 ID·캐릭터·입력·출력만 검수자에게 준다.
3. 의미 major, 제품 정책 major, 불확실성, 근거별 스타일 네 축과 제품의 재구성·자연스러움을 따로 기록한다. 명백한 화자·소유·반환 방향·거절/부정·감정 전환과 새 사실을 우선 확인한다.
4. 128행의 판정·근거·SHA를 모델 공개 전에 고정한다. 오류·미확인 출력을 임의 문장으로 채우지 않는다.
5. 매핑 공개 후 같은 범위의 실제 출력·실측 비용과 함께 후보를 비교한다. 판정 수정이 필요하면 이전 판정과 이유를 보존한다.

v9에서는 서면 자연스러움이 캐릭터 발화 방식에 맞는지도 포함한다는 기존 축의 범위를 명확히 하고, 익명 상태의 18행을 재검토했다. 후루혼야 7행의 자연스러움만 2→1로 정정했으며 원문·의미·정책·core·rubric·v1 판정은 보존했다. 수정된 v2 판정을 다시 동결한 뒤 집계했고 선정 후보는 유지됐다. [동결 판정과 모델별 집계](evaluation-v3.md#재표현-v9의-실제-128개-비교)에 변경 범위·비용을 기록한다.

새 순위는 의미 major 최소 → 제품 정책 major 최소 → 출처 범위의 스타일 충돌 최소 → 재구성·자연스러움 점수 최대 순이며 같은 순위에서만 동일 범위의 실측 비용을 사용한다. 정확 집계식은 [재표현 기준](evaluation-v3.md#재표현-v4의-새-검수-기준)에 고정했다. 일반 어미·원문 동일만으로 의미 major를 세지 않고, 의미를 지키는 독백·수사 질문·강조·어순 변경을 허용한다. 원문 동일·어미 교체는 재구성 축의 부족이다. 발성형의 단어 정보 감소와 모호한 요청·거절은 불확실성으로 남긴다. 입력/출력만 있는 packet에서 실제 256 completion token 준수 여부를 추정하지 않는다. 순위가 높다는 이유로 정확 더빙 품질 통과를 선언하지 않는다.

모든 예시는 새로 쓴 합성 문장이다. 공식 대사의 전문을 정답 fixture로 복제하지 않는다. 이전 [core evidence·rubric v2](evaluation-v3.md#최종-제품-source와-근거-동결), 초기 rubric v1과 실제 strict 128개 판정은 불변이다. 새 재표현 source의 core evidence·rubric v3는 이를 덮어쓰지 않는 별도 파일이다. 기준을 바꿀 때는 새 버전·이유와 기존 판정을 보존하며 accepted를 새 표현 품질 통과로 자동 변환하지 않는다.

## 비용·오류·검수 상태 기록

매 응답 뒤 원본을 저장하며 실제 응답에 있는 usage·cost·reasoning·finish reason만 기록한다. 누락값은 null로 유지한다. timeout·오류를 자동 retry하지 않고 불명확한 비용은 보수적 예약액과 별도로 남긴다. 실제 Chat 합, 독립 감사 비용, 미확인 시도의 보수적 상한, 계정 전체 사용량을 구분한다.

Generation 감사의 404·429·5xx·timeout은 `auditStatus: pending`으로 기록한다. 검증된 Chat 출력·명시적 reasoning 0과 pending 감사는 함께 보존할 수 있지만, pending을 native reasoning·제공자·최종 비용의 통과로 바꾸지 않는다. 확인된 native model·reasoning·cost 위반은 중단 조건이다. [공식 usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting)을 기준으로 해석한다.

agent 검수는 `assessmentType: agent-assessed`로 표시하고 `qualityValidated: false`, `humanScores: null`을 유지한다. 사람이 실제로 읽거나 들은 결과가 없는 항목을 사람 점수로 채우지 않는다. 공개 Production 변환 성공은 기능 관찰이며 공식 한국어 더빙 일치 검증을 대신하지 않는다.

## 사람 평가 템플릿

추후 사람이 source와 출력을 대조할 때 0(실패)~2(만족)을 기록한다. 문장형은 의미 보존을 평가하고, 발성형의 세부 정보 감소를 문장형과 같은 누락률로 벌점 주지 않는다. 감정·긍부정이 불명확하면 이유를 남긴다. source·화자·시각이 미확정인 fidelity 항목은 미평가로 둔다.

| caseId | fidelity | emotionPolarity | semanticPreservation | naturalKorean | noInventedFacts | noPromptLeak | notes |
|---|---|---|---|---|---|---|---|
| 실제 case ID | 0~2 또는 미평가 | 0~2 또는 미평가 | 0~2 또는 N/A | 0~2 또는 미평가 | 0~2 | 0~2 | source·화자·구간·판정 이유 |

아래는 이전 prompt의 초기 평가 중단·복구 기록이다. 당시의 성공 0·미실행·halted 상태를 최종 v2나 현재 v3 집계로 해석하지 않는다. 원본 이력은 그대로 보존한다.

## 이전 프롬프트의 중단·복구 이력

아래는 v2 동결 이전의 2회 유료 요청에 대한 이력이다. 이 절의 당시 현재 상태·성공 0건·미실행 기록은 최신 v2 수집 수와 구분한다. 최신 결과는 문서 맨 위 v2 보고서에 있다.

당시 상태: dry-run fixture validation 통과. 첫 보호 런타임 read-only key 조회는 $5+Monthly 조합 불일치로 차단했고 당시 유료 호출은 0회였다. 어느 설정 항목이 달랐는지는 단정하지 않는다. 사용자 수정 후 새 Production GET에서 해당 조합과 `allowed=true`를 확인했다.

첫 Qwen 파일럿 index 0은 유료 호출 1회 후 임시 검증 route가 502를 반환해 당시 성공 결과 0개·후속 호출 0회로 중단했다. 원 chat 출력·usage가 보관되지 않아 회수할 수 없으며 말투 채점도 0개다. 독립 read-only generation GET 200에서는 native reasoning의 실제 숫자 0, 비용 $0.00003312, provider Darkbloom, native input/output 401/8, finish stop을 확인했다. 이는 원 chat usage를 복구한 것이 아니다. 공식 catalog는 requested alias `qwen/qwen3.5-9b`를 canonical `qwen/qwen3.5-9b-20260310`과 연결한다. 임시 검증의 model 동일성 검사가 이 canonical을 거절하는 결함은 확인했지만 첫 실패의 정확한 throw 조건은 확정하지 못했다.

임시 검증의 canonical 허용·선택적 chat usage를 unknown으로 보존·native 독립 감사 처리와 앱의 정상 빈 `tool_calls: []` 허용을 수정했다. 앱 기본 tests 34 pass·93 assertions 및 앱/tools typecheck·lint·build, Architect provider 회귀 6 pass·22 assertions가 통과했고 원본 Git 기술 candidate 배포는 APPROVED다. 별도 v2 tests 35개·130 assertions와 build/typecheck/lint도 통과했다. 첫 index 0 실패는 manual ACK를 완료해 failed-reviewed 상태로 바뀌었으며 실패 원장·중복 차단과 `evaluation-output/pilot-2026-10-10.json`을 보존한다. ACK는 모델을 호출하지 않았다.

그 뒤 index 2의 Qwen 유료 요청에서 Chat 출력 `와아…! 응…!`, reasoning own number 0·cost $0.00003288을 확보했지만 Generation HTTP/body/boundedJSON 감사 단계에서 실패해 즉시 halted가 됐다. 실패 당시 HTTP status는 기록되지 않아 404나 eventual consistency로 단정할 수 없다. 후속 readonly Generation GET은 200이며 native reasoning own number 0·native prompt/completion 398/8·cost $0.00003288을 확인했다. 해당 행은 `evaluation-output/pilot-2026-10-11.json`에 error로 보존한다.

Benchmark 유료 POST는 2회, 기술적 평가 성공은 0건, 확인한 Benchmark 실비는 $0.000066이다. 두 번째 실패 이후 추가 평가 호출과 추가 ACK는 각각 0회이고 평가 halted를 유지한다. 이 수치는 사용자의 Production 변환이나 계정 전체 사용량을 포함하지 않는다. 신규 16건 파일럿과 전체 240입력×2모델 비교는 완료되지 않았다. 원본 앱은 Generation 감사 GET에 의존하지 않으므로 임시 평가기 실패가 기술 candidate 배포를 막지는 않는다. 추가 실행 계획을 완료 실적으로 계산하거나 error 행을 성공으로 바꾸지 않는다.

현재 확보한 출력은 두 번째 실패 행의 한 개뿐이며 16건 완료 파일이 아니다. 파일럿을 완성하고 완료 확인을 받은 뒤 입력·출력·캐릭터 근거를 대조하는 검수 절차는 유지한다. 여섯 metric과 중대 부정/감정 반전·사실 추가·prompt leak의 근거는 별도 `agent-assessed` 보고서에 기록하고 `humanScores: null`은 유지한다. 캐릭터당 입력 한 개×모델 두 개의 소량 표본으로 캐릭터당 30개 전체 품질을 결론 내리지 않는다. 첫 실패는 출력 누락으로 미평가, 두 번째는 감사 실패로 기록하며 현재 점수나 품질 통과 결론은 작성하지 않았다.

이전 prompt용 private v3는 deadline 수정 후 Architect 승인과 57 tests·1,009 assertions/build exit 0을 확인했다. 미배포·두 번째 ACK 미실행·추가 유료 0이며 새 v2 평가는 이 임시 배포 경로를 사용하지 않는다.

v3의 표본 복구 설계는 기존 index 2 error를 불변으로 두고 보존 Chat과 같은 generation의 독립 감사에 별도 `auditVerified`/`qualityEligible` 근거를 연결하는 것이다. 이는 원 error를 성공으로 바꾸는 것이 아니다. 출력 유실 case 01의 pair와 미호출 Gemini index 1을 평가 표본에서 제외하고 immutable case 31 pair(indices 480/481)를 추가하는 권고다. 계획상 유료 상한은 481회, usable 표본은 480개=240 pairs다. 새 파일럿 16회는 indices 4/5와 다른 7캐릭터 첫 pair이며 그 뒤 잔여 463회에는 index 3이 포함된다. 원본 CLI의 480회 제한과 별도 v3 계획을 구분하며 아직 실행 완료나 품질 eligible 확정으로 기록하지 않는다.

운영 Blob 잔여량은 별도 서비스 운영 정보다. CLI billing/metric으로 확인하지 못해 [팀 Observability → Blob](https://vercel.com/sangjinsus-projects-7fe3f5cc/~/observability/blob)의 실제 사용량 응답을 기다리지만, Blob을 쓰지 않는 직접 모델 평가의 선행 조건은 아니다. 모델 평가에는 inference key의 실제 한도·사용 가능한 credit·모델 가격/usage 확인을 적용한다. 일반 Chrome의 Production live 변환은 사용자 직접 성공 확인이며 Benchmark 결과와 별개다.

이전 단계에서 사람 채점·한국어 음성 대조는 미실행이었다. AniBox 공식 업로드 245·166화의 YouTube script UI 후보는 화자/작성·검수 주체가 불명확하고 호칭 오탈자가 있어 당시 exact 한국어 규칙의 확정 근거로 쓰지 않았다. 이후 완료한 v2의 AI 텍스트 검수와 Chat 비용 관찰은 [최종 v2 보고서](evaluation-v2.md)에 별도로 기록했다. 이 보고서의 AI 검수 역시 사람 청취나 공식 한국어 더빙 fidelity 검증으로 대체하지 않는다. 후속 한국어 클립 연구와 v3 결과는 각자의 출처·버전으로 기록한다. [OpenRouter 공식 API response/usage 계약](https://openrouter.ai/docs/api_reference/overview)을 기준으로 metrics 필드를 작성했다.
