# 2026-10-23 말 중심 압축 추가 검증

기록일: 2026-10-23 KST. **저장소 구현은 말 중심 네 캐릭터에 GPT-5.4 mini(H), 발성 네 캐릭터에 Haiku를 사용하며 제품 통합·최종 기술 검사·Architect 소스 승인을 완료했다.** H는 같은 12입력의 원·독립 의미 판정 모두 major 0이지만 전체 weak 8개가 남는다. 정확한 애니메이션 말투 재현·사람 청취 통과를 뜻하지 않는다. 변경 전 공개 baseline은 `main` c052·v8·Haiku였다. Git push·실제 새 배포·canary는 별도 릴리스 증거로 확인한다. 이번 네 단계의 실제 모델 호출은 **24+16+24+24=88회**, 관측 Chat 합은 **$0.0269819**이며 최종 청구 독립 확인은 아니다. 각 단계의 원 판정·HOLD·source snapshot을 보존한다.

## 목적과 비교 범위

일본 애니메이션의 한국어 번역 자막을 참고해 대사를 짧게 압축하되 핵심 뜻·화자·소유·유효한 조건을 보존하는지를 확인한다. 배경·지나간 감정·중복 설명의 생략과, 부탁을 수락 약속으로 바꾸거나 선행조건을 없애는 오류를 구분한다. 팬 자막에서 관찰한 표현과 새로 작성한 D 제품 정책도 구분한다.

하치와레·모몽가·랏코·시사의 말 중심 네 캐릭터에 합성 입력 8개를 사용했다. 기존 실패 4개와 신규 targeted 4개에 후보 3개를 한 번씩 적용한 **8×3=24개**다. 치이카와·우사기·쿠리만쥬·후루혼야의 발성 출력은 이번 범위에 없다. 기존 실패를 겨냥한 합성 검증이며 일반 사용자 분포·사람의 맹검 평가로 확대하지 않는다.

| 후보 | 공통 규칙과 모델 | 비교 목적 |
|---|---|---|
| A | 동결 v11·Claude Haiku 5.5 | 기존 후보의 기준 응답 |
| B | 짧게 바꾼 공통 prefix·Claude Haiku 5.5 | A와의 비교로 공통 prefix 변경 검토 |
| C | B와 같은 prefix·Gemini 3.1 Flash Lite | B와 같은 입력·규칙에서 모델 비교 |

A와 C는 prefix와 모델이 함께 다르므로 그 차이를 모델만의 효과로 해석하지 않는다. 모든 후보가 동일 입력에 응답했다는 사실은 독립 반복실험이나 원작 재현 정확도를 뜻하지 않는다.

## 첫 A/B/C 24개의 실행과 판정

아래 실행 metadata는 실행 담당의 무결성 확인 보고를 기록한 것이다. 품질 결과는 매핑 공개 전에 동결된 원 판정과 공개 후 집계에서 인용한다. 이 문서 작성자가 raw 응답을 독립 검증하거나 새로 채점한 결과가 아니다.

| 항목 | 확정된 실행 기록 | 해석 범위 |
|---|---|---|
| 실제 HTTP 응답 | 24개 | 고정 범위 실행 완료 |
| 종료·reasoning | `stop` 24개·명시적 reasoning 0 | Chat에 기록된 실행 속성 |
| provider·model·hash 연결 | 24개 확인 통과 | 출력 언어 품질 판정과 별도 |
| retry·응답 미확인 | 0·0 | 재호출이나 가상 출력으로 보충하지 않음 |
| Chat 보고 비용 합 | **$0.00508045** | 계정 전체 지출·native 최종 청구 확정 아님 |
| 공개 API·Blob 작업 | 0·0 | 이번 직접 모델 검증의 범위 |
| 첫 언어 품질 판정 | 24개 동결·전체 3 pass/9 weak/12 major | 매핑 공개 뒤 후보별 집계 확인 |
| 추가 검수 | 독립된 두 번째 의미 검수 완료·22/24 의미 등급 일치 | 원 판정 불변·모든 후보 HOLD |
| few-shot 감사 | 선택기 빈틈 확인·LLM 오류의 단독 원인 미확정 | 후속 repair16은 아래 별도 실행 범위로 기록 |
| 승자·이번 결과의 공개 배포 | 선정 없음·없음 | 세 후보 모두 중대 오류 잔존 |

