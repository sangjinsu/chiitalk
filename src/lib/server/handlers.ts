import type { ConvertRequest, ApiErrorCode, QuotaSnapshot } from '../contracts';
import { assertOrigin, readInput, type ServerConfig } from './security';
import { QuotaError, QuotaService } from './quota';
import { issueSession, requestCookie, sessionCookie, verifySession } from './session';
import { buildPayload } from './provider';
export interface HandlerDependencies {
  config: ServerConfig; quota: QuotaService; now: () => Date;
  ip: (request: Request) => string; bot: () => Promise<void>;
  convert: (input: ConvertRequest, signal: AbortSignal) => Promise<string>;
}
const messages: Record<ApiErrorCode, string> = {
  INVALID_INPUT: '캐릭터를 고르고 300자 이내의 문장을 입력해 주세요.',
  INVALID_SESSION: '세션이 만료됐어요. 새로고침한 뒤 다시 시도해 주세요.',
  INVALID_ORIGIN: '이 페이지에서 직접 요청해 주세요.', BOT_BLOCKED: '요청을 확인할 수 없어요. 페이지를 새로고침해 주세요.',
  INVALID_REQUEST_ID: '요청 시간이 바뀌었어요. 새 요청으로 다시 시도해 주세요.', DUPLICATE_REQUEST: '이미 처리한 요청이에요. 다시 변환하려면 새 요청을 보내 주세요.',
  QUOTA_EXCEEDED: '변환 횟수를 모두 사용했어요. 표시된 초기화 시간을 확인해 주세요.',
  SERVICE_UNAVAILABLE: '잠시 변환을 이용할 수 없어요. 조금 뒤 다시 시도해 주세요.',
  MODEL_UNAVAILABLE: '변환을 마치지 못했어요. 이번 요청은 사용 횟수에 포함돼요.',
};
export function jsonResponse(body: unknown, status = 200, headers: Record<string,string> = {}) {
  return Response.json(body, {status, headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff',...headers}});
}
export function errorResponse(error: unknown) {
  const known = error instanceof QuotaError ? error : new QuotaError('SERVICE_UNAVAILABLE');
  const status = known.code === 'INVALID_INPUT' ? 400 : known.code === 'INVALID_SESSION' ? 401 : ['INVALID_ORIGIN','BOT_BLOCKED'].includes(known.code) ? 403 : ['INVALID_REQUEST_ID','DUPLICATE_REQUEST'].includes(known.code) ? 409 : known.code === 'QUOTA_EXCEEDED' ? 429 : 503;
  return jsonResponse({error:{code:known.code,message:messages[known.code]},...(known.quota ? {quota:known.quota} : {})}, status);
}
export function createHandlers(deps: HandlerDependencies) {
  return {
    session: async (request: Request) => {
      try {
        const now = deps.now(); const ip = deps.ip(request);
        let token = requestCookie(request); let sid = await verifySession(token, deps.config.sessionSecret, now); let fresh = false;
        if (!sid) { token = await issueSession(deps.config.sessionSecret, now); sid = await verifySession(token, deps.config.sessionSecret, now); fresh = true; }
        if (!sid) throw new QuotaError('SERVICE_UNAVAILABLE');
        const quota = await deps.quota.inspect(sid, ip, now);
        return jsonResponse({mode:deps.config.mode,quota},200,fresh ? {'Set-Cookie':sessionCookie(token,deps.config.secureCookie)} : {});
      } catch (error) { return errorResponse(error); }
    },
    convert: async (request: Request) => {
      let quota: QuotaSnapshot | undefined;
      try {
        const now = deps.now();
        assertOrigin(request, deps.config);
        const input = await readInput(request);
        // Validate the complete prompt before allocating any quota.
        buildPayload(input);
        const sid = await verifySession(requestCookie(request), deps.config.sessionSecret, now);
        if (!sid) throw new QuotaError('INVALID_SESSION');
        const ip = deps.ip(request);
        try { await deps.bot(); } catch { throw new QuotaError('BOT_BLOCKED'); }
        quota = await deps.quota.reserve(sid, ip, request.headers.get('idempotency-key') ?? '', now);
        let result: string;
        try { result = await deps.convert(input, request.signal); } catch { throw new QuotaError('MODEL_UNAVAILABLE', quota); }
        return jsonResponse({result,quota,mode:deps.config.mode});
      } catch (error) { return errorResponse(error); }
    },
  };
}
