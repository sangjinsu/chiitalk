import { timingSafeEqual } from 'node:crypto';
import { readConfig } from '@/lib/server/security';
import { cleanupQuota } from '@/lib/server/blob-store';
import { QuotaError } from '@/lib/server/quota';
import { errorResponse, jsonResponse } from '@/lib/server/handlers';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const config = readConfig();
    if (!config.production || !config.cronSecret || !config.blobToken) throw new QuotaError('SERVICE_UNAVAILABLE');
    const actual = Buffer.from(request.headers.get('authorization') ?? '');
    const expected = Buffer.from(`Bearer ${config.cronSecret}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return jsonResponse({error:{code:'INVALID_SESSION',message:'Unauthorized'}},401);
    const deleted = await cleanupQuota(config.blobToken,new Date());
    return jsonResponse({deleted});
  } catch (error) { return errorResponse(error); }
}