무결성 근거는 `evaluation-output/chiitalk-eval-recovery-2026-10-23/remote-v2/proof/completed24-integrity.json`, SHA-256은 `24b89d630b039064d8da3daf2705aa34211d750206e81f66f9ee1a6407c69ebc`다. 이 Chat metadata 확인을 native 독립 청구 감사 통과로 바꾸지 않는다.

## 첫 판정 동결 뒤 공개한 동일 입력 비교

24개 원 판정 전체를 동결한 뒤 매핑을 공개했다. 다음은 후보마다 같은 8개 입력에 대한 원 판정 집계다. 전체 판정과 의미 축을 구분하며, 길이는 표시 대사의 Unicode code points다. 엄격한 이중 맹검·사람의 평가는 아니다.

| 후보 | 전체 pass/weak/major | 의미 축 pass/weak/major | 평균 길이 | Chat 보고 비용 |
|---|---:|---:|---:|---:|
| A · v11 Haiku | 1/2/5 | 2/1/5 | 50.25 | $0.0017617 |
| B · 짧은 공통 prefix Haiku | 1/4/3 | 5/0/3 | 84.625 | $0.0014845 |
| C · B와 같은 prefix Gemini 3.1 Flash Lite | 1/3/4 | 4/0/4 | 57 | $0.00183425 |
| 합계 24개 | 3/9/12 | 11/1/12 | 63.9583 | **$0.00508045** |

| 후보 | 기존 실패 4개 pass/weak/major | 신규 targeted 4개 pass/weak/major |
|---|---:|---:|
| A | 0/1/3 | 1/1/2 |
| B | 0/1/3 | 1/3/0 |
| C | 1/1/2 | 0/2/2 |

B는 이 작은 고정 표본에서 중대 오류가 가장 적었고 Chat 비용도 가장 낮았지만 평균 출력은 가장 길었다. 여전히 major 3개와 표현 weak가 남아 품질 통과·승자로 지정하지 않는다. 길거나 짧은 사실로 의미 오류를 상쇄하지 않으며 다른 입력 분포의 일반 개선율을 계산하지 않는다. v11의 56개 또는 그 안의 말 중심 32개와 이번 8개를 단순 비교해 악화·개선율로 표시하지 않는다.

## 남은 의미 관계 오류

원 판정에서 다음 문제가 나타났다. 아래 설명은 동결된 판정 사유를 요약하며 새 재채점이 아니다.

- **화자와 발화행위 전환:** 자기 성취를 말해야 하는 화자가 상대 성취에 반응하거나, 자기 휴식 의도가 상대를 위로하는 말로 바뀌었다. 랏코의 장비 허락 질문은 A/B에서 상대의 말을 풀이하는 응답으로 바뀌었다.
- **소유와 허락 반전:** A/B 시사에서 상대의 참고서를 화자 소유로 바꿨다. C 랏코에서는 상대의 장비를 자기 장비로 바꾸고, 허락을 구하는 질문을 사용 승인으로 바꿨다.
- **유효한 선행조건 소실:** A/C 모몽가에서 상대가 오늘 연습실에 가는 경우에만 반환을 부탁한다는 조건이 사라졌다. 소유·반환 장소를 남겼어도 무조건 반환 요구로 효력이 넓어졌다.
- **미확인 질문에 새 답 생성:** 모임 시작 시간을 묻는 입력이 A에서는 직접 확인하겠다는 결심, C에서는 안내판이 맞을 것이라는 근거 없는 답과 재확인 지시로 바뀌었다.

여러 핵심 명사를 남긴 것만으로 화자·소유·조건의 관계를 보존한 것으로 평가하지 않는다. 후속 few-shot 감사에서 선택기의 빈틈을 확인했지만 특정 예시가 실제 LLM 오류의 단독 원인이라고 확정하지 않는다.

