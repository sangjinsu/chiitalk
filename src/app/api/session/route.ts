import { handlers } from '@/lib/server/runtime';
import { errorResponse } from '@/lib/server/handlers';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { return await handlers().session(request); } catch (error) { return errorResponse(error); }
}
