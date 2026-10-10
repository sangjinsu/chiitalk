import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
export const SESSION_COOKIE = 'chiitalk_session';
const lifetime = 7 * 86400;
const issuer = 'chiitalk';
export async function issueSession(secret: string, date: Date): Promise<string> {
  const issued = Math.floor(date.getTime() / 1000);
  return new SignJWT({}).setProtectedHeader({alg:'HS256',typ:'JWT'}).setSubject(randomUUID()).setIssuer(issuer).setAudience(issuer).setIssuedAt(issued).setExpirationTime(issued + lifetime).sign(new TextEncoder().encode(secret));
}
export async function verifySession(token: string, secret: string, date: Date): Promise<string | null> {
  if (!token || token.length > 2048) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'], issuer, audience: issuer, currentDate: date, requiredClaims: ['sub','iat','exp'] });
    if (typeof payload.sub !== 'string' || !/^[a-f0-9-]{36}$/.test(payload.sub) || typeof payload.iat !== 'number' || typeof payload.exp !== 'number' || payload.exp - payload.iat !== lifetime || payload.iat > Math.floor(date.getTime()/1000)) return null;
    return payload.sub;
  } catch { return null; }
}
export function requestCookie(request: Request) {
  const entries = (request.headers.get('cookie') ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${SESSION_COOKIE}=`));
  if (entries.length !== 1) return '';
  return entries[0].slice(SESSION_COOKIE.length + 1);
}
export function sessionCookie(token: string, secure: boolean) {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${lifetime}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}