C의 `google/gemini-3.1-flash-lite`·`google-vertex/global`에서는 `reasoning.effort=none`을 사용한 이번 8개 요청의 실제 수락과 명시적 reasoning 0을 관측했다. 이를 전체 입력의 지원 보장이나 발성형 native JSON schema 지원 증거로 확대하지 않는다. 이번 범위는 말 중심 plain text 출력이다.

| 동결·공개 후 근거 | SHA-256 |
|---|---|
| `evaluation-output/chiitalk-eval-quality-2026-10-23/quality-grades-actual24.json` — 원 판정 | `d5bc3175a372d5dd085e755985a53b6f8975e0df2ca4d189c1f0490c18b6bcdd` |
| 매핑 공개 파일 — 24개 판정 동결 뒤 공개 | `c38a10fa9262b2530d063ebd856f9b43d85b39d75d773e307cc5425c57357b32` |
| `evaluation-output/chiitalk-eval-recovery-2026-10-23/remote-v2/post-reveal-summary.json` — 공개 후 집계 | `e2607a663b2355c1c83730bfdb56359c311a6d59e62e6cb9a83f35c850ae87f2` |

### 두 번째 독립 의미 검수

두 번째 검수자는 원 grade·매핑을 읽기 전에 동일한 출력 24개의 의미 판정을 먼저 동결했다. 첫 판정의 **의미 축과 22/24개가 정확히 일치**했다. 전체 등급·캐릭터 표현 등급에 대한 일치율이 아니며 사람 검수 결과도 아니다.

| 후보 | 두 번째 의미 축 pass/weak/major | 판단 |
|---|---:|---|
| A | 2/2/4 | HOLD |
| B | 5/0/3 | HOLD |
| C | 3/1/4 | HOLD |

불일치 두 건은 합의 등급으로 덮어쓰지 않고 각각 보존한다. A의 `sample-004`는 원 의미 major·독립 의미 weak로, 도입의 응답자 전환을 뒤 허락 질문이 얼마나 복원하는지에 대한 심각도 경계다. C의 `sample-013`은 원 의미 pass·독립 의미 weak로, 대여 조건 반전이 아니라 상대 우선 사용에 대한 양보 태도가 약해졌는지의 경계다. 원 grade 변경은 0이다.

이 재검수는 이미 생성한 24개 출력을 다시 읽은 것이다. **첫 A/B/C 비교의 실제 모델 호출은 24회이며, 두 번째 검수로 24회를 더 호출한 것이 아니다.** 뒤의 별도 repair16 실행과 구분한다.

### few-shot 감사와 다음 준비 단계

감사에서는 말 중심 기본 예시 **32쌍 자체의 관계 반전을 0개**로 보고했다. 다만 실제 입력에 맞는 예시를 고르는 선택기에 다음 빈틈을 확인했다.

- 정보 질문·간접 허락 질문·완곡한 부탁이 사실 진술 예시로 fallback되는 경우.
- 조건부 대여 질문에서 조건 없는 대여 분기가 먼저 선택되어 조건 시연을 빠뜨리는 경우.
- 재도전 의사가 없는 속상함·휴식 입력에 재도전 예시를 고르거나, 성취만 있는 입력에 칭찬 요구를 시연하는 경우.
- 상대에게 하지 말라는 금지 요청과 화자가 하지 않겠다는 자기 거절을 같은 의도로 고르는 경우.

이는 선택한 시연과 현재 발화행위의 불일치다. 개별 예시가 잘못된 관계를 가르쳤거나 선택기 빈틈이 실제 major를 필연적으로 만들었다는 결론은 아니다. 사실 진술 fallback에서도 major가 없었던 부탁 사례가 있어 단독 원인으로 확정하지 않는다.

이 빈틈을 최소 보정한 격리 후보와 16개 검증 source를 준비했다. 입력 8개는 기존 회귀 4개·새 targeted 4개로 후보 코드 작성 전에 동결했다. 당시 준비·추가 모델 0 상태와 이후 별도 심사 후 실행한 아래 repair16을 구분한다. 준비나 실행 완료를 언어 품질 통과로 세지 않는다.

