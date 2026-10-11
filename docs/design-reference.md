# 디자인 기준

참고: [awesome-design-md의 Notion 디자인 문서](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/notion/DESIGN.md). 문서 중심 계층, 간결한 경계선과 읽기 쉬운 여백을 참고한다. 아래 값은 chiitalk의 제품 조정값이며 Notion의 공식 token이 아니다.

사용자의 요청에 따라 큰 얼굴·노란 장식 hero와 선택·결과·대기 화면의 캐릭터 얼굴을 제거했다. 짧은 제목 다음에 친구 선택 → 문장 입력 → 말풍선 결과·복사를 배치한다. 이름 중심의 선택 카드, 파스텔 안내와 부드러운 윤곽을 유지한다. 공식 이미지·로고를 내려받거나 기존 그림을 따라 그리지 않는다.

| 용도 | 실제 제품 값 |
|---|---|
| 페이지 / 카드 | #fffaf2 / #ffffff |
| 본문 / 보조 텍스트 | #403b39 / #71665f |
| 경계 / 입력 경계 | #e2d9ce / #c9beb2 |
| CTA·focus / 눌림 | #6554b5 / #514293 |
| 캐릭터 배경 | characters.ts의 peach·rose·mint·lavender·sky·yellow |
| radius | input·button 12px, 선택 카드 15–18px의 비대칭 윤곽, 패널 20px(모바일 17px) |
| spacing | 4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 22 / 24 / 28 / 32px |
| type | system Korean font, 입력 16px/1.65, 본문 14px, 제목 28px(모바일 25px) |

친구 순서는 치이카와, 하치와레, 우사기, 쿠리만쥬, 모몽가, 랏코, 시사, 후루혼야다. desktop은 4열, 모바일은 2열이며 카드에는 이름만 표시한다. 카드의 최소 높이는 64px다. 선택은 색뿐 아니라 테두리와 체크, native radio checked 상태로 구분한다. 사용자가 유지하도록 지정한 카드 아래 파스텔 안내는 이름·짧은 말투 예시·비언어 출력에 대한 짧은 설명을 그대로 표시한다.

상황별 예문은 입력만 채우며 기존 결과와 복사 상태를 지운다. 선택·예문·횟수 재확인은 모델 요청을 만들지 않는다. CTA 옆에 남은 횟수를 두고, 로딩·오류를 가까이 표시한다. 모든 버튼은 최소 44px 높이이며 키보드 radio 화살표, focus, 입력 label, 상태 live region, reduced-motion과 모바일 가로 overflow 방지를 지원한다.

결과는 선택한 친구와 말풍선으로 표시하고 복사 성공·실패를 바로 안내한다. 프롬프트·모델 가격·Blob 같은 운영 상세는 제품 화면에 넣지 않는다. Preview에서는 실제 변환 결과와 혼동하지 않도록 미리보기 표시를 유지한다.
