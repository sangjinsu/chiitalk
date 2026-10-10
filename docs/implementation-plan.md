# chiitalk 구현 계획

목표는 한국어 문장을 여덟 캐릭터의 분위기로 변환하는 모바일 우선 웹앱이다. 사용자가 합의한 범위는 로그인 없는 단일 화면, 캐릭터 선택, 300 Unicode code point 입력, 변환·복사·초기화, 사용 가능 횟수와 이해 가능한 오류 표시다. 비언어 캐릭터는 짧은 발성으로 감정을 옮긴다.

Next.js stable + React + TypeScript를 Bun으로 설치·실행한다. API는 Node runtime이다. local/Preview는 기본 deterministic demo이고 Production은 필요한 서버 설정이 갖춰졌을 때 live다. demo cookie는 배포 origin에 범위를 둔 공개 key로 cold start 사이 일관되게 검증하지만, quota는 인스턴스 메모리에 둔 체험 예시이며 분산 보안 한도가 아니다. Production은 별도 live secret만 신뢰한다. 클라이언트 입력·취소·복사와 서버 응답 타입을 공유한다.

공개 metadata와 비공개 스타일을 분리한다. 캐릭터마다 새 예시 8개, 결정적 감정 regex로 요청당 최대 3개를 고른다. 공식 근거를 문서화하고 실제 한국어 더빙을 확인하지 못한 부분을 잠정 표시한다. 추가 emotion LLM이나 RAG를 쓰지 않는다.

운영 모델은 OpenRouter `qwen/qwen3.5-9b`다. input/output 가격 상한은 $0.10/$0.15 per million tokens, prompt 8 KiB, output 256 tokens, timeout 30초다. tools/reasoning/provider fallback/자동 LLM 재시도 없이 한번 호출한다. 지원 가능한 공급자가 없으면 오류 처리한다. Gemini `google/gemini-2.5-flash-lite`는 offline 평가 후보이며 자동 운영 fallback이 아니다.

서버가 서명한 7일 session cookie를 발급한다. session 하루 10회, trusted IP 하루 30회, 서비스 전체 KST 월 1,500회 한도를 private Blob의 월별 단일 ledger에 저장한다. 검증 → known CAS conflict에만 최대 3시도 → quota 예약 → LLM 순서다. request ID는 `YYYY-MM:<UUIDv4>`이며 월 경계와 중복 요청을 검증한다. 예약 후 실패·취소는 횟수를 돌려주지 않고 상태가 불명확한 write는 fail closed 한다. IP와 session은 HMAC으로 축약 저장하며 사용자 원문·출력을 ledger에 저장하지 않는다.

Basic BotID는 live Production에서 검증한다. WAF는 dashboard에 API 경로 IP 10/min 규칙 한 개를 수동 구성한다. OpenRouter dedicated key는 월 $5(UTC 기준), 자동 충전 off로 수동 구성한다. 앱 quota KST와 key 한도 UTC는 달력 기준이 다르다. Cron은 매일 지난 ledger를 정리하고 현재·이전 달을 보존한다.

검증은 unit/integration tests, lint, typecheck, build, responsive·keyboard QA, live Blob 경쟁·중복·etag·초기 생성·불명확 write 검증, 공급자 reasoning·단가 확인, 8×30×2 말투 비교와 사람이 하는 공식 발화 대조다. quota 소진 뒤 일/월 경계 복구는 resetAt·창 복귀·수동 조회로 확인하고 오래된 조회와 변환 응답의 race를 방지한다. 환경과 credentials가 없는 live 검증은 완료로 표시하지 않는다.

구현 담당은 backend/scaffold, frontend, 캐릭터·계약·문서·평가로 파일 소유권을 나눈다. root는 통합과 Architect 검토를 맡는다. 구현 완료 후에도 실제 공개 배포는 live 검증 및 운영 dashboard 설정 확인을 마친 상태를 요구한다.
