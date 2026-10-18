# 한국어 말투 연구와 재표현 모델 비교

초기 기록일: 2026-10-11. 최신 갱신: 2026-10-18 KST. **기본 모델은 Claude Haiku 5.5, 이번 릴리스 source는 `2026-10-18-v8-subtitle-voices`다.** 첫 v7 32개에서 두 발화행위 오류를 확인해 공개 배포를 보류한 뒤 보정한 v8의 동일 32개 실제 재검수도 완료했다. 원 v4 실제 128개 비교·판정·비용, 옛 기준의 v5 추가 30개·첫 v7·v8 결과와 원 208개 HOLD는 각각 보존한다. 검수 당시 공개 기준점은 10/17 배포한 v5 Git `3dcaf8bb84b7a7dcba73529a05823b800e058d3b`다. 이번 릴리스의 공개 배포는 Git SHA·Vercel `READY`·도메인 연결을 별도 증거로 확인한다.

미디어 요청 17회의 제한적 AI 후보 9건·근거 부족 5건·형식 실패 3건, Chat 비용 $0.1621947과 이전 strict 128개 판정은 보존한다. 모몽가 중복 장면 가능성·랏코 조건부 화자 해석·후루혼야 본인 한국어 발화 공백은 그대로다. `2026-10-11-v4-reexpress` source·64 예시·core evidence·rubric v3의 실제 비교를 아래에 기록하며, 미디어 관찰·agent 서면 판정·기술 승인을 사람 검수나 정확 더빙 품질 통과로 표시하지 않는다.

사용자의 기준은 한국어 더빙과 일본 애니메이션의 한국어 번역 자막을 참고해 핵심 뜻·감정을 지키면서 캐릭터가 새로 말하는 듯 표현하는 것이다. 긴 입력도 한마디·감탄·의성어로 압축할 수 있고, 말할 수 있는 캐릭터도 항상 완결 문장을 만들 필요는 없다. 출처는 [한국어 말투 연구](korean-dub-research.md), 해석은 [말투 가이드](character-style-guide.md)에 구분한다. 이전 [v2 평가](evaluation-v2.md)·strict 128개·v5 30개 판정을 새 정책으로 다시 쓰거나 accepted를 새 표현 품질 통과로 바꾸지 않는다.

## 현재 단계

| 단계 | 현재 기록 상태 | 결과를 채울 때 필요한 것 |
|---|---|---|
| 공식 자료 수집 | TV 24·영화 8·성우 본인 2의 primary 자료 목록 보존 | 출처·범위·길이 확인과 실제 발화를 구분 |
| 첫 미디어 분석 | 005 한 응답의 연구 형식 검증 실패; 확정 말투 근거 0 | 실패 원본 보존; 시각 추정·대사 복제 금지 |
| 후속 미디어 12건 | v4의 4시도·후보 3·형식 실패 1 후 중단; 남은 8편은 v5에서 후보 4·근거 부족 4 | 초기 실패 005와 함께 13회; 각 run·원본·실비 보존 |
| 우사기·랏코 최종 보완 | v7 실제 4시도·후보 2·근거 부족 1·형식 실패 1 | 166은 조건부 의아함, 66은 비언어 환호만; 추가 corpus/유료 확대 없음 |
| 이전 strict v3 | source·64 예시·core evidence·rubric v2와 실제 128개 판정 동결 | 이전 원본·SHA·판정 유지; 새 기준으로 소급하지 않음 |
| 새 재표현 v4 source | 새 64 예시·style source·고정32입력 연결; source-only Architect APPROVED 보고 | 기술 승인과 실제 모델 출력 품질 구분 |
| 새 core evidence·rubric v3 | 새 파일·SHA·무순환 binding 동결; 연결 검증 253개 통과 | 동일 primary source 범위로 새 익명 packet 채점 |
| 새 텍스트 검수 | v9 실제 128개 출력·익명 전수 판정 동결; 자연스러움의 제한된 정정 이력 보존 | 같은 네 문장 × 8캐릭터 × 4후보; 사람 청취·채점 0 |
| 기본 모델 선택 | v2 판정 순위의 Haiku 5.5를 사용자가 확정; 코드 기본값 적용 | 첫 32개 의미·제품 정책 major 0/0; weak 14 등 한계 유지 |
| 최종 v5 source 검증 | Bun 91 tests·1,811 assertions·앱/tools typecheck·lint·build 통과 | 모델을 호출한 검증이 아님; source 53개는 검사 중 불변 |
| 최종 payload 동등성 | 새 default240=explicit Haiku240; 타 7캐릭터 210개는 v4 literal와 동일; 모몽가 30개 변경 | 원 Haiku의 타 7캐릭터 28표본 재사용 가능; 모몽가 4표본은 v4 결과 |
| 원 추가 208개 | v10 source-only APPROVED 기록 보존; 현재 HOLD·추가 POST 0 | 원 source·manifest·근거는 그대로 유지 |
| v5 모몽가 추가 30개 | 10/18 실제 30개 완료·retry/unknown 0; 옛 기준 pass 6·weak 16·major 8 | 비맹검 단일 AI 검수; 새 압축 기준과 직접 개선율 비교 금지 |
| v5 공개 배포 | 10/17 Git `3dcaf8b`·Vercel `READY`·공개 도메인 연결 확인 | UID `dpl_3JdjXZA3VZsZW82LzRmpERAg8tjY`; 이번 모델 검수 당시 공개 기준점 |
| 한국어 자막 기준 첫 v7 | 실제 32개 완료; 비맹검 AI pass 23·weak 7·major 2 | 하치와레 발화행위 오류로 공개 배포 보류; 원 결과 보존 |
| v8 보정·실제 재검수 | 같은 32개 실제 완료·비맹검 AI pass 29·weak 3·major 0; 제품 130 tests·typecheck·lint·build 통과 | 독립 holdout 아님; 공개 배포의 Git SHA·READY·도메인 연결은 별도 검증 |

`qualityValidated: false`와 사람 점수 미평가 상태를 유지한다. AI 관찰·agent 판정·사람 채점을 서로 대신 세지 않는다.

## 한국어 미디어 관찰의 범위

후속 run은 `chiitalk-dub-followup-2026-10-11-v4`, source version은 `2026-10-11-v4-dub-analysis`다. source hash는 `32e46113034548b7caa84b37f2755c2e460e39b2b8d676c292695aa82c2cb754`, manifest hash는 `92c3451ee0ea238f29a991ec447e9d820705c1d6e4b049d7e1f9e9cde32c050c`다. 당초 최대 시도는 12회, 보수적 비용 상한은 $0.60이었다. 실제로는 아래 첫 4편을 호출하고 중단했다. 준비 파일의 유료 0·배포 0은 실행 전 시점의 기록이며 현재 실행 수를 대신하지 않는다.

