import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = process.env.JWT_SECRET;

const roleHierarchy: Record<string, number> = {
  housekeeping: 1,
  receptionist: 2,
  accountant: 3,
  manager: 4,
  owner: 5,
  admin: 5,
};

export const ROLES = {
  HOUSEKEEPING: 'housekeeping',
  RECEPTIONIST: 'receptionist',
  ACCOUNTANT: 'accountant',
  MANAGER: 'manager',
  OWNER: 'owner',
  ADMIN: 'admin',
} as const;

export interface AuthRequest extends Request {
  user?: { id: string; username: string; role: string; name: string; email: string; hotel_id: string };
}

export function generateToken(user: { id: string; username: string; role: string; name: string; email: string; hotel_id: string }) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.name, email: user.email, hotel_id: user.hotel_id }, JWT_SECRET, { expiresIn: '24h' });
}

export function generateInvitationToken(payload: { hotel_id: string; email: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role, name: decoded.name, email: decoded.email, hotel_id: decoded.hotel_id };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
    return res.status(403).json({ error: 'Admin or owner access required' });
  }
  next();
}

export function hasMinRole(userRole: string, minRole: string): boolean {
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[minRole] || 0);
}