| 별도 후속 근거 | SHA-256 |
|---|---|
| `evaluation-output/chiitalk-relation-adjudication-2026-10-23/comparison.json` — 의미 판정 대조 | `523fd2b808604c364d326824537511dac5e8b5d9aa71a920f7cc7eaa46374dfb` |
| `evaluation-output/chiitalk-relation-adjudication-2026-10-23/post-reveal.json` — 독립 판정의 매핑 후 집계 | `9c93e32aa16987d7324abe23e0b88e8585a2f020381b195a40d9159a593cce84` |
| `evaluation-output/chiitalk-fewshot-audit-2026-10-23/report.json` — 예시·선택기 감사 | `19a91a0b13ac73d3ee0e911a25b6fb0f18b4045624257521675b8e04a53b4812` |

## 후속 repair16의 실행·동결 판정

별도 source·예산·실행 심사를 통과한 run `chiitalk-spoken-repair16-remote-runtime-2026-10-23-r1`에서 **고정 8입력×2후보=16개**를 완료했다. 기술 감사 후 익명 판정 16/16개를 동결한 뒤 매핑을 공개했다. 다음 집계는 인계된 확정 통계이며 문서 작성자는 새 입력 본문·expected relations·실제 출력·raw·매핑을 열지 않았다.

| repair16 항목 | 해당 실행 시점의 보고 상태 |
|---|---|
| runner 종료 | exit 0 |
| 시도 / 완료 | 16 / 16 |
| 중단 | `halted: false` |
| 관측되지 않은 과금 가능성 | `possibleUnobservedCharge: false`라는 실행 보고; 최종 청구 독립 확인 아님 |
| 기술 감사 / 익명 AI 채점 | 별도 Architect 근거 기록 / 16개 동결 뒤 매핑 공개 |
| 언어 품질·후보 선정 | D/E 모두 major 잔존·HOLD·승자 선정 없음 |
| 이 실행 뒤 추가 모델 호출 | 0 |
| 제품 적용 / 새 말투 공개 배포 | 0 / 0 |

| repair16 후보·각 8개 | 전체 pass/weak/major | 의미 축 pass/weak/major | 평균 code points | 관측 Chat 비용 |
|---|---:|---:|---:|---:|
| D · Haiku 5.5 | 4/3/1 | 7/0/1 | 80.375 | $0.0015177 |
| E · Gemini 3.1 Flash Lite | 5/2/1 | 7/0/1 | 60.5 | $0.00193225 |
| 합계 16개 | 9/5/2 | 14/0/2 | 70.4375 | **$0.00344995** |

기존 회귀 4개는 D/E 모두 의미 pass 4개였고, 신규 targeted 4개는 각각 의미 pass 3개·major 1개였다. 두 후보 모두 `hachiware-repair-new-self-excitement`에서 화자의 자기 성취·신남을 청자의 반응 또는 전언으로 바꿨다. 다른 회귀가 통과했거나 평균 출력이 짧다는 사실로 이 화자 전환을 상쇄하지 않는다. **D/E 모두 HOLD이며 승자·배포 후보를 선정하지 않았다.**

독립 의미 재검수는 D **6/1/1**, E **7/0/1**로 원 의미 판정과 **15/16개 일치**했고 major 2개는 모두 일치했다. 한 건의 차이는 보관자 역할의 생략을 허용할지에 관한 pass/weak 경계이며 별도 판정으로 보존한다. 원 grade 변경은 0이다. 재검수는 동일 출력의 서면 AI 평가로 추가 모델 생성 16회가 아니다.

이 시점까지 첫 A/B/C 24개와 repair16의 실제 생성은 합계 **40회**, 관측 Chat 비용은 **$0.00508045+$0.00344995=$0.0085304**였다. 각 단계의 표본·판정은 그대로 보존하며 두 단계의 합을 동일 조건의 품질 개선율로 계산하지 않는다. 최종 native 청구는 독립 확인하지 않았고 Blob 쓰기는 0이다. 이 단계는 source QA만 추가했고 공개 `main`의 `c052bc736555d321190cee2f7ad5198a0a032722`·v8·Haiku 기준을 유지했다. 후속 실행·제품 적용 상태는 아래 별도 기록한다.

