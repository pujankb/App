import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { isLocalSessionToken, verifySessionToken } from '../lib/sessionToken.ts';
import { getOrCreateProfile, getProfileByUid, ProfileRecord } from '../db/queries.ts';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser | DecodedIdToken;
  profile?: ProfileRecord;
}

const DEFAULT_ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || 'mihirbharwada5612@gmail.com'
).toLowerCase();

async function hydrateUser(token: string): Promise<{
  decodedToken: AuthenticatedUser | DecodedIdToken;
  profile: ProfileRecord;
}> {
  if (isLocalSessionToken(token)) {
    const claims = verifySessionToken(token);
    if (!claims) {
      throw new Error('Invalid or expired session token');
    }
    const profile = await getProfileByUid(claims.uid);
    if (!profile) {
      throw new Error('Account no longer exists');
    }
    const decodedToken: AuthenticatedUser = {
      uid: profile.uid,
      email: profile.email,
      name: profile.fullName,
      picture: profile.avatarUrl ?? undefined,
    };
    return { decodedToken, profile };
  }

  const decodedToken = await adminAuth.verifyIdToken(token);
  const email = (decodedToken.email || '').toLowerCase();
  const isInitialAdmin = Boolean(email && email === DEFAULT_ADMIN_EMAIL);

  const profile = await getOrCreateProfile({
    uid: decodedToken.uid,
    email: decodedToken.email || `${decodedToken.uid}@aspd.local`,
    fullName: decodedToken.name || email.split('@')[0] || 'ASPD Scholar',
    avatarUrl: decodedToken.picture || '',
    defaultAdmin: isInitialAdmin,
  });

  return { decodedToken, profile };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is missing.' });
  }

  try {
    const { decodedToken, profile } = await hydrateUser(token);
    if (profile.status === 'suspended') {
      return res.status(403).json({
        error: 'Your account has been suspended by an administrator. Please contact support.',
      });
    }
    req.user = decodedToken;
    req.profile = profile;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const { decodedToken, profile } = await hydrateUser(token);
        if (profile.status !== 'suspended') {
          req.user = decodedToken;
          req.profile = profile;
        }
      } catch {
        // Ignore invalid optional tokens so public endpoints remain accessible
      }
    }
  }
  next();
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.profile) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.profile.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator privileges are required to access this resource.' });
  }
  next();
};
