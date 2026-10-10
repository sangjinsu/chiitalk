import { handlers } from '@/lib/server/runtime';
import { errorResponse } from '@/lib/server/handlers';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function POST(request: Request) {
  try { return await handlers().convert(request); } catch (error) { return errorResponse(error); }
}