repair16의 공개 후 집계 `evaluation-output/chiitalk-spoken-repair16-2026-10-23/remote/post-reveal-summary.json` SHA는 `05820295dd32475b74c2713f4393b7486bacac77002c2987e9c6a440f5919fd9`다. 집계 metadata에서 원 판정 SHA `d8d78985b268f7cc6bd45966d7cf813ac79917225c2b6883f5a8c6e1cc59ca53`, 매핑 SHA `0ff90e85abecb0e3136f23f9d38e1ad2dbf2c0bcd3a28cb620f93d3b196affe0`, 16개 동결 뒤 매핑 공개·재해석 없음과 후보별 통계를 확인했다. 기술 Architect 근거 SHA는 `f35cbf7540e0b84d6dfd1b78416fffdea54f85571626f80e068deec9688811a3`다. 원 판정·매핑은 별도 원본으로 유지한다.

## 후속 speaker-fix 24개 결과

입력 **12개(기존 8개+신규 4개)**를 사전 동결하고 **12입력×2후보=24개**를 실행했다. 공통 직접 화자 규칙과 부정 감정 선택을 보정하는 격리 후보였다. 감사에서는 부정된 두려움 표현도 worry 예시 선택에 걸리는 경로를 확인했지만, 이 경로가 실제 major의 단독 원인이라는 실험 증거는 없다. 당시 계획·실제 0 기록과 후속 실행을 구분한다.

| speaker-fix 후보·각 12개 | 전체 pass/weak/major | 의미 축 pass/weak/major | 평균 code points | 관측 Chat 비용 |
|---|---:|---:|---:|---:|
| F · Haiku 5.5 | 4/6/2 | 10/0/2 | 87.1667 | $0.002316 |
| G · Gemini 3.1 Flash Lite | 3/4/5 | 6/1/5 | 69.1667 | $0.00299825 |

독립 의미 검수와 원 의미 판정은 **21/24개 일치**했다. F/G 모두 중대 오류가 남아 HOLD이며, 이 단계를 개선 완료나 배포 통과로 기록하지 않는다. 관측 Chat 비용 합은 **$0.00531425**다. 원 판정·비용을 후속 모델 비교로 대체하지 않는다.

공개 후 집계 `evaluation-output/chiitalk-speaker-fix-2026-10-23/remote/post-reveal-summary.json` SHA는 `025d6f338291d500387d66198830abae13409b78cfa53b2e7d6eba1473daa477`다. 원 판정 SHA `444959eb02f47d503eea5bf2e9aa328a29a524c589103b9f055d27ef30299a8c`, 독립 의미 판정 SHA `2276dc907d90aade8ce79ae1e675256c4891de7748799bf550e5c626d5be4b7e`, 매핑 SHA `bba7739882ce3c43caec9fb7edd9ca7e62c441faa7fa026176e0489f15b0aedd`를 연결한다. 판정 동결 뒤 매핑을 공개했으며 원 grade 재해석은 없다.

## 같은 12입력의 최종 모델 비교와 선정

동일한 12입력에서 새 GPT-5.4 mini(H)와 Haiku 재현(I)을 각각 한 번씩 호출한 별도 **24개**다. I는 F의 동일 body를 그대로 재현했으며 F의 과거 실패를 소거하거나 실패 행만 선택적으로 재시도한 결과가 아니다. 판정 24개를 동결한 뒤 매핑을 공개했고 독립 의미 검수와는 **20/24개 일치**했다.

| 최종 후보·각 12개 | 전체 pass/weak/major | 의미 축 pass/weak/major | 독립 의미 pass/weak/major | 평균 code points | 관측 Chat 비용 |
|---|---:|---:|---:|---:|---:|
| H · GPT-5.4 mini | 4/8/0 | 10/2/0 | 9/3/0 | 79.5 | $0.01086825 |
| I · Haiku 5.5 재현 | 5/5/2 | 9/1/2 | 9/1/2 | 79.75 | $0.002269 |

