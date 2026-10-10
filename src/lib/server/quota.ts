import { createHmac } from 'node:crypto';
import type { QuotaSnapshot, ApiErrorCode } from '../contracts';
export const MAX_LEDGER_BYTES = 1024 * 1024;
export type StoredLedger = { value: string; etag: string };
export interface QuotaStore {
  read(path: string): Promise<StoredLedger | null>;
  compareAndSwap(path: string, value: string, etag: string | null): Promise<boolean>;
}
type Day = { sessions: Record<string, number>; ips: Record<string, number> };
export type Ledger = { version: 1; month: string; total: number; days: Record<string, Day>; requests: Record<string, string> };
export class QuotaError extends Error {
  constructor(public code: ApiErrorCode, public quota?: QuotaSnapshot) { super(code); }
}
export function kstPeriod(now: Date) {
  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = shifted.toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const dailyReset = new Date(Date.parse(`${day}T00:00:00+09:00`) + 86400000).toISOString();
  const monthlyReset = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 1) - 9 * 3600000).toISOString();
  return { day, month, dailyReset, monthlyReset };
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function exactKeys(value: Record<string, unknown>, keys: string[]) { return Object.keys(value).sort().join(',') === keys.sort().join(','); }
const digestPattern = /^[a-f0-9]{64}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function parseLedger(raw: string, month: string): Ledger {
  if (Buffer.byteLength(raw) > MAX_LEDGER_BYTES) throw new QuotaError('SERVICE_UNAVAILABLE');
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new QuotaError('SERVICE_UNAVAILABLE'); }
  if (!record(data) || !exactKeys(data,['version','month','total','days','requests']) || data.version !== 1 || data.month !== month || !Number.isInteger(data.total) || typeof data.total !== 'number' || data.total < 0 || data.total > 1500 || !record(data.days) || !record(data.requests)) throw new QuotaError('SERVICE_UNAVAILABLE');
  let sessionSum = 0, ipSum = 0;
  if (Object.keys(data.days).length > 31 || Object.keys(data.requests).length !== data.total) throw new QuotaError('SERVICE_UNAVAILABLE');
  for (const [day, counters] of Object.entries(data.days)) {
    if (!new RegExp(`^${month}-[0-9]{2}$`).test(day) || Number(day.slice(-2)) < 1 || Number(day.slice(-2)) > 31 || !record(counters) || !exactKeys(counters,['sessions','ips']) || !record(counters.sessions) || !record(counters.ips)) throw new QuotaError('SERVICE_UNAVAILABLE');
    for (const [name, limit] of [['sessions',10],['ips',30]] as const) {
      const values = counters[name] as Record<string, unknown>;
      if (Object.keys(values).length > 1500) throw new QuotaError('SERVICE_UNAVAILABLE');
      for (const [id, count] of Object.entries(values)) {
        if (!digestPattern.test(id) || typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > limit) throw new QuotaError('SERVICE_UNAVAILABLE');
        if (name === 'sessions') sessionSum += count; else ipSum += count;
      }
    }
  }
  for (const [request, session] of Object.entries(data.requests)) {
    if (!digestPattern.test(request) || typeof session !== 'string' || !digestPattern.test(session)) throw new QuotaError('SERVICE_UNAVAILABLE');
  }
  if (sessionSum !== data.total || ipSum !== data.total) throw new QuotaError('SERVICE_UNAVAILABLE');
  return data as Ledger;
}
export class QuotaService {
  constructor(private store: QuotaStore, private secret: string) {}
  private hash(value: string) { return createHmac('sha256', this.secret).update(value).digest('hex'); }
  private ids(sid: string, ip: string, date: Date) {
    const period = kstPeriod(date);
    return { ...period, session: this.hash(`session:${period.month}:${sid}`), ip: this.hash(`ip:${period.day}:${ip}`) };
  }
  private snapshot(ledger: Ledger, ids: ReturnType<QuotaService['ids']>): QuotaSnapshot {
    const sessionRemaining = 10 - (ledger.days[ids.day]?.sessions[ids.session] ?? 0);
    const ipRemaining = 30 - (ledger.days[ids.day]?.ips[ids.ip] ?? 0);
    const monthlyRemaining = 1500 - ledger.total;
    const limitReason = monthlyRemaining === 0 ? 'monthly' : sessionRemaining === 0 ? 'session' : ipRemaining === 0 ? 'ip' : null;
    return { remaining: Math.min(sessionRemaining, ipRemaining, monthlyRemaining), sessionRemaining, ipRemaining, monthlyRemaining, resetAt: limitReason === 'monthly' ? ids.monthlyReset : ids.dailyReset, period: ids.month, limitReason };
  }
  private async load(month: string) {
    const stored = await this.store.read(`quota/${month}.json`);
    const ledger: Ledger = stored ? parseLedger(stored.value, month) : { version: 1, month, total: 0, days: {}, requests: {} };
    return { stored, ledger };
  }
  async inspect(sid: string, ip: string, date: Date): Promise<QuotaSnapshot> {
    const ids = this.ids(sid, ip, date);
    try { return this.snapshot((await this.load(ids.month)).ledger, ids); } catch { throw new QuotaError('SERVICE_UNAVAILABLE'); }
  }
  async reserve(sid: string, ip: string, requestId: string, date: Date): Promise<QuotaSnapshot> {
    // Capture the calendar once: retries cannot cross a KST day or month.
    const ids = this.ids(sid, ip, date);
    const [month, uuid, extra] = requestId.split(':');
    if (month !== ids.month || !uuid || !uuidPattern.test(uuid) || extra !== undefined) throw new QuotaError('INVALID_REQUEST_ID');
    const requestKey = this.hash(`request:${ids.month}:${sid}:${uuid.toLowerCase()}`);
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const { stored, ledger } = await this.load(ids.month);
        const quota = this.snapshot(ledger, ids);
        if (ledger.requests[requestKey]) throw new QuotaError('DUPLICATE_REQUEST', quota);
        if (quota.remaining === 0) throw new QuotaError('QUOTA_EXCEEDED', quota);
        ledger.days[ids.day] ??= { sessions: {}, ips: {} };
        const day = ledger.days[ids.day];
        day.sessions[ids.session] = (day.sessions[ids.session] ?? 0) + 1;
        day.ips[ids.ip] = (day.ips[ids.ip] ?? 0) + 1;
        ledger.total++;
        ledger.requests[requestKey] = ids.session;
        const value = JSON.stringify(ledger);
        if (Buffer.byteLength(value) > MAX_LEDGER_BYTES) throw new QuotaError('SERVICE_UNAVAILABLE');
        // Only a known CAS conflict may retry. Unknown writes fail closed.
        if (await this.store.compareAndSwap(`quota/${ids.month}.json`, value, stored?.etag ?? null)) return this.snapshot(ledger, ids);
      }
      throw new QuotaError('SERVICE_UNAVAILABLE');
    } catch (error) {
      if (error instanceof QuotaError) throw error;
      throw new QuotaError('SERVICE_UNAVAILABLE');
    }
  }
}
