import { isIP } from 'node:net';
import { createHash } from 'node:crypto';
import { ipAddress } from '@vercel/functions';
import { isCharacterId } from '../characters';
import type { AppMode, ConvertRequest } from '../contracts';
import { QuotaError } from './quota';
// Public demo keys provide continuity across cold instances, not authentication.
// Deployment scoping and independent namespaces keep them separate from live secrets.
function demoKey(kind: 'session' | 'quota', scope: string) {
  return createHash('sha256').update(`chiitalk-public-demo-v1:${kind}:${scope}`).digest('hex');
}
export type ServerConfig = {
  mode: AppMode; production: boolean; secureCookie: boolean;
  sessionSecret: string; quotaSecret: string; blobToken?: string;
  openrouterKey?: string; cronSecret?: string; origins: string[];
};
function strong(secret: string | undefined) { return !!secret && Buffer.byteLength(secret) >= 32 && new Set(secret).size >= 12 && !/example|replace|changeme/i.test(secret); }
function normalizedOrigin(value: string) {
  const url = new URL(value);
  if (!['https:','http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new QuotaError('SERVICE_UNAVAILABLE');
  return url.origin;
}
export function readConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const production = env.VERCEL_ENV === 'production';
  const localLive = !env.VERCEL && !env.VERCEL_ENV && env.CHIITALK_MODE === 'live';
  if (localLive && env.CHIITALK_ALLOW_LOCAL_LIVE !== '1') throw new QuotaError('SERVICE_UNAVAILABLE');
  const mode = production || localLive ? 'live' : 'demo';
  const origins = env.VERCEL_URL ? [normalizedOrigin(`https://${env.VERCEL_URL}`)] : [];
  if (env.APP_ORIGIN) origins.push(normalizedOrigin(env.APP_ORIGIN));
  if (production && (origins.length === 0 || origins.some(origin => !origin.startsWith('https://')))) throw new QuotaError('SERVICE_UNAVAILABLE');
  if (mode === 'live') {
    if (!strong(env.SESSION_SECRET) || !strong(env.QUOTA_HMAC_SECRET) || !strong(env.CRON_SECRET) || env.SESSION_SECRET === env.QUOTA_HMAC_SECRET || !env.BLOB_READ_WRITE_TOKEN?.trim() || !env.OPENROUTER_API_KEY?.trim()) throw new QuotaError('SERVICE_UNAVAILABLE');
  }
  const demoScope = origins[0] ?? 'local-demo';
  return {
    mode, production, secureCookie: !!env.VERCEL || production,
    sessionSecret: mode === 'live' ? env.SESSION_SECRET! : demoKey('session', demoScope),
    quotaSecret: mode === 'live' ? env.QUOTA_HMAC_SECRET! : demoKey('quota', demoScope),
    blobToken: mode === 'live' ? env.BLOB_READ_WRITE_TOKEN : undefined,
    openrouterKey: mode === 'live' ? env.OPENROUTER_API_KEY : undefined,
    cronSecret: mode === 'live' ? env.CRON_SECRET : undefined,
    origins,
  };
}
export function assertOrigin(request: Request, config: ServerConfig) {
  let origin: string, routeOrigin: string;
  try { origin = normalizedOrigin(request.headers.get('origin') ?? ''); routeOrigin = new URL(request.url).origin; } catch { throw new QuotaError('INVALID_ORIGIN'); }
  if (origin !== routeOrigin || (config.production && !config.origins.includes(origin)) || (request.headers.get('sec-fetch-site') && request.headers.get('sec-fetch-site') !== 'same-origin')) throw new QuotaError('INVALID_ORIGIN');
}
export function trustedIP(request: Request, config: ServerConfig): string {
  if (!config.production) return 'demo-local-ip';
  const ip = ipAddress(request);
  if (!ip || isIP(ip) === 0) throw new QuotaError('SERVICE_UNAVAILABLE');
  return ip;
}
export async function readBoundedStream(stream: ReadableStream<Uint8Array>, limit: number): Promise<string> {
  const reader = stream.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new QuotaError('INVALID_INPUT'); }
      chunks.push(value);
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  } finally { reader.releaseLock(); }
}
export async function readInput(request: Request): Promise<ConvertRequest> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json' || !request.body) throw new QuotaError('INVALID_INPUT');
  let value: unknown;
  try { value = JSON.parse(await readBoundedStream(request.body, 4096)); } catch { throw new QuotaError('INVALID_INPUT'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new QuotaError('INVALID_INPUT');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).sort().join(',') !== 'characterId,text' || !isCharacterId(data.characterId) || typeof data.text !== 'string' || !data.text.trim() || [...data.text].length > 300) throw new QuotaError('INVALID_INPUT');
  return { characterId: data.characterId, text: data.text.trim() };
}