H는 이 동일 입력 비교에서 원·독립 의미 판정 모두 major 0인 후보여서 **하치와레·모몽가·랏코·시사의 제품 적용 후보로 선정**했다. 전체 weak 8개와 독립 의미 weak 3개는 남는다. H의 표시 대사는 최소 46·평균 79.5·최대 111 code points였다. 짧거나 더 비싸다는 이유로 품질을 승인한 것이 아니며, 제한된 자체 합성·회귀 표본의 AI 판정을 일반 사용자 성능·정확한 원작 말투 재현·사람 청취 평가로 확대하지 않는다.

치이카와·우사기·쿠리만쥬·후루혼야의 발성 출력은 **Haiku 유지**로 선정했다. v11 발성 24개의 현재 payload byte 동일성 근거와 당시 전체 6 pass·18 weak·0 major는 별도 범위다. 공개 v8과 payload가 같거나 8명 전체의 발성 품질이 검증됐다는 뜻이 아니다.

H의 이번 관측 설정은 `openai/gpt-5.4-mini`·provider `openai`·canonical `20260317`·`reasoning.effort=none`이며, H의 12개에서 명시적 reasoning 0을 확인했다. 2026-10-23 선정 시점 가격 근거는 입력 **$0.75/100만 tokens**, 출력 **$4.50/100만 tokens**다. 과거 가격 snapshot을 고치지 않으며 이 관측을 모든 입력의 동작 보장이나 발성 native JSON 지원으로 확대하지 않는다.

### sampling 기록 정정

실제 원 wire에는 처음부터 `temperature`·`top_p`가 없었다. 연구 과정에 root가 확인하지 않은 0.55/0.95 가정이 섞인 부분은 별도 `actual-wire-correction.json` 근거로 정정한다. 이는 원 요청에서 sampling을 삭제하거나 profile을 변경한 실험이 아니다. 실제로 보낸 요청의 동등성을 기준으로 F/I 재현을 해석하며 이전 원본·hash를 보존한다.

### 근거·누적 비용·제품 소스 검증

| 최종 비교의 동결 근거 | SHA-256 |
|---|---|
| `evaluation-output/chiitalk-model-final24-2026-10-23/remote/post-reveal-summary.json` | `bf9d8e697043f71c34f375147b01c1daf9843b762a50b37d8f9929701ae43fa7` |
| 원 24개 판정 | `1aeee0ad7de4ddbad4370d9f52aefa03839d20f921f80398739d4aef6bdcd871` |
| 독립 의미 판정 | `6ff03b0f10fc4e96852082b8f6d703b2e32e7388b7edf473d251e8c75d97bb99` |
| 판정 동결 뒤 공개한 매핑 | `cedfc2073c29ac0b018ed6f2d9bbb77f5841a385fa6dbf4880b8a21d362835b9` |

이번 최종 24개의 관측 Chat 비용은 **$0.01313725**, 보수적 예약 상한은 **$0.1824768**이다. 최근 네 단계는 **24+16+24+24=88회**, 관측 Chat 합 **$0.0269819**이며 최종 native 청구는 미확인이다. 독립 재검수 횟수를 모델 생성 횟수에 더하지 않으며 Blob 쓰기는 0이다.

선정 전 source 28개 snapshot과 SHA를 보존한 뒤 H 통합을 적용했다. 최종 검증은 다음과 같으며 writer가 제품 검사를 새로 실행한 결과가 아니라 동결된 검사 근거와 Architect 판정을 확인한 기록이다.

| 최종 소스 검증 | 확인한 결과 |
|---|---|
| `bun run test` | 193 pass·0 fail·3,379 assertions·11 files·exit 0 |
| `bun run lint` | exit 0·warning 0 |
| `bun run typecheck` | 앱·tools 모두 exit 0 |
| `bun run build` | 최종 test script 변경을 포함한 29개 입력의 SHA 동등 격리 복사본에서 exit 0·compile/type/static generation 성공 |
| build 경고 | 복사 workspace의 다중 lockfile에 따른 Next.js root 추정 경고 1건 |
| 원 저장소 경계 | main의 next-env 보존·dependency lock 변경 0·생성물은 복사 workspace에 한정 |
| payload 동등성 | core H 12개 body bytes·native v11 24개 payload SHA 동일 |
| Architect | `APPROVED_PRODUCT_SOURCE_INTEGRATION`·blocking 0 |

