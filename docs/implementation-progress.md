# 구현 및 운영 검증 기록

2026-10-10 기준. 코드·체험 Preview와 실제 Production 출시를 구분한다. secret 값은 기록하지 않는다.

## 확인한 결과

| 항목 | 상태 | 실제 근거 |
|---|---|---|
| backend/frontend 구현 | 완료 | Preview cold start cookie 지속성, quota reset/focus/manual 조회와 race 방지 적용 |
| tests | 통과 | 4개 파일, 32 pass / 0 fail / 85 expect calls, exit 0 |
| lint·typecheck·build | 통과 | 수정 후 root 통합 실행 모두 exit 0 |
| localhost browser QA | 부분 통과 | 375px viewport/document width 375px, 캐릭터 8개 2열, console error 0 |
| 캐릭터/평가 데이터 | 작성 및 dry-run 통과 | 스타일 8개·새 예시 64개, 합성 입력 240개·최대 평가 480회, 유료 요청 0회 |
| Architect 코드/체험 준비 검토 | APPROVED | Preview instance key 및 자정 quota 복구 수정 후 승인 |
| 최종 운영 준비 Architect 검토 | APPROVED | 코드·mock Preview 및 실제로 확인한 Blob·WAF 운영 준비 증거 승인; Production release와 별개 |
| Vercel 프로젝트 | 연결 완료 | Hobby 팀 sangjinsus-projects-7fe3f5cc, 프로젝트 chiitalk, Production Node 24.x |
| 클라우드 Preview | READY | [검증한 Preview](https://chiitalk-f3bsktfwm-sangjinsus-projects-7fe3f5cc.vercel.app), Vercel 로그인 보호 유지, mock 모드 |
| Preview API 확인 | 통과 | GET /api/session → 200/demo/remaining 10; POST /api/convert → 200/demo/remaining 9; 모델 유료 호출 0회 |
| private Blob | 연결 완료 | chiitalk-quota, 서울 icn1, access private, Production 환경에만 연결 |
| 실제 Blob 계약 검증 | PASS | uncached read·중복 생성 차단·ETag CAS 동시 1 winner·최신 read·cleanup 완료, 남은 검증 객체 0, LLM 0회 |
| WAF 설정 및 실제 응답 | 통과 | 두 API 경로, IP 10/60초 fixed_window; active·valid·live, draft 없음; 동일 IP GET 200×10 후 429×1 |
| Production 환경변수 | 5개 등록 | SESSION_SECRET·QUOTA_HMAC_SECRET·CRON_SECRET·BLOB_READ_WRITE_TOKEN·APP_ORIGIN=https://chiitalk.vercel.app |
| dependency audit | 잔존 제약 | dev 경로 braces의 high 1개, CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm; 확인 당시 패치 없음 |

Preview는 고정 예시를 돌려주는 mock 모드다. demo cookie는 배포 origin별 공개 key로 cold instance 사이 검증하지만, quota는 인스턴스 메모리의 체험 예시다. 분산 환경의 비용·보안 한도를 보장하지 않는다. Production은 별도 live secret을 사용하고 demo cookie를 거절한다.

## 남은 운영 검증

| 항목 | 상태 | 필요한 다음 확인 |
|---|---|---|
| OPENROUTER_API_KEY | 미설정 | 사용자에게 등록 요청 중; [환경변수 설정](https://vercel.com/sangjinsus-projects-7fe3f5cc/chiitalk/settings/environment-variables) |
| OpenRouter 운영 제어 | 미검증 | reasoning off·실제 가격 상한·월 $5 key limit·자동 충전 off |
| Production Basic BotID | 미검증 | 실제 Production 인간 요청 통과·차단 요청 거절; WAF 설정/Preview API 확인과 별개 |
| 실모델 말투 비교 | 미실행 | 240 합성 입력 × Qwen/Gemini 두 모델, 사람 채점 |
| 공식 한국어/원작 발화 대조 | 미완료 | 영상 음성·대사 전사와 원작 컷 확인; 기존 자료 관찰은 [말투 근거](character-style-guide.md) 범위 유지 |
| READY Production 배포 | 없음 | 최초 Production 배포는 Error 상태; key와 남은 운영 검증 후 재배포·실 URL 확인 |
| Production 출시 승인 | 미승인 | 남은 운영 검증 미완료; 코드·mock Preview·확인된 운영 준비 승인과 구분 |

## 운영 검증 증거

실제 Production 환경을 CLI에 주입해 실행했다.

```sh
bunx vercel env run -e production -- bun scripts/check-live-blob.ts --live
```

`/private/tmp/chiitalk-live-blob-probe.log`에서 Blob 계약 PASS와 verification 객체 cleanup 완료를 확인했다. `/private/tmp/chiitalk-firewall-rules-verified.json`에는 두 API path 조건, IP limit 10/window 60/algo fixed_window, active·valid·live 및 draft 없음이 있다. `/private/tmp/chiitalk-waf-response-codes.log`에는 200 10개와 429 1개가 기록되어 있다. 임시 증거 파일은 현재 실행 환경의 자료이며 이 문서에는 secret 값을 포함하지 않는다.

초기 `--temporary --dry` 시도의 프로젝트 미연결 오류는 이후 로그인·프로젝트 연결·READY Preview 배포로 해소됐다. 그 실패 기록을 현재 배포 불가 상태로 표시하지 않는다. Production secret 값·OpenRouter key·실제 사용자 문장은 이 기록에 포함하지 않는다.

로컬 env 기록 정정: `.env.local`은 담당자의 `vercel link --yes --project chiitalk` 실행에서 자동 생성한 OIDC 전용 임시 파일이었다. 생성시각, `/private/tmp/chiitalk-project-link.log`의 `Created .env.local`, CLI 63.1.2의 `refreshOidcTokenAfterLink` 소스가 일치했다. 기존 사용자 파일이 아니었고 본문을 읽지 않고 삭제한 뒤 부재를 확인했다. 과거 로컬 env 파일 0개 주장은 잘못됐으며 현재 잔존 파일은 없다. `env run`은 당시 기존 파일을 읽고 Production 변수를 process 환경에 주입했으며, 실제 소스 업로드는 `.env*` 제외 필터를 적용했다.

2026-10-10 17:29 KST metadata 재확인: `OPENROUTER_API_KEY` 미설정, Production 환경변수 5개 유지, READY Preview 1개·READY Production 0개, `.env.local` 부재다. 유료 평가와 Production 완료로 상태를 올리지 않는다.
