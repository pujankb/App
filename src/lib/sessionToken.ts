import crypto from 'crypto';

// Session signing key: reads process.env.SESSION_SECRET or falls back to a per-process ephemeral key
const SESSION_KEY =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const TOKEN_PREFIX = 'aspd1.';
const TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export interface LocalSessionClaims {
  uid: string;
  email: string;
  iat: number;
  exp: number;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(keyHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function safeCompareSecret(input: string, expected: string): boolean {
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function signSessionToken(uid: string, email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const claims: LocalSessionClaims = {
    uid,
    email,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_KEY)
    .update(payload)
    .digest('base64url');
  return `${TOKEN_PREFIX}${payload}.${sig}`;
}

export function isLocalSessionToken(token: string): boolean {
  return token.startsWith(TOKEN_PREFIX);
}

export function verifySessionToken(token: string): LocalSessionClaims | null {
  if (!isLocalSessionToken(token)) return null;
  const body = token.slice(TOKEN_PREFIX.length);
  const dotIdx = body.lastIndexOf('.');
  if (dotIdx <= 0) return null;

  const payload = body.slice(0, dotIdx);
  const providedSig = body.slice(dotIdx + 1);
  const expectedSig = crypto
    .createHmac('sha256', SESSION_KEY)
    .update(payload)
    .digest('base64url');

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    ) as LocalSessionClaims;
    const now = Math.floor(Date.now() / 1000);
    if (!claims.uid || !claims.exp || claims.exp < now) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}