검사 summary `evaluation-output/chiitalk-speaker-fix-2026-10-23/product-prep/H-integration/applied-checks/checks-summary.json` SHA는 `183d3ec8a88a45f7efa85228b41fadf29cd4aa221084cbbed14429bbde4d9a3a`다. Architect 근거 `evaluation-output/chiitalk-model-final24-2026-10-23/product-architect-approval.json` SHA는 `64b844920f2c7b740da8342a0abed124ef2dac4546e60997fc45da9a6864558e`다. 승인은 변경 전 c052/v8 위 누적 v11과 H 통합의 제품 소스 범위이며 정확한 애니메이션 말투·사람 청취·공개 runtime 성공 승인이 아니다.

이 문서는 모델 선정과 제품 소스 검증을 기록한다. 실제 릴리스의 Git push·배포 Git SHA·Vercel READY·canary·receipt는 별도 Git/Vercel 릴리스 증거 영역에서 확인하며 이 문서의 소스 승인으로 대체하지 않는다. 변경 전 공개 baseline c052·v8·Haiku와 새 소스 구현을 구분하고, 미래 배포 SHA나 runtime 성공을 미리 채우지 않는다. 새 12입력·힌트·출력·raw·source 본문은 문서 검토 범위 밖이다.

## v11 실제 56개의 후속 기록

기존 평가 문서의 v11 “실제 호출·품질 판정 0”은 실행 전 준비 시점의 기록이었다. 이후 동결 v11의 **계획 56·실제 56·평가 56**을 완료했고, 최종 독립 AI 판정은 **pass 20·weak 28·major 8·HOLD**였다. 원본·옛 판정·source SHA는 보존한다.

| v11 범위 | pass | weak | major |
|---|---:|---:|---:|
| 전체 56개 | 20 | 28 | 8 |
| 기존 48개 비맹검 회귀 | 19 | 26 | 3 |
| 신규 말 중심 targeted 8개 | 1 | 2 | 5 |
| 발성 24개 | 6 | 18 | 0 |
| 말 중심 32개 | 14 | 10 | 8 |

중대 오류는 소유 2개·현재 행동의 선행조건 3개·화자/발화행위 3개였다. 형식·원본 연결 56개가 통과했어도 언어 품질은 통과하지 않았다. Chat 보고 비용은 **$0.0144954**이고 native 감사 56개는 HTTP 404 pending이었다.

같은 기존 48개의 표시 대사 길이는 **v10 2,101→v11 1,475 code points(-29.80%)**였다. v10의 1,072 code points는 전체 48개가 아닌 기존 32개 subset이다. 32·48·56개의 분모를 섞지 않으며 길이 감소를 의미 보존이나 품질 개선율로 표시하지 않는다. 이번 추가 검증 24개의 결과로도 이 기록을 덮어쓰지 않는다.

| 확인한 v11 후속 근거 | SHA-256 |
|---|---|
| `evaluation-output/chiitalk-subtitle-compression-2026-10-18-v11/quality-actual56-report.md` | `af72ae4e3bc299a81307beca60eaf447e3a3d7a7ce8268cf8428f31e1205096a` |
| `evaluation-output/chiitalk-subtitle-compression-2026-10-18-v11/actual56-v11-final-evidence.json` | `f614347c7349bdbb3a4ca15e826e5304e55b363af6699f4f7b8be37e155d542c` |

## 유지하는 검증 한계

사람의 직접 청취·정식 한국어 자막 전사 대조·완벽한 원작 재현 검증은 0이다. 팬 자막의 제한된 화면 관찰과 제품이 직접 작성한 표현 가설은 [한국어 연구 기록](../korean-dub-research.md)에 구분한다. 말 중심 네 캐릭터의 이번 결과로 발성 네 캐릭터나 8명 전체의 품질을 승인하지 않는다.

옛 32·48·56개와 원 v4 128개 비교, 날짜별 가격 snapshot, 원 208개 HOLD는 각각의 조건·비용·원본 hash를 유지한다. 현재 절차와 과거 결과는 [평가 절차](../evaluation.md)·[누적 평가 기록](../evaluation-v3.md)에서 확인한다.