| 순서 | whole clip | 검토 목표 | 출처 범위 | v4 처리 | v5 처리 |
|---:|---|---|---|---|---|
| 1 | [AniBox 123화](https://www.youtube.com/watch?v=2QMuuqfdZJY) | 시사의 정중한 부탁 후보 | 공식 TV 업로드 | AI 후보 accepted | 재호출 없음 |
| 2 | [AniBox 25화](https://www.youtube.com/watch?v=x-OxpDicqKo) | 하치와레의 일상 발화 후보 | 공식 TV 업로드 | AI 후보 accepted | 재호출 없음 |
| 3 | [AniBox 1화](https://www.youtube.com/watch?v=kzAfNg6pAvI) | 치이카와의 놀이 발성 후보 | 공식 TV 업로드 | nonlexical 후보 accepted | 재호출 없음 |
| 4 | [AniBox 20화](https://www.youtube.com/watch?v=3kSvvXrtd9w) | 치이카와의 두려움·놀람 후보 | 공식 TV 업로드 | 연구 형식 실패·중단 | 재호출 없음 |
| 5 | [AniBox 9화](https://www.youtube.com/watch?v=VVO3ffaExr4) | 우사기의 먹기·만남 발성 후보 | 공식 TV 업로드 | 미호출 | cue 0·known-unconfirmed |
| 6 | [AniBox 35화](https://www.youtube.com/watch?v=5dTRQblIt-Q) | 쿠리만쥬의 만족 태도 후보 | 공식 TV 업로드 | 미호출 | nonlexical 후보; cue는 삼킴효과 |
| 7 | [성우 미소의 모몽가 샘플](https://www.youtube.com/watch?v=Nk48ezwhCs0) | 본인 배역 포트폴리오의 요구·태도 후보 | 성우 본인 primary; TV 장면 재사용 여부 구분 | 미호출 | 요구 반복 후보; TV118과 같은 장면 가능성 |
| 8 | [AniBox 118화](https://www.youtube.com/watch?v=2Aaml0YvsvU) | 모몽가의 상대에게 하는 요구 후보 | 공식 TV 업로드 | 미호출 | 요구 반복 후보 |
| 9 | [AniBox 54화](https://www.youtube.com/watch?v=PN0VmWYBRII) | 랏코가 부탁을 받는 문맥과 본인 발화 후보 | 공식 TV 업로드 | 미호출 | 대상 발화 미대응·known-unconfirmed |
| 10 | [AniBox 103화](https://www.youtube.com/watch?v=L733URriIYM) | 랏코의 일상 발화와 다른 화자 구분 | 공식 TV 업로드 | 미호출 | 화자 unknown·known-unconfirmed |
| 11 | [AniBox 124화](https://www.youtube.com/watch?v=VgYkbgyXkGo) | 시사가 조건 설명을 듣는 반응 후보 | 공식 TV 업로드 | 미호출 | 정중 요청 후보 |
| 12 | [영화 헌책방 소개](https://www.youtube.com/watch?v=0aaBDRDEn6U) | 후루혼야 본인 발성과 내레이터 구분 | 공식 영화 홍보; TV 더빙과 범위 분리 | 미호출 | not-ko·본인 발화 미대응·known-unconfirmed |

이 목록의 target은 검토 목표다. 실제 한국어·화자·발화 여부를 미리 확정하지 않는다. 전체 URL을 사용하며 `?t=`를 붙여 비용 구간을 잘랐다고 표시하지 않는다. 이번 기록은 whole clip 단위이며 발화 타임스탬프가 없다. 결과에 없는 시각을 추정해 넣지 않는다. 이미 유료 분석한 005는 이 새 목록에서 제외한다.

미디어 형식 검증 통과는 canonical 말투 검수와 다르다. `matched`, 언어, 확신도는 AI의 자체 보고로 남기고 writer가 구체 내용·출처·화자 오인을 검토한 뒤 적용 범위를 정한다. 비언어 소리가 대상 캐릭터와 대응했다고 보고되어도 **한국어 뜻단어가 확인되었다고 세지 않는다.** 한국어 주변 대화가 들렸다는 `koContext`와 불확실함을 별도로 기록한다. 영화의 내레이션을 후루혼야 본인 대사로 바꾸지 않는다.

### v4 실행과 writer 검토

집계 원본은 로컬 `evaluation-output/direct-2026-10-11-v4-dub-followup-research.json`이다. 현재 4행 원본 SHA-256은 `b122c1d7cdcfb77056d1c7af14f7cc79851f036ebb8a0c35209588f25bdc8ab9`다. 원 응답·실패를 고치거나 재생성하지 않았다.

| 항목 | 실제 기록 | 해석 |
|---|---:|---|
| 유료 POST / Chat 기록 | 4 / 4 | 비용·usage 기록 수; canonical 검수 성공 수 아님 |
| 연구 형식 통과 / AI 후보 accepted | 3 / 3 | 시사 123·하치와레 25·치이카와 1; writer 적용 범위 별도 |
| 연구 형식 실패 | 1 | 20화 cue 0과 matched/high/null의 불일치; 원본 보존·중단 |
| 남은 미호출 | 8 | v4에서 호출하지 않음; 후속은 새 source/run 준비 |
| Chat reasoning의 명시적 값 | 4건 모두 0 | native 독립 감사 통과로 확대하지 않음 |
| Generation 독립 감사 | 정상 응답 3건 pending / HTTP 404 | 404를 음성 분석 실패나 native 통과로 바꾸지 않음 |
| 사람 청취 / lexical 한국어 확정 / 시각 확정 | 0 / 0 / 0 | 모델 보고와 분리 |

Chat 실측 비용은 123화 $0.0103892, 25화 $0.0104187, 1화 $0.0104497, 실패 20화 $0.0103422로 **합계 $0.0415998**이다. 실패도 실제 비용에 포함했다. 이전 005의 $0.010557은 별도 run 비용이다. 이 두 미디어 run의 비용을 v2 텍스트 비용이나 계정 전체 사용량과 섞지 않는다.

시사의 부탁 cue와 보고된 요청 말끝은 정중한 부탁의 AI 후보로 서로 맞는다. 하치와레는 부드러운 자기 독백·피로 뒤 놀람의 태도 후보를 남기되 보고된 어미가 cue에 없어서 고정 어미로 쓰지 않는다. 치이카와는 작은 소리·웃음의 `nonlexical-tone-only` 후보로 제한한다. 구체 적용 한계와 source 링크는 [첫 3개 후보의 writer 검토](korean-dub-research.md#첫-3개-ai-후보의-writer-검토)에 있다. 모든 후보의 `qualityValidated: false`, `lexicalKoreanConfirmed: false`, 사람 청취 0을 유지한다.

### v5 실행과 writer 검토

v4에서 미호출이었던 8편은 새 run `chiitalk-dub-remaining-2026-10-11-v5`로 처리했다. source version은 `2026-10-11-v5-dub-analysis`, source SHA-256은 `a769ae86d4a3c03f8e37971709c1f5a8e2e416e9ab5010608e0cb6c8d0ce1a95`, manifest SHA-256은 `b68fe39b9e4eee0bad3cd60af54b5648e2d3c43971e9aee0e2faf2295372d7db`다. 집계 원본 `evaluation-output/direct-2026-10-11-v5-dub-remaining-research.json`의 8행 SHA-256은 `aeae1089a487987244e5e7ecb99bfbfe571b066aa6de50f16f6511dbad599ddd`다. 이전 실패·원본·동결 manifest는 수정하지 않았다.

| 항목 | v5 실제 기록 | 해석 |
|---|---:|---|
| 유료 POST / Chat 기록 | 8 / 8 | 모두 서로 다른 미호출 영상; 자동 재시도·005/20 재호출 없음 |
| JSON 형식 통과 | 8 | 내용·음성·화자 정확도의 검증 수 아님 |
| 제한적 AI 후보 | 4 | 쿠리만쥬 35·모몽가 성우 샘플/118·시사 124; 좁은 writer 적용 범위 별도 |
| known-unconfirmed | 4 | 우사기 9·랏코 54/103·영화 후루혼야; 새 말투 근거로 채택하지 않음 |
| 응답 미확인 / 남은 미호출 | 0 / 0 | 이 v5 run에 한정 |
| Chat reasoning의 명시적 값 | 8건 모두 0 | native 독립 감사 완료로 확대하지 않음 |
| Generation 독립 감사 | 8건 pending / HTTP 404 | native reasoning·제공자·최종 청구 확정 없음 |
| 사람 청취 / lexical 한국어 확정 / 시각 확정 | 0 / 0 / 0 | 모델 자체 보고와 별도 |

Chat 실측 비용은 우사기 9 $0.0103428, 쿠리만쥬 35 $0.0103512, 모몽가 성우 샘플 $0.0037388, 모몽가 118 $0.0104088, 랏코 54 $0.0103450, 랏코 103 $0.0102476, 시사 124 $0.0104117, 영화 후루혼야 $0.0020540으로 **합계 $0.0678999**다. 초기 005·v4를 더한 13회 미디어의 Chat 합은 **$0.1200567**이다. 계정 전체 지출이나 텍스트 비교 비용을 뜻하지 않는다.

후보 7건은 치이카와·하치와레·쿠리만쥬·모몽가·시사의 5캐릭터에 걸친다. 모몽가 성우 샘플과 TV118은 같은 감싸기 요구 장면일 가능성이 있으므로 source 파일 2개를 독립 감정 장면 2개로 세지 않는다. 성우 샘플의 독립 한국어 TV 더빙 출처는 확인하지 않았다. 쿠리만쥬의 삼킴효과 표기를 유성 호흡으로 확정하지 않으며 만족 태도만 참고한다. 시사 124는 123화의 정중 요청 방향을 보강한다. 우사기 cue 0·랏코 화자 미대응·영화 후루혼야의 일본어 배경 노래 보고는 새 한국어 말투 근거로 채택하지 않는다. [원본별 writer 해석](korean-dub-research.md#v5-남은-8편의-writer-검토)에 각 보류 사항을 남겼다.

### v7 최종 4편과 전체 미디어 기록

마지막 보완 run `chiitalk-dub-gap-2026-10-11-v7`은 104→166→66→27화를 실제 4회 호출했다. source version은 `2026-10-11-v7-dub-analysis`, source SHA-256은 `afa20d75025390b28f0a9ffebb65dccfa4e9378ca4d808dc3630a086053ff1f9`, manifest SHA-256은 `bde0d4cc4ba04d0aa97051035f157023c915564ca4ee30420e16e5eda8d1b6fc`다. 집계 원본 `evaluation-output/direct-2026-10-11-v7-dub-gap-research.json`의 SHA-256은 `d35f46c3bca66c9ef836aa607b6abce967ac69e70eaea2a77bb0ac7b9009392e`다.

| 항목 | v7 실제 기록 | 해석 |
|---|---:|---|
| 유료 POST / 원 Chat | 4 / 4 | 오류 27화의 primary Chat·usage도 보존 |
| 형식 통과 / 후보 / known-unconfirmed | 3 / 2 / 1 | 166·66 후보, 104 cue 0으로 근거 부족 |
| 형식 실패 / 응답 미확인 | 1 / 0 | 27화 research-validation 실패·HALT; 재POST 없음 |
| Chat reasoning의 명시적 값 | 4건 모두 0 | 27화는 보존된 `chatEvidence`의 원값 |
| Generation 독립 감사 | 형식 통과 3건 pending / HTTP 404 | 정확 음성·native 통과로 바꾸지 않음 |
| 사람 청취 / lexical 한국어 확정 / 시각 확정 | 0 / 0 / 0 | 높은 모델 확신도와 분리 |

104화 $0.0102829, 166화 $0.0110095, 66화 $0.0104653, 실패 27화 $0.0103803으로 **v7 합계 $0.042138**이다. 전체 미디어는 17시도·원 Chat17·형식 통과 14·후보 9·known-unconfirmed5·형식 실패 3·응답 미확인 0, 실측 Chat 합 **$0.1621947**이다. 형식 통과 14건의 native 감사는 HTTP404 pending이며 사람 청취·정확 한국어 전사·발화 시각 확정은 0이다. 전체 수집·계정 지출·텍스트 비교 수와 합치지 않는다.

166화는 두 짧은 cue·의아함·빈 ending을 보고했지만 target의 초기 근거는 제목/script 단서뿐이다. 본인 화자 독립 확인을 주장하지 않고 입력에 의문·놀람이 있을 때의 짧은 반응 방향만 조건부 참고한다. 호칭·정확 반응어·새 어미를 만들지 않는다. 66화는 높은 톤의 짧은 비언어 환호 후보만 참고하고 전사 표기를 기존 발성의 더빙 정답으로 정규화하지 않는다. 104의 cue0·27의 원실패는 새 말투 근거로 채택하지 않는다. [최종 4편의 writer 검토](korean-dub-research.md#우사기랏코의-추가-4편--최종-분석)에 source별 한계를 남겼다.

operator 최종 감사 `chiitalk-dub-v7-final-report-v1.json`은 27화의 `unclear`가 115 Unicode characters로 서버의 100 한도를 넘은 원 형식 실패임을 기록한다. SHA-256은 `dd204ecd0675db6e755eaf314cef67faa2e48ef817b391ee1b6b8df51fd09c5b`다. 실패를 성공으로 바꾸거나 원 응답을 줄여 다시 판정하지 않았다. 추가 corpus·유료 미디어 확대는 하지 않는다.

## 최종 제품 source와 근거 동결

이 절은 이전 strict v3 source의 불변 기록이다. 당시 style version은 `2026-10-11-v3-dub`, style SHA-256은 `4b35f48eb1fb69b9587d9ccab310048dc9f0510842fe208d42cc99d79f023ff3`이다. 캐릭터별 직접 작성 예시 8개·전체 64개를 추출한 로컬 `v3-frozen-product-examples-64-v1.json` SHA-256은 `765251fa01e7880bb8ce4b3ddc6064a18bafd3397b8d15747b7834a1703de2be`다. 현재 재표현 source는 아래 별도 절에 기록하며 이 snapshot을 덮어쓰지 않는다.

최종 source freeze 보고는 89 tests·1,777 assertions와 typecheck·lint·build exit0, 기존 240 case 내용 유지, 요청별 3 shots·256 output tokens를 기록했다. Architect의 별도 source-only 검토는 240 cases와 Unicode/JSON 경계 스트레스를 포함한 280 payload에 대해 source 경계·3 shots·8 KiB·registry·의도 보존을 승인했다고 보고했다. 이는 새 모델의 실제 출력이나 배포 확인이 아니다.

원 freeze의 최대 3,548 bytes는 일반 한국어/emoji 300 code points의 측정이다. NUL 또는 lone surrogate 300 code points가 JSON escaping으로 늘어나는 별도 Architect 측정은 최대 4,448 bytes였으며 둘 다 8 KiB 이하라고 보고되었다. writer가 그 측정을 재실행한 것으로 기록하지 않는다. 원 freeze·hash는 수정하지 않았고 `v3-prompt-size-supplementary-note-v1.json`에 측정 범위를 별도로 보존했다. 관찰한 최대값을 가능한 모든 입력의 전체 최대라고 부르지 않는다.

core evidence v2는 17원본의 SHA·후보/근거 부족/실패·캐릭터별 관찰 범위·보조 문맥·최종 64 예시와 style SHA·32 character/case 쌍을 연결한다. 네 문장 텍스트를 8캐릭터에 배정한 32개 case이며 실제 4모델 비교는 128행이다. 모델 브랜드·가격·매핑은 이 파일에 없다. 정확 한국어 전사·사람 청취·시각 확정 0과 모몽가 중복·쿠리만쥬 삼킴·랏코 조건부 화자·우사기 환호·후루혼야 본인 발화 0을 유지한다.

| 불변 파일 | SHA-256 | 용도 |
|---|---|---|
| `v3-core-evidence-v2.json` | `9b60d4c2b17b354608698647f675802ad52a37a1ed4807b3ba1ea7d842129469` | 최종 근거·source·64예시·32 case 연결 |
| `v3-blind-rubric-v2.json` | `30df58183c5eeb9fdf9b81df740a5e446752a1e671f43521b01a8915e217e8eb` | 이전 실제 128행에 사용한 strict 기준 |

### 이전 strict 128개의 실제 판정

익명 실제 출력 128개를 모두 읽고 행별 의미·제품 정책·불확실성과 스타일 네 축의 source·grade·범위·이유를 동결했다. 고유 ID·입력/출력 SHA·32 case coverage·근거 연결 등 구조 검증 929개가 통과했다. 사람의 직접 채점·청취는 0이며 `qualityValidated: false`다.

| 이전 기준의 집계 | 행 수 |
|---|---:|
| 의미 major | 4 |
| 제품 정책 major | 10 |
| 두 major의 중복을 뺀 행 | 13 |
| weak | 41 |
| accepted | 74 |

불변 판정 파일 `writer-ratings-128-frozen-v1.json` SHA-256은 `454a7433f7cb0eeebde20ed28adc1f11c9ecb7dc54fb426c64b3aa13da68ca6c`다. 이는 당시 엄격한 출력·추가 표현 기준의 결과다. 새로 허용한 감정의 구어 표현·독백·수사 질문을 이유로 이 원판정을 수정하지 않는다. 모델별 공개·비용·선택은 별도 근거를 확인한 뒤 기록한다.

## 재표현 v4의 새 검수 기준

새 source version은 `2026-10-11-v4-reexpress`다. style SHA-256은 `dc38a9de4e3a8fd11e2dbff34d0ccc9c0b1132da976695a71b47a6c54fde4163`, 새 직접 작성 64 예시 SHA는 `aac6644ef6888a6897539179503c8432dc253604bb9cbd3a11d840ccf58b0380`, source freeze report SHA는 `f90a1eefa68ce775eb1993105c70c3907b4aa1a9359e0cd54e91d0d2fece9e67`이다. 기존 240 case 내용은 유지하며 네 고정 입력을 새 source에 별도로 연결했다. 정확 예시 일치는 채점 조건이 아니다.

의미 major는 화자·상대·소유/수령자·반환 방향·부정/거절·명백한 핵심 감정 반전과 새 사건·원인·조건·약속·조언을 대상으로 한다. 같은 생각과 감정을 수사 질문·자기 독백·강조·새 어순으로 표현하는 것 자체는 major가 아니다. 자연스러운 감정 표현과 구체 새 사실의 경계가 애매하면 불확실성을 남긴다. 발성형에는 사라진 물건명·시점의 완전한 단어 재현을 요구하지 않는다.

발성형 제품 상한은 **짧은 발성 1–4개·구두점 포함 48 Unicode code points·동일 문자 연속 최대 4회**다. 행동 지문·설명 wrapper·뜻단어의 음절 쪼개기는 허용하지 않는다. 이 수치·형식은 작품의 canonical 규칙이 아니다. 뜻단어와 작은 감탄의 경계가 불명확하면 lexical 위반을 단정하지 않는다.

기존 스타일 네 축은 발화량·상대와의 거리·태도·리듬이다. 같은 case/축의 primary 근거를 모든 후보에 동일하게 고정했다. 후보당 128축 중 B 13·C 11·D 104이며 unsupported를 충돌로 세지 않는다. B는 관찰한 감정·장면만, C는 소개·일본어 보조 문맥만 뒷받침하고 D는 새 제품 해석이다. 모몽가의 선택적 반복이 없다는 이유만으로 충돌을 만들지 않는다. 새 인간 청취·미디어 분석·Furu 한국어 발화 근거를 추가하지 않았다.

| 새 제품 축 — 근거 등급 D | 점수 | 판정 기준 |
|---|---|---|
| 표현 재구성 | 0–3 | 문장형: 원문/어미 교체 → 낱말·부분 어순 → 구조·독백·강조의 재구성 → 뜻과 감정을 지키는 자연스러운 캐릭터 방향의 구조·태도·리듬. 발성형: 뜻문장/지문 → 평평한 소리 → 감정 방향이 읽히는 강약·쉼 → 간결하게 감정·긍부정·혼합 정서를 살리는 리듬 |
| 발화 자연스러움 | 0–2 | 기계적인 나열/발화가 어려움 → 읽히지만 강조·쉼·적응이 어색함 → 짧고 매끄러운 한 번의 구어/발성 |

자연스러움 2면 재구성 원점수를, 1이면 재구성 최대 1점을, 0이면 재구성 0점을 사용한다. 두 실효 점수를 합한 행별 제품 점수는 0–5, 같은 32행의 합은 0–160이다. 길이·과장·많은 소리를 늘렸다는 이유만으로 가산하지 않는다. 한 문장·한 소리도 맥락에 적절하면 높은 점수를 받을 수 있다. 이는 서면 AI 관찰이며 성우의 실제 소리와 같다는 점수가 아니다.

새 비교는 `[의미 major 행 수, 제품 major 행 수, B 스타일 충돌 행 수, B 충돌을 제외한 C 충돌 행 수, -제품 점수 합]`을 앞 항목부터 최소화한다. 한 행의 여러 태그·축은 같은 집계에서 한 번만 센다. 같은 순위이면 새 판정 SHA를 동결한 뒤 동일 32행의 실측 비용을 비교한다. 32개 실제 출력·판정이 없는 후보는 전체 순위를 내지 않는다. 순위가 높다는 이유로 품질 통과를 선언하지 않는다.

| 새 불변 파일 | SHA-256 |
|---|---|
| `v4-reexpress-core-evidence-v3.json` | `3625e9555774a7289f17626a2e52b3617ac85b47a1fb90bd31d73849dd5aa658` |
| `v4-reexpress-blind-rubric-v3.json` | `3ab355bd50fc39006d05564ab2a30b65bf86a6282ebbcf3ecadb763af3d5cc75` |
| `v4-reexpress-criterion-binding-v1.json` | `91b7abfc6f22fdb725f32e12a016a371bafccb2a5fa5acb7497077a4cbf93207` |

core는 source·64 예시·고정32입력을, rubric은 core SHA를, binding은 모두의 SHA를 연결하며 순환이 없다. `v4-reexpress-criterion-binding-verification-v1.json`의 연결·범위 검증 253개가 모두 통과했다. SHA는 `87f6520722375205fdf26697522a8a0c5828668781184c14d09be91d59bc2dff`다. 새 모델 매핑·가격은 읽지 않았고 동결 시점 새 판정·승자·배포는 0/pending이다.

worker의 기술 보고는 88 tests·1,788 assertions, 앱/tools typecheck·focused lint exit0을 기록한다. worker는 build를 실행하지 않았다. 240 fixture+360 경계 입력의 600 payload에서 관찰한 최대는 fixture 3,284 bytes, 한국어 4,075, emoji 4,371, NUL/lone surrogate 5,266으로 8 KiB 이하였다. 관찰 범위의 최대이며 가능한 모든 입력의 전체 최대가 아니다. writer는 SHA·정책·입력을 대조했으며 기술 tests를 재실행하지 않았다. source-only Architect 승인은 실제 새 모델의 언어 품질이나 배포 확인을 대신하지 않는다.

## 텍스트 비교 대상과 고정 입력

아래 4개 ID는 서버 모델 설정과 평가 지원 코드에 등록된 비교 후보다. 새 v9의 실제 실행·서면 판정은 모두 후보당 32개이며, 동일 범위 집계와 한계는 아래 실제 비교 절에 기록한다.

| 후보 | 준비한 OpenRouter 모델 ID | 실행·검수 결과 |
|---|---|---|
| Claude Haiku 5.5 | `anthropic/claude-haiku-5.5` | 실제 32개·후속 검증 후보 선정 |
| GPT-5.4 nano | `openai/gpt-5.4-nano` | 실제 32개·동일 기준 비교 |
| Gemini 2.5 Flash | `google/gemini-2.5-flash` | 실제 32개·동일 기준 비교 |
| Gemini 2.5 Flash Lite | `google/gemini-2.5-flash-lite` | 실제 32개·동일 기준 비교 |

`data/character-evaluation-inputs.json`의 8캐릭터마다 suffix `01`, `27`, `12`, `24`를 고른다. 네 문장 텍스트 × 8캐릭터의 32 character/case 쌍이다. 이전 strict 비교의 실제 128개는 위 불변 판정에 연결했고 새 재표현 비교의 첫 검수 범위도 같은 32쌍 × 4후보다. 각 비교의 source·기준·출력·run은 별도로 기록한다. 선택 ID·입력 SHA·새 style SHA는 새 core evidence에 동결했다.

| suffix | 합성 입력 | 의미 검수의 핵심 |
|---|---|---|
| 01 | 오늘 일이 생각보다 잘 풀려서 기뻐. | 화자의 기쁨; 상대의 성공을 칭찬하는 답변으로 바꾸지 않기 |
| 27 | 기쁘기도 하지만 조금 무서워. | 기쁨과 두려움 둘 다; 캐릭터 성격으로 한 감정을 지우지 않기 |
| 12 | 그 물건을 나에게 돌려줘. | 내가 받는 반환 요청; 내가 돌려주는 약속이나 거절로 뒤집지 않기 |
| 24 | 고맙지만 그 제안은 거절할게. | 감사와 거절; 수락·새 허락 요청으로 바꾸지 않기 |

입력은 합성 검수 문장이다. 공식 대사를 정답 fixture로 복제하지 않는다. 32개는 비교 목적의 제한된 표본이므로 캐릭터의 모든 상황이나 실제 한국어 말투 전체를 검증했다고 확대하지 않는다.

## 블라인드 판정과 공개 순서

1. 최종 prompt·fixture·모델 설정·provider 설정과 전체 case 목록을 동결한다.
2. 모델명을 숨긴 표본 ID와 별도 매핑표를 준비한다. 검수에는 입력·캐릭터·출력·근거 범위만 제공한다.
3. 같은 기준으로 128개 실제 결과를 읽는다. 미확인 출력이나 모델 오류를 임의의 문장으로 채우지 않는다.
4. 모델을 공개하기 전에 각 행의 판정·이슈 태그·근거와 그 파일의 SHA를 고정한다.
5. 매핑을 공개해 모델별 집계·비용·한계를 기록한다. 이후 판정 수정은 변경 이유와 이전 판정을 보존한다.

이전 strict packet의 실제 128개 서면 AI 판정·SHA는 동결해 보존했다. 새 재표현 v9 packet의 실제 128개는 별도로 익명 전수 판정했고 수정된 판정 SHA를 동결한 뒤 매핑·비용을 공개했다. 이전 결과를 가져와 새 결과로 채우지 않았다. 모델명이 가려지지 않은 판정을 완료된 블라인드 결과라고 부르지 않는다.

준비용 rubric v1은 로컬 `v3-blind-rubric-v1.json`으로 동결했다. SHA-256은 `25fb436a56dcc64e772cde8f731a3b89a70531668816e191c9afd37ace657ac2`다. 첫 3개 AI 후보만 포함한 이전 준비 기준이며 수정하지 않는다. 최종 4편과 64 예시를 반영한 core evidence·rubric v2의 새 SHA는 위 표에 있다. 이번 준비 작업에서 모델 매핑·새 텍스트 가격·브랜드 추론 자료는 읽지 않았다. 이전 연구에서 후보 목록을 안다는 사실과 익명 표본의 모델을 안다는 사실을 구분한다.

블라인드용 근거 강도는 **A: 사람이 한국어 음성·화자를 대조한 근거(현재 0), B: 공식 영상의 제한적 AI 후보, C: 소개·보조 문맥·일반 제품 해석, D: 직접 작성 예시·제품 정책**으로 구분한다. 기존 가이드의 A/B/R/D 출처 표기를 덮어쓰는 분류가 아니다. 스타일은 `supported`·`weakconflict`·`unsupported`로 기록하고, B의 관찰 범위를 다른 감정 전체로 확대하지 않는다.

입력·출력 문자열만 있는 packet에서 실제 completion token 256 준수 여부를 추정하지 않는다. delivery는 실제 usage 근거가 제공될 때 따로 판정한다. 새 128행의 판정·이유·점수·SHA를 고정하기 전에 새 매핑이나 비용을 열지 않는다. 새 순위는 위 재표현 기준의 집계식을 사용하며 제품 정책 실패도 별도로 공개한다. 추가 입력은 별도 packet·승인 범위를 확인한 뒤 검수하며 준비를 실제 판정으로 세지 않는다.

## 의미 보존과 말투 근거의 별도 판정

| 평가 축 | 검토할 것 | 다른 축으로 오판하지 않기 |
|---|---|---|
| 의미·화자·소유 | 누가 누구에게 무엇을 요구하는지, 나의 감정·물건·행동인지 | 단순 말끝 차이를 화자 전환으로 세지 않음 |
| 부정·요청·거절 | 수락/거절, 반환 방향, 조건·시점, 혼합 감정 | 불명확한 발성만으로 명백한 의미 반전을 확정하지 않음 |
| 제품 출력 정책 | 길이·말량·출력 형식·추가 설정 금지 | 제품 수치를 공식 작품의 절대 규칙으로 표시하지 않음 |
| 한국어 말투 | 검토한 source가 뒷받침하는 어미·발성·태도·리듬 | source에 없는 사투리·고양이 어미·상시 명령을 차별성으로 강제하지 않음 |
| 근거 강도 | 공식 설명, 미검증 AI 후보, writer 검토한 AI 관찰, 사람 청취 여부 | AI 자체 확신도를 사람이 확인한 canonical 대사로 승격하지 않음 |

`major`는 명백한 의미·화자·소유·부정·요청/거절·역할 충돌과 중대한 제품 정책 위반을 분리해 기록한다. 두 범위가 함께 있으면 중복 없이 집계하고 태그를 남긴다. `weak`는 일부 의미·감정이 모호하거나 근거가 약한 경우다. `accepted`는 이번 기준에서 충돌 증거를 찾지 못했다는 뜻이며 실제 더빙 일치를 보장하지 않는다.

발성형은 정보 감소를 허용하는 제품 정책을 함께 읽는다. 소리로 압축하며 사라진 물건명·시점을 문장형과 같은 누락률로 벌점 주지 않는다. 그러나 자신의 부탁을 상대의 수락으로 바꾸는 등 확인 가능한 의도 전환은 별도로 판정한다. 소리의 긍정/부정이 애매하면 불확실성으로 남긴다. 짧은 뜻단어의 허용 여부도 source와 실행 당시 동결 정책을 기준으로 기록하며 v2의 절대 단어 제한을 새 canonical 규칙으로 재사용하지 않는다.

행별 기록에는 case ID·입력·출력 SHA, 숨긴 표본 ID, 의미 판정·이슈·근거, 제품 정책 판정, 스타일 관찰·연결 source·근거 강도, 미확정 부분, 사람 검수 여부를 둔다. Generation 독립 감사가 pending이면 native reasoning·제공자·최종 비용을 통과로 표시하지 않는다.

## 재표현 v9의 실제 128개 비교

run은 `chiitalk-text-playful-compare-2026-10-11-v9`다. 같은 네 합성 문장 × 8캐릭터 × 4모델을 보호된 서버에서 직접 호출했으며 사이트 API·Blob quota는 사용하지 않았다. 원 HTTP·257 journal events·128개 결과·익명 packet의 연결을 검증했다. 실제 고유 POST와 정상 delivery는 각각 128개, 자동 retry·응답 미확인·실패는 0개다. 각 모델의 32개는 문장형 16개·발성형 16개다.

Chat에 기록된 completion tokens는 모두 256 이하이고 reasoning의 명시적 값은 128개 모두 0이었다. Generation 독립 감사는 128개 모두 HTTP 404 pending, verified 0이다. Chat 실측 합은 **$0.0196081**이며 미디어 비용·계정 전체 사용량·native 최종 비용과 합치지 않는다. 원 응답의 delivery 검증과 아래 agent의 의미·표현 판정은 별개다.

| 순위 | 모델 | 실제 출력 | 의미 major | 제품 정책 major | B / C 스타일 충돌 | 제품 표현 점수 / 160 | Chat 실측 비용 |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | `anthropic/claude-haiku-5.5` | 32 | 0 | 0 | 0 / 0 | 120 | $0.0043822 |
| 2 | `google/gemini-2.5-flash-lite` | 32 | 0 | 3 | 0 / 0 | 113 | $0.0022798 |
| 3 | `google/gemini-2.5-flash` | 32 | 1 | 1 | 0 / 0 | 126 | $0.0073137 |
| 4 | `openai/gpt-5.4-nano` | 32 | 1 | 14 | 1 / 3 | 81 | $0.0056324 |

이 순서는 의미 major → 제품 정책 major → B 스타일 충돌 → B 충돌 행을 제외한 C 스타일 충돌 → 제품 표현 점수의 사전식 순위다. 제품 표현 점수는 D의 재구성·서면 자연스러움이고 정확 한국어 더빙 일치 점수가 아니다. 모두 동률일 때만 같은 32개 범위의 실측 비용을 비교한다. Flash의 표현 점수는 더 높았지만 의미 major를 먼저 확인하는 동결 기준상 Haiku를 앞서지 않았다.

### 판정 동결과 제한된 정정

새 실제 128개는 입력·원출력을 모두 읽고 의미·제품 정책·불확실성·스타일 네 축과 표현 점수를 기록했다. 첫 v1 판정을 보존한 뒤, 서면 자연스러움의 기존 범위에 캐릭터 발화 방식 적응도 포함된다는 설명을 별도로 고정했다. 익명 18행을 재검토해 뜻단어를 사용한 후루혼야 7행의 자연스러움만 2→1로 정정했다. 의미·제품 정책·weak 태그·primary source·core·rubric·원 출력은 바꾸지 않았다. 수정한 v2를 동결한 뒤 새 집계를 공개했으며 전체 제품 표현 점수는 447→440, Haiku의 120점과 선정은 유지됐다.

| 이 결과의 로컬 원본 | SHA-256 |
|---|---|
| `chiitalk-text-v9-final-report-v1.json` — 실제 호출·원본 연결 | `ebd3daebd38ec2e99fdb939a5402dc841cc023980be2ed0f6ae9ad715bad3fee` |
| `writer-ratings-128-frozen-v2.json` — 동결된 agent 판정 | `71ff0b176d94b21c328f4b33a87a3477bbddc7469534984df2f2f343501ba6e5` |
| `chiitalk-text-v9-unblind-report-v2.json` — 실제 매핑·동일 범위 집계 | `fbd631942fdb2b68c836e727f74ed3bba2472fb4a271d6112fcbf61bb53d062c` |

`writer-ratings-128-frozen-v2-verification.json`은 판정의 연결·coverage를 검증한다. `naturalness-scope-clarification-v1.json`과 `naturalness-18-blind-adjudication-v1.json`은 정정 범위와 익명 검토 이유를 보존한다. Architect는 실제 원본 연결·판정 집계·첫 후보 선정을 승인했다. 이 승인은 사람 청취·canonical 발화 대조·전체 240개 품질·새 Production 배포를 의미하지 않는다.

### 선정 후보의 한계와 원 208개 HOLD

Haiku 32개에는 weak 14개, 재구성 원점수 1 이하 8개, 자연스러움 1 이하 2개가 있다. 후루혼야는 4개 모두 weak이고 본인 한국어 발화 근거는 0이다. 소리형의 반환 요청·감사와 거절·혼합 감정은 정보가 모호하게 압축될 수 있다. 이 한계와 사람 청취·채점 0, `qualityValidated: false`를 유지한다. 첫 표본 순위를 전체 한국어 더빙의 재현 승자로 확대하지 않는다.

원 run `chiitalk-text-winner208-2026-10-11-v10-anthropic-claude-haiku-5-5`는 Haiku의 나머지 208개 입력을 별도 source·manifest에 동결한 준비 기록이다. 자기 32개를 제외해 총 240개를 확인하려던 계획이며, 결과를 보기 전에 primary 스타일 832축을 B25·C56·D751로 고정하고 source-only Architect 승인을 받았다. 사용자가 Haiku를 확정하고 모몽가 추가 조사를 요청해 이 확대는 현재 **HOLD·추가 모델 POST 0**이다. 원 source·manifest·근거·준비 기록은 수정하지 않는다. 이 계획을 실제 240개 검수 완료로 세지 않는다.

추가 실행은 해당 새 source의 예산과 현재 key의 월 $5·Monthly·유한한 잔여 허용량·공급자 옵션·가격 조건을 별도로 확인한다. 사용 가능한 credit은 사용자 확인 정보다. 공식 API 계약상 계정 credit 조회에는 Management key가 필요하며 앱 inference key로 계정 전체 잔액을 실제 조회하지 않았다. 사용자 확인이나 Monthly key gate를 API로 검증한 account wallet 잔액으로 표시하지 않는다. Management key 추가·자동 충전·실패 재POST는 하지 않는다.

## Haiku 기본 모델 적용과 모몽가 추가 검증

2026-10-12 KST에 사용자가 `anthropic/claude-haiku-5.5`를 확정했고 서버 기본 모델과 관련 test 기대값에 적용했다. 당시 v4 범위에서 모델을 생략한 기본 payload 240개와 v9의 동결 explicit Haiku payload의 내용·직렬화 bytes·hash 일치를 확인했다. provider 구현·style source·동결 근거는 그 기본값 적용에서 변경하지 않았다. 당시 focused tests는 24 tests·801 assertions·실패 0, 새 모델 호출·Blob·Git push·공개 배포는 0이었다. 이후 모몽가를 보정한 최종 v5 검증은 아래 별도 기록이다.

적용 proof `chiitalk-haiku-default-applied-2026-10-12-v1.json` SHA는 `fafa6dad47ad23bb4db5a4937ce7e4e39e3a00d91005a72b88549f5c1923e512`, 당시 기본 payload 동등성 proof SHA는 `fb36029d777e528bbe1475c697ef0024babaa3ab195b1454f085bec9fbf2b113`이다. 이는 v4 source의 기본값 적용과 payload 동일성 기록이며 새 v5 출력 품질·공개 모델 전환 완료를 뜻하지 않는다. 배포 전 확인 snapshot은 2026-10-12 Qwen UID `dpl_4vm2LB226sWe9np3bB2e34sbc894` / Git `9b17c9d`로 보존한다.

당시 v5 style version은 `2026-10-12-v5-momonga`, style SHA는 `b1f1dad9c02b43d72eed3f1511d5375e985be369d1cf231729ae741791d50986`다. [132·157·118의 추가 확인](korean-dub-research.md#모몽가-v5의-추가-확인과-제품-보정)은 메타데이터·설명 C와 미확정 script UI 범위다. 새 B 음성 관찰이나 정확 한국어 대사를 확보한 것으로 표시하지 않는다. 당시 모몽가 8예시는 D 직접 각색이며 요청이 있을 때만 요구를 반복하고 정도·비교·부정/거절을 보존하도록 했다. 이 정보 보존 정책은 아래 v7의 압축 허용 기준과 구분한다.

2026-10-13 KST 최종 source 검증은 Bun 91 tests·1,811 assertions·실패 0, 앱/tools typecheck·lint·build exit 0을 기록했다. 검사 중 source 53개가 바뀌지 않았다. focused 검증 1,480조건·실패 0에서 타 7캐릭터 210개는 원 v4 Haiku literal payload와 같고 모몽가 30개는 변경됐다. 새 default240=explicit Haiku240이며, 검사한 240입력에서 messages 최대 3,474 bytes·전체 payload 최대 3,741 bytes였다. 관찰 범위의 최대이며 모든 300자 입력의 최대값으로 확대하지 않는다. 최종 검증 report SHA는 `dd9a54e5fc0b14b44c68bc1e2669f1dcd347018c1dfbec5a6842c30cf47a4a1e`, focused report SHA는 `b2baf71a784683f68a72c408d701708bcea9bbe9f32ed85dc9deaff1cd4875e1`이다. 이 검증은 모델·네트워크·Blob·Git·배포를 실행하지 않았다.

원 v4의 실제 128개·미디어 17개·8개 미리보기는 그대로 보존한다. v5에서 원 Haiku의 타 7캐릭터 28개(캐릭터당 4개)를 재사용할 수 있었던 것은 payload 동등성 때문이며, 공통 규칙이 바뀌는 v7의 품질 근거로 재사용하지 않는다.

### v5 공개 배포와 추가 30개의 실제 결과

2026-10-17 공개 배포는 Git `3dcaf8bb84b7a7dcba73529a05823b800e058d3b`, UID `dpl_3JdjXZA3VZsZW82LzRmpERAg8tjY`, GitHub `main` 자동 배포의 `READY` 및 공개 도메인 연결을 확인했다. 배포 직전 Bun 91 tests·1,811 assertions·앱/tools typecheck·lint·build가 통과했다. 이 배포 확인을 뒤의 모델 품질 검수로 대신하지 않는다. 10/12 Qwen `dpl_4vm2LB226sWe9np3bB2e34sbc894` / Git `9b17c9d`는 이전 snapshot으로 보존한다.

v5 모몽가 추가 30개는 10/18 KST에 완료했다. 보호된 별도 서버의 고정 30개 요청이며 사이트의 Blob/session/IP quota를 사용하지 않았다.

| 항목 | 실제 기록 |
|---|---|
| 고유 시도 / 정상 결과 / 응답 미확인 | 30 / 30 / 0 |
| 자동 retry / runner 재시작 | 0 / 0 |
| 반환 model / 종료 | Haiku 30 / stop 30 |
| Chat reasoning / Chat 실측 비용 | 0 tokens / **$0.0048541** |
| 옛 기준 전체 판정 | pass 6·weak 16·major 8 |
| 검수 범위 | 단일 AI·비맹검; 사람 평가·정확 더빙 대조 0 |

새 결심·약속·행동의 추가, 허용/허락 질문의 반전, 변환 대신 답변, 문자 손상이 보완점이었다. 당시 수사적 칭찬 요구도 엄격하게 평가한 옛 rubric을 그대로 보존한다. 새 압축 기준을 적용해 옛 점수를 조용히 바꾸거나 같은 조건의 개선율을 계산하지 않는다. Generation 독립 감사는 30개 pending이며 Chat 비용을 계정 전체 지출·최종 청구 확정으로 확대하지 않는다. 안전한 원문 export SHA는 `e09ab80b4bb5c93f2fc3989d3ebf1434fe6ef05e5f8a8bbea7d5d1a5e0b845c6`, 옛 검수 SHA는 `35239a1213193f9dcd85db17aa558544c118da3c01270f9dc88f7c2178ecdd27`이다.

### 한국어 자막과 짧은 반응 기준 v7

10/18 추가 관찰은 [출처·시점·판본별 기록](korean-dub-research.md#2026-10-18-한국어-자막-추가-조사)에 있다. 모몽가의 짧은 요구·늘임, 하치와레의 끊긴 호칭, 시사의 정중한 부탁·호칭은 일본 구간에 삽입된 팬 한국어 번역을 화면으로 확인한 한정된 사례다. 나머지 다섯 캐릭터의 새 한국어 자막 발화는 0이다. 우사기의 공식 일본어 발성 소개와 화자 미확정인 CJ 한국어 예고편 자막, 사용자 제공 하치와레 노래 참고는 이 세 캐릭터의 대사 근거와 별도로 둔다.

새 제품 규칙은 입력의 길이보다 중심 감정·의도에 맞는 발화량을 우선한다. 배경·이유·반복을 생략하고 한마디·감탄·호흡으로 압축할 수 있다. 말할 수 있는 캐릭터에도 최소 문장 수를 강제하지 않는다. 구체 요청의 핵심 대상·행위·방향, 감정·거절·소유의 방향은 뒤집지 않으며 새 실제 사건·구체 행동·약속과 문맥에 맞는 수사적 허세를 구분한다. 예시와 검수 입력은 모두 새로 쓴 D 제품 해석이며 원작 대사의 정답 복제가 아니다.

기존 240개 입력은 보존하고, 긴 감정 2개·구체 반환 요청·중립 사실을 각 8명에 적용하는 별도 **32개**를 고정했다. Haiku·입력 300자·프롬프트 8 KiB·출력 256 tokens·timeout 30초·reasoning off·retry 0을 유지한다. run별 보수 예약액 **$0.0565248**와 실제 비용을 구분하고 사이트 API·Blob quota를 쓰지 않는다. v6 후보는 공개 배포하거나 실제 모델 검수하지 않았다.

첫 v7 `2026-10-18-v7-subtitles-compression`의 실제 32개는 한 runner에서 모두 `stop`으로 완료했고 reasoning·unknown·retry·Blob 작업은 0이었다. Chat에 보고된 비용은 **$0.0057758**이며 native 감사 32개는 pending이다. 이를 계정 전체 지출이나 최종 청구 확정으로 표시하지 않는다.

| 첫 v7 비맹검 AI 판정 | 수 | 관찰 |
|---|---:|---|
| pass | 23 | 제한된 제품·근거 기준에서 중대한 충돌을 찾지 못함 |
| weak | 7 | 발성형 뜻단어/단어 조각 4건, 중립·발성 개수·정보 축약 등의 보완점 |
| major | 2 | 하치와레의 반환 요구가 상대의 수락 약속으로, 중립 진술이 상대에게 묻는 질문으로 바뀜 |

두 major 때문에 첫 v7의 공개 배포를 보류했다. 짧은 출력 자체를 실패로 평가한 것은 아니다. 긴 기쁨의 현재 긍정 방향은 8명 모두 유지했고, 긴 속상함 입력에 새 재도전 결심이 생긴 경우는 없었다. 판정은 한 AI의 비맹검 관찰이며 공식 애니메이션 일치·사람 평가가 아니다. 원 응답·판정은 보존한다. 실제 실행 증거 SHA는 `a3c2274f08d737efc0faf355aaecd3b3d3975feeee6a50725926f0d285f104e3`, 안전한 출력 export SHA는 `0efb4cdbc6369eae4c276dc3708961cd1a6f0d25c79c12787e3b65764373a2b8`, 검수 SHA는 `c861beac48c0b7db860baea2403f0165f571c2afa4d3f1a3f8d65034ad306a1e`다.

### v8의 발화행위와 발성 보정

이번 릴리스 source는 `2026-10-18-v8-subtitle-voices`, style SHA는 `56bcc53f464268e9ca8a80448a7d1d4addf6cb6392799e03419afc16a9a932ca`다. 같은 화자의 진술·질문·부탁을 유지하도록 보강하고 하치와레 반환 요청의 대조 예시, 하치와레·랏코·시사의 중립 진술 예시를 추가했다. 부사절의 부정을 화자의 거절로 잘못 고르는 범위를 줄였다. 치이카와·우사기·쿠리만쥬·후루혼야에는 뜻단어나 단어 조각 대신 정해 둔 짧은 발성 재료를 쓰도록 안내한다. **이 재료 제한은 잠정 제품 정책이며 원작에서 단어를 말할 수 없다는 증거가 아니다.**

제품 130 tests·2,021 assertions, 앱/tools typecheck·lint·Bun build를 통과했고 Architect가 제품 source를 검토했다. 같은 32개 실제 재검수는 한 runner에서 모두 완료했고 Haiku/Anthropic·`stop` 각각 32개, reasoning·retry·unknown·문자 손상·공개 Blob quota 사용은 0이었다. 원 HTTP 32개·저널 65 events·결과 32개의 연결을 확인했다. Chat 보고 비용은 **$0.0064297**, 첫 v7과의 합계는 **$0.0122055**다. native 감사 32개 pending과 계정 최종 청구 미확인을 유지한다. 실제 실행 증거 SHA는 `4b8090286d497ec52cedfebd66a2c93eb66f1ca471ef1041ca28a78ba8af2cfa`, 안전한 출력 export SHA는 `4938bb28b9fe282e60e1d897bf396e3cd161bc8e5cb99b39552338aad742e524`다.

| v8 비맹검 AI 판정 | 수 | 관찰 |
|---|---:|---|
| pass | 29 | 이 고정 표본의 제한된 제품·근거 기준에서 중대한 충돌을 찾지 못함 |
| weak | 3 | 치이카와의 기쁨 `어엇`·슬픔 `헤에`가 지정 발성 재료를 조금 벗어남; 쿠리만쥬에 음표 장식 1건 |
| major | 0 | 핵심 감정·발화행위·소유/반환 방향의 반전이나 새 구체 사건·요구를 발견하지 못함 |

첫 v7의 하치와레 반환/중립 반전 2건, 발성형 뜻단어·단어 조각 4건, 후루혼야 발성 개수 초과는 이 재검수에서 재발하지 않았다. 모몽가의 자기 호칭·자기 칭찬은 허용한 수사적 허세로 보되 실제 어법이나 작품 전체의 빈도를 검증한 것은 아니다. 소리만으로 중립 사실의 세부 뜻을 완전히 해독했다고 평가하지 않는다. 최종 검수 SHA는 `8c9808063e205672119067a608d48b1dcb2cd82aa7caf4524b678005448e6736`다.

첫 결과를 보고 교정한 비맹검 동일 표본이므로 독립 holdout·일반화 성능·8명 전체의 원작 정확도를 입증하지 않는다. 기술 검증·모델 검수·공개 배포는 별도 결과다. 배포의 정확한 Git SHA·Vercel UID/`READY`·도메인·공개 canary는 릴리스 증거로 따로 확인하며 모델 결과로 대신하지 않는다. 첫 v7의 실패·판정·비용을 v8 결과로 덮어쓰지 않는다.

### 표준 endpoint 가격 snapshot

아래 표는 2026-10-12 KST의 공식 표준 endpoint 직접 조회 snapshot이다. Haiku는 2026-10-13 KST에 공식 endpoint GET 200과 Anthropic tag·입력 $0.10/출력 $0.50·reasoning/max_tokens 지원을 다시 확인했다. 다른 행의 확인 날짜를 새로 바꾸지 않는다. cache·flex 요금은 제외하며 실제 호출 직전 조건과 상한을 확인한다. 이 표로 원 v4의 32개 실측 Chat 비용을 다시 계산하거나 바꾸지 않는다.

| 모델 | 입력 $/100만 tokens | 출력 $/100만 tokens |
|---|---:|---:|
| [Claude Haiku 5.5](https://openrouter.ai/api/v1/models/anthropic/claude-haiku-5.5/endpoints) | $0.10 | $0.50 |
| [Gemini 2.5 Flash Lite](https://openrouter.ai/api/v1/models/google/gemini-2.5-flash-lite/endpoints) | $0.10 | $0.40 |
| [Gemini 2.5 Flash](https://openrouter.ai/api/v1/models/google/gemini-2.5-flash/endpoints) | $0.30 | $2.50 |
| [GPT-5.4 nano](https://openrouter.ai/api/v1/models/openai/gpt-5.4-nano/endpoints) | $0.20 | $1.25 |
| [Qwen 3.5 9B의 최저 표준 endpoint](https://openrouter.ai/api/v1/models/qwen/qwen3.5-9b/endpoints) | $0.08 | $0.13 |

Qwen의 기존 앱 가격 상한 $0.10/$0.15와 최저 endpoint의 $0.08/$0.13은 서로 다른 수치다. Haiku 기본값 확정은 사용자 선택과 위 실제 비교를 따른 것이며 최저 가격만으로 품질을 판단하지 않는다.

## v2와의 비교 범위

v2의 실제 언어 결과 479개 AI 판정은 그대로 보존한다. 당시 major는 Qwen 57·Gemini 19개이며, 그중 명백한 의미·화자·발화 의도·역할 충돌 범위는 Qwen 34·Gemini 3개다. 나머지 major에는 제품 출력 정책 위반이 포함된다. 사람 채점·공식 한국어 더빙 음성 대조는 각각 0이고 native 독립 감사는 pending이다.

v3의 새로운 prompt·표본·모델과 v2의 전체 240입력 결과를 같은 조건의 개선율로 계산하지 않는다. 비교 가능한 동일 입력·출력 정책·검수 축과 미확인 표본을 먼저 명시한다. v2 원본의 `qualityValidated: false`와 미평가 점수를 유지하며 새 결과로 이전 실패를 덮어쓰지 않는다.
