import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from '../db.js';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth.js';
import { sendEmailVerification, sendPasswordReset } from '../services/email.js';
import { passwordError } from '../utils/password.js';

export const authRouter = Router();
const db = getDb();

const REFRESH_EXPIRY_DAYS = 30;
const RESET_EXPIRY_HOURS = 1;
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_MINUTES = 15;

function getClientIp(req: Request): string {
  // req.ip already accounts for the app's `trust proxy` setting, so it only
  // reflects X-Forwarded-For when that header comes from a trusted hop —
  // unlike reading the header directly, it can't be spoofed by the client.
  return req.ip || 'unknown';
}

async function isRateLimited(username: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000).toISOString();
  const failed = await db.queryOne(
    `SELECT COUNT(*) as count FROM login_attempts
     WHERE username = ? AND ip = ? AND success = false AND created_at >= ?`,
    [username, ip, since]
  );
  return failed.count >= MAX_LOGIN_ATTEMPTS;
}

async function recordLoginAttempt(username: string, ip: string, success: boolean) {
  await db.execute(
    'INSERT INTO login_attempts (username, ip, success, created_at) VALUES (?, ?, ?, NOW())',
    [username, ip, success]
  );
}

authRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const ip = getClientIp(req);

  if (await isRateLimited(username, ip)) {
    return res.status(429).json({
      error: `Too many login attempts. Please try again in ${LOGIN_WINDOW_MINUTES} minutes.`,
    });
  }

  const user = await db.queryOne('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) {
    await recordLoginAttempt(username, ip, false);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    await recordLoginAttempt(username, ip, false);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.email_verified && user.role !== 'admin' && user.role !== 'owner') {
    return res.status(403).json({
      error: 'Please verify your email before signing in.',
      needsVerification: true,
      email: user.email,
    });
  }

  await recordLoginAttempt(username, ip, true);

  const token = generateToken(user);
  const refreshToken = uuid();
  const refreshExpiry = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.execute(
    'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    [uuid(), user.id, refreshToken, refreshExpiry]
  );

  res.json({
    token,
    refreshToken,
    user: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role, hotel_id: user.hotel_id },
  });
});

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  const stored = await db.queryOne(
    'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
    [refreshToken]
  );
  if (!stored) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [stored.user_id]);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Rotate refresh token
  await db.execute('DELETE FROM refresh_tokens WHERE id = ?', [stored.id]);
  const newRefreshToken = uuid();
  const refreshExpiry = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.execute(
    'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    [uuid(), user.id, newRefreshToken, refreshExpiry]
  );

  const token = generateToken(user);
  res.json({ token, refreshToken: newRefreshToken });
});

authRouter.post('/register', async (req: Request, res: Response) => {
  const { username, password, name, email, hotel_name } = req.body;
  if (!username || !password || !name || !email) {
    return res.status(400).json({ error: 'Username, password, name, and email are required' });
  }
  const pwError = passwordError(password);
  if (pwError) return res.status(400).json({ error: pwError });

  const existing = await db.queryOne('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const existingEmail = await db.queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existingEmail) return res.status(409).json({ error: 'Email already registered' });

  const hotelId = uuid();
  const hotelSlug = (hotel_name || `${name}'s Hotel`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  await db.execute(
    `INSERT INTO hotels (id, name, slug) VALUES (?, ?, ?)`,
    [hotelId, hotel_name || `${name}'s Hotel`, hotelSlug]
  );

  const id = uuid();
  const password_hash = bcrypt.hashSync(password, 10);
  await db.execute(
    'INSERT INTO users (id, hotel_id, username, email, password_hash, name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, false)',
    [id, hotelId, username, email, password_hash, name, 'owner']
  );

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await db.execute(
    'INSERT INTO email_verifications (id, user_id, email, token, expires_at) VALUES (?, ?, ?, ?, ?)',
    [uuid(), id, email, verificationToken, expiresAt]
  );

  const freePlan = await db.queryOne("SELECT id FROM subscription_plans WHERE slug = 'free_trial' ORDER BY sort_order ASC LIMIT 1");
  if (freePlan) {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);
    await db.execute(
      `INSERT INTO hotel_subscriptions (id, hotel_id, plan_id, billing_interval, status, trial_ends_at, current_period_starts_at, current_period_ends_at)
       VALUES (?, ?, ?, 'monthly', 'trial', ?, NOW(), ?)`,
      [uuid(), hotelId, freePlan.id, trialEndsAt.toISOString().split('T')[0], trialEndsAt.toISOString().split('T')[0]]
    );
  }

  sendEmailVerification(email, { name, token: verificationToken });

  res.status(201).json({ message: 'Account created. Please check your email to verify your account.' });
});

authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    // Don't reveal whether the email exists
    return res.json({ message: 'If the email exists, a reset link has been generated.' });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
  await db.execute(
    'INSERT INTO password_resets (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    [uuid(), user.id, resetToken, expiresAt]
  );

  sendPasswordReset(email, { name: user.name, token: resetToken });

  res.json({
    message: 'If the email exists, a reset link has been generated.',
  });
});

authRouter.post('/reset-password', async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  const pwError = passwordError(password);
  if (pwError) return res.status(400).json({ error: pwError });

  const reset = await db.queryOne(
    'SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW() AND used = false',
    [token]
  );
  if (!reset) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, reset.user_id]);
  await db.execute('UPDATE password_resets SET used = true WHERE id = ?', [reset.id]);

  // Invalidate all refresh tokens for security
  await db.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [reset.user_id]);

  res.json({ message: 'Password reset successfully' });
});

authRouter.post('/verify-email', async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  const verification = await db.queryOne(
    "SELECT * FROM email_verifications WHERE token = ? AND expires_at > NOW()",
    [token]
  );
  if (!verification) {
    return res.status(400).json({ error: 'Invalid or expired verification token' });
  }

  await db.execute('UPDATE users SET email_verified = true WHERE id = ?', [verification.user_id]);
  await db.execute('DELETE FROM email_verifications WHERE id = ?', [verification.id]);

  res.json({ message: 'Email verified successfully. You can now sign in.' });
});

authRouter.post('/resend-verification', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.json({ message: 'If the email exists, a verification link has been sent.' });
  }

  if (user.email_verified) {
    return res.json({ message: 'Email is already verified.' });
  }

  await db.execute('DELETE FROM email_verifications WHERE user_id = ?', [user.id]);

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await db.execute(
    'INSERT INTO email_verifications (id, user_id, email, token, expires_at) VALUES (?, ?, ?, ?, ?)',
    [uuid(), user.id, email, verificationToken, expiresAt]
  );

  sendEmailVerification(email, { name: user.name, token: verificationToken });

  res.json({ message: 'If the email exists, a verification link has been sent.' });
});

authRouter.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});
