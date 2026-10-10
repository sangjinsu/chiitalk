# 디자인 기준

참고: [awesome-design-md의 Notion 디자인 문서](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/notion/DESIGN.md). 자료의 차분한 문서 중심 계층, 간결한 경계선, 읽기 쉬운 여백을 적용한다. 아래 색상과 한국어 타이포그래피는 chiitalk의 제품 조정값이며 Notion의 공식 design token이라고 주장하지 않는다.

| 용도 | 제품 값 |
|---|---|
| 페이지 / 카드 / 보조 면 | #f8f5e8 / #ffffff / #f6f5f4 |
| 본문 / 보조 텍스트 | #1a1a1a / #5d5b54 |
| 경계 / 입력 경계 | #e5e3df / #c8c4be |
| CTA·focus / 눌림 | #5645d4 / #4534b3 |
| 캐릭터 배경 | peach #ffe8d4, rose #fde0ec, mint #d9f3e1, lavender #e6e0f5, sky #dcecfa, yellow #fef7d6 |
| radius | control 8px, card 12px, chip 999px |
| spacing | 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40px |
| type | system Korean font, 본문 16px/1.6, label 14px, 제목 28px |

캐릭터 색은 보조 신호다. 선택은 테두리·체크·텍스트로 함께 표시한다. 입력 → 캐릭터 → 변환 → 결과를 한 화면에서 이해할 수 있도록 구성하고, 결과의 복사·재변환 동작을 가까이 둔다. 남은 횟수, 진행 상태, 실제 오류와 재시도 가능 여부는 필요할 때 명확히 표시한다. 작은 화면에서도 가로 overflow 없이 사용할 수 있고 키보드 focus, 입력 label, 결과 상태 live region, reduced-motion 설정을 지원한다.

프롬프트·모델 가격·Blob 구현 같은 운영 상세는 문서에 둔다. 화면에는 체험 모드 여부, 비언어 출력의 정보 감소, 사용자가 이해해야 하는 한도만 짧게 알린다. 공식 캐릭터 그림이나 로고를 수집해 복제하지 않고 직접 작성한 장식 SVG를 사용한다.
