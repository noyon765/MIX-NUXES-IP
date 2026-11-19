import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'mix-nexus-db.json');
const SECRET_FILE = path.join(DATA_DIR, '.session-secret');

interface StoredUser {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  authProvider: 'password';
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StoredPackage {
  id: string;
  name: string;
  durationDays: number;
  durationLabel: string;
  originalPrice: number;
  discountPercent: number;
  finalPrice: number;
  isBestValue: boolean;
  enabled: boolean;
  sortOrder: number;
  features: string[];
  updatedAt: string | null;
}

interface StoredSiteSettings {
  siteName: string;
  tagline: string;
  logoUrl: string;
  heroHeadline: string;
  heroSubheadline: string;
  announcementText: string;
  announcementActive: boolean;
  telegramUsername: string;
  supportInstructions: string;
  updatedAt: string | null;
}

interface StoredPaymentSettings {
  binanceUid: string;
  binanceName: string;
  binanceWalletAddress: string;
  binanceNetwork: string;
  paymentInstructions: string;
  updatedAt: string | null;
}

interface StoredPaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  packageId: string;
  packageName: string;
  durationDays: number;
  originalPrice: number;
  discountPercent: number;
  finalAmount: number;
  binanceUidUsed: string;
  binanceWalletUsed: string;
  transactionId: string;
  screenshotDataUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes: string;
  reviewedBy: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StoredSubscription {
  id: string;
  userId: string;
  userEmail: string;
  paymentId: string;
  packageId: string;
  packageName: string;
  durationDays: number;
  status: 'active' | 'pending' | 'expired' | 'suspended';
  startsAt: string;
  expiresAt: string;
  assignedProxyId: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredProxyNode {
  id: string;
  assignedUserId: string;
  assignedUserEmail: string;
  subscriptionId: string;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  protocol: 'SOCKS5' | 'HTTP' | 'HTTPS' | 'SOCKS5/HTTP';
  country: string;
  location: string;
  status: 'active' | 'inactive' | 'expired';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredAuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

interface StoredResetCode {
  email: string;
  codeHash: string;
  expiresAt: number;
}

interface DatabaseSchema {
  users: StoredUser[];
  packages: StoredPackage[];
  siteSettings: StoredSiteSettings;
  paymentSettings: StoredPaymentSettings;
  payments: StoredPaymentRequest[];
  subscriptions: StoredSubscription[];
  proxies: StoredProxyNode[];
  auditLogs: StoredAuditLog[];
  revokedTokens: string[];
  resetCodes: StoredResetCode[];
}

interface AuthedRequest extends Request {
  authUser?: StoredUser;
  authToken?: string;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }
  ensureDataDir();
  if (fs.existsSync(SECRET_FILE)) {
    const existing = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    if (existing.length >= 32) return existing;
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
  return generated;
}

const SESSION_SECRET = getSessionSecret();

function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function createSessionToken(user: StoredUser): string {
  const payload = {
    uid: user.uid,
    role: user.role,
    jti: crypto.randomBytes(8).toString('hex'),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 14, // 14 days
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token: string, db: DatabaseSchema): StoredUser | null {
  if (!token || !token.includes('.')) return null;
  if (db.revokedTokens.includes(token)) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      uid?: string;
      exp?: number;
    };
    if (!parsed.uid || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return db.users.find((u) => u.uid === parsed.uid) || null;
  } catch {
    return null;
  }
}

function defaultSeed(): DatabaseSchema {
  const now = new Date().toISOString();
  const adminPass = hashPassword(process.env.ADMIN_BOOTSTRAP_PASSWORD || 'Noyon5522');
  const adminUsername = (process.env.ADMIN_BOOTSTRAP_USERNAME || 'noyon5522').toLowerCase();

  return {
    users: [
      {
        uid: 'usr_admin_primary',
        fullName: 'Administrator',
        username: adminUsername,
        email: 'admin@mixnexus.ip',
        passwordHash: adminPass.hash,
        passwordSalt: adminPass.salt,
        authProvider: 'password',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    packages: [
      {
        id: '1-month',
        name: '1 Month',
        durationDays: 30,
        durationLabel: '30 Days Access',
        originalPrice: 5,
        discountPercent: 20,
        finalPrice: 4,
        isBestValue: false,
        enabled: true,
        sortOrder: 1,
        features: [
          'Dedicated private IPv4 assignment',
          'SOCKS5 & HTTP(S) dual-protocol support',
          'Automated expiration tracking',
          'Telegram customer support access',
        ],
        updatedAt: now,
      },
      {
        id: '2-months',
        name: '2 Months',
        durationDays: 60,
        durationLabel: '60 Days Access',
        originalPrice: 10,
        discountPercent: 30,
        finalPrice: 7,
        isBestValue: false,
        enabled: true,
        sortOrder: 2,
        features: [
          'Dedicated private IPv4 assignment',
          'SOCKS5 & HTTP(S) dual-protocol support',
          'Zero shared bandwidth throttling',
          'Priority Telegram support queue',
        ],
        updatedAt: now,
      },
      {
        id: '6-months',
        name: '6 Months',
        durationDays: 180,
        durationLabel: '180 Days Access',
        originalPrice: 30,
        discountPercent: 40,
        finalPrice: 18,
        isBestValue: false,
        enabled: true,
        sortOrder: 3,
        features: [
          'Long-term static IP continuity',
          'SOCKS5 & HTTP(S) dual-protocol support',
          'Expiration reminders prior to renewal',
          'Direct Telegram technical onboarding',
        ],
        updatedAt: now,
      },
      {
        id: '1-year',
        name: '1 Year',
        durationDays: 365,
        durationLabel: '365 Days Access',
        originalPrice: 60,
        discountPercent: 50,
        finalPrice: 30,
        isBestValue: true,
        enabled: true,
        sortOrder: 4,
        features: [
          '50% annual savings locked for 365 days',
          'Dedicated static IPv4 & credential vault',
          'SOCKS5 & HTTP(S) dual-protocol support',
          'Highest priority Telegram support channel',
        ],
        updatedAt: now,
      },
    ],
    siteSettings: {
      siteName: 'MIX NEXUS IP',
      tagline: 'Premium Connectivity. Simplified.',
      logoUrl: '',
      heroHeadline: 'Dedicated IP & Proxy Infrastructure Built for Reliability.',
      heroSubheadline:
        'Provision private proxy endpoints with transparent Binance settlement, verified manual node assignment, and real-time subscription lifecycle control.',
      announcementText: '',
      announcementActive: false,
      telegramUsername: 'MIX_NEXUS_IP_SUPPORT',
      supportInstructions:
        'Send your account email and Binance Transaction ID when messaging our Telegram desk (@MIX_NEXUS_IP_SUPPORT) so an operator can locate your order immediately.',
      updatedAt: now,
    },
    paymentSettings: {
      binanceUid: '944991131',
      binanceName: 'User-b4d404',
      binanceWalletAddress: 'TGVLkJBhD3zaiN67PTC9ZUQeEgXFGSk8v5',
      binanceNetwork: 'USDT (TRC20)',
      paymentInstructions:
        'Transfer the exact Final Payable Amount using Binance Pay (UID: 944991131 · Name: User-b4d404) or USDT TRC20 Wallet Address. Upload a clear screenshot of the completed transfer along with your Transaction ID. Subscriptions activate only after manual administrator verification.',
      updatedAt: now,
    },
    payments: [],
    subscriptions: [],
    proxies: [],
    auditLogs: [],
    revokedTokens: [],
    resetCodes: [],
  };
}

function loadDb(): DatabaseSchema {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const seed = defaultSeed();
    saveDb(seed);
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    const seed = defaultSeed();
    const db: DatabaseSchema = {
      users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : seed.users,
      packages: Array.isArray(parsed.packages) && parsed.packages.length > 0 ? parsed.packages : seed.packages,
      siteSettings: parsed.siteSettings || seed.siteSettings,
      paymentSettings: parsed.paymentSettings || seed.paymentSettings,
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
      proxies: Array.isArray(parsed.proxies) ? parsed.proxies : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      revokedTokens: Array.isArray(parsed.revokedTokens) ? parsed.revokedTokens : [],
      resetCodes: Array.isArray(parsed.resetCodes) ? parsed.resetCodes : [],
    };
    // Ensure at least one admin exists
    if (!db.users.some((u) => u.role === 'admin')) {
      db.users.unshift(seed.users[0]);
      saveDb(db);
    }
    return db;
  } catch {
    const seed = defaultSeed();
    saveDb(seed);
    return seed;
  }
}

function saveDb(db: DatabaseSchema): void {
  ensureDataDir();
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

function sanitizeUser(user: StoredUser) {
  return {
    uid: user.uid,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    authProvider: user.authProvider,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function appendAudit(
  db: DatabaseSchema,
  actor: StoredUser,
  action: string,
  targetType: string,
  targetId: string,
  details: string
): void {
  db.auditLogs.unshift({
    id: makeId('log'),
    actorUid: actor.uid,
    actorEmail: 'Administrator',
    action: action.slice(0, 80),
    targetType: targetType.slice(0, 40),
    targetId: targetId.slice(0, 128),
    details: details.slice(0, 500),
    createdAt: new Date().toISOString(),
  });
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
}

function extractBearer(req: Request): string {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return '';
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = extractBearer(req);
  const db = loadDb();
  const user = verifySessionToken(token, db);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  req.authUser = user;
  req.authToken = token;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.authUser || req.authUser.role !== 'admin') {
      res.status(403).json({ error: 'Administrator privileges required.' });
      return;
    }
    next();
  });
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Ensure initial DB exists on startup
  loadDb();

  // Public bootstrap (packages + public site settings)
  app.get('/api/bootstrap', (_req, res) => {
    const db = loadDb();
    const sortedPackages = [...db.packages].sort((a, b) => a.sortOrder - b.sortOrder);
    res.json({
      packages: sortedPackages,
      siteSettings: db.siteSettings,
    });
  });

  // Username availability check
  app.get('/api/auth/check-username', (req, res) => {
    const raw = String(req.query.username || '').trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,32}$/.test(raw)) {
      res.json({ available: false });
      return;
    }
    const db = loadDb();
    const taken = db.users.some((u) => u.username.toLowerCase() === raw);
    res.json({ available: !taken });
  });

  // Register client account
  app.post('/api/auth/register', (req, res) => {
    const fullName = String(req.body?.fullName || '').trim();
    const username = String(req.body?.username || '').trim().toLowerCase();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (fullName.length < 2 || fullName.length > 100) {
      res.status(400).json({ error: 'Full name must be between 2 and 100 characters.' });
      return;
    }
    if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
      res.status(400).json({ error: 'Username must be 3–32 characters using letters, numbers, dots, underscores, or hyphens.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    const db = loadDb();
    if (db.users.some((u) => u.username.toLowerCase() === username)) {
      res.status(409).json({ error: 'This username is already taken. Choose another one.' });
      return;
    }
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });
      return;
    }

    const { hash, salt } = hashPassword(password);
    const now = new Date().toISOString();
    const newUser: StoredUser = {
      uid: makeId('usr'),
      fullName,
      username,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      authProvider: 'password',
      role: 'user',
      status: 'active',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    };

    db.users.unshift(newUser);
    saveDb(db);

    const token = createSessionToken(newUser);
    res.status(201).json({
      token,
      user: sanitizeUser(newUser),
    });
  });

  // Login (client or admin)
  app.post('/api/auth/login', (req, res) => {
    const identifier = String(req.body?.identifier || req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const portal = req.body?.portal === 'admin' ? 'admin' : 'client';

    if (!identifier || !password) {
      res.status(400).json({ error: 'Enter both your username/email and password.' });
      return;
    }

    const db = loadDb();
    const user = db.users.find(
      (u) => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier
    );

    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Invalid credentials. Please verify your username/email and password.' });
      return;
    }

    if (portal === 'admin' && user.role !== 'admin') {
      res.status(403).json({ error: 'This account does not have administrator permissions.' });
      return;
    }

    if (user.status === 'suspended' && user.role !== 'admin') {
      // Allow user to log into dashboard so they can see suspended banner & support link
    }

    const token = createSessionToken(user);
    res.json({
      token,
      user: sanitizeUser(user),
    });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const token = extractBearer(req);
    if (token) {
      const db = loadDb();
      if (!db.revokedTokens.includes(token)) {
        db.revokedTokens.push(token);
        if (db.revokedTokens.length > 500) {
          db.revokedTokens = db.revokedTokens.slice(-500);
        }
        saveDb(db);
      }
    }
    res.json({ ok: true });
  });

  // Password reset request (generates short-lived 6-digit recovery code)
  app.post('/api/auth/forgot-password', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }

    const db = loadDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email && u.role !== 'admin');
    if (!user) {
      // Do not reveal account existence or admin email details
      res.json({ ok: true, message: 'If an eligible client account matches that email, a reset code has been generated.' });
      return;
    }

    const code = String(crypto.randomInt(100000, 999999));
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    db.resetCodes = db.resetCodes.filter((r) => r.email !== email && r.expiresAt > Date.now());
    db.resetCodes.push({
      email,
      codeHash,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    saveDb(db);

    res.json({
      ok: true,
      resetCode: code,
      message: 'Verification code issued. Enter the code below along with your new password.',
    });
  });

  // Complete password reset
  app.post('/api/auth/reset-password', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!email || !code || newPassword.length < 8) {
      res.status(400).json({ error: 'Provide email, 6-digit code, and a password of at least 8 characters.' });
      return;
    }

    const db = loadDb();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const match = db.resetCodes.find(
      (r) => r.email === email && r.codeHash === codeHash && r.expiresAt > Date.now()
    );
    if (!match) {
      res.status(400).json({ error: 'Invalid or expired reset code.' });
      return;
    }

    const user = db.users.find((u) => u.email.toLowerCase() === email && u.role !== 'admin');
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }

    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    user.updatedAt = new Date().toISOString();
    db.resetCodes = db.resetCodes.filter((r) => r.email !== email);
    saveDb(db);

    res.json({ ok: true, message: 'Password updated successfully. You may now sign in.' });
  });

  // Authenticated user workspace state
  app.get('/api/me', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const db = loadDb();
    const payments = db.payments
      .filter((p) => p.userId === user.uid)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const subscriptions = db.subscriptions
      .filter((s) => s.userId === user.uid)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const proxies = db.proxies
      .filter((p) => p.assignedUserId === user.uid)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json({
      user: sanitizeUser(user),
      paymentSettings: db.paymentSettings,
      payments,
      subscriptions,
      proxies,
    });
  });

  // Update own profile
  app.patch('/api/me/profile', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const fullName = String(req.body?.fullName || '').trim();
    const username = String(req.body?.username || '').trim().toLowerCase();

    if (fullName.length < 2 || fullName.length > 100) {
      res.status(400).json({ error: 'Full name must be between 2 and 100 characters.' });
      return;
    }
    if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
      res.status(400).json({ error: 'Username must be 3–32 characters (letters, numbers, ., _, -).' });
      return;
    }

    const db = loadDb();
    const target = db.users.find((u) => u.uid === user.uid);
    if (!target) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }

    if (
      username !== target.username.toLowerCase() &&
      db.users.some((u) => u.uid !== target.uid && u.username.toLowerCase() === username)
    ) {
      res.status(409).json({ error: 'Username is already in use.' });
      return;
    }

    target.fullName = fullName;
    target.username = username;
    target.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({ user: sanitizeUser(target) });
  });

  // Change own password
  app.patch('/api/me/password', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      return;
    }

    const db = loadDb();
    const target = db.users.find((u) => u.uid === user.uid);
    if (!target) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }

    if (!verifyPassword(currentPassword, target.passwordHash, target.passwordSalt)) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }

    const { hash, salt } = hashPassword(newPassword);
    target.passwordHash = hash;
    target.passwordSalt = salt;
    target.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({ ok: true });
  });

  // Submit Binance payment request
  app.post('/api/payments', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    if (user.status === 'suspended') {
      res.status(403).json({ error: 'Your account is currently suspended.' });
      return;
    }

    const packageId = String(req.body?.packageId || '').trim();
    const transactionId = String(req.body?.transactionId || '').trim();
    const screenshotDataUrl = String(req.body?.screenshotDataUrl || '').trim();

    if (transactionId.length < 4 || transactionId.length > 120) {
      res.status(400).json({ error: 'Transaction ID must be between 4 and 120 characters.' });
      return;
    }
    if (screenshotDataUrl.length < 20 || screenshotDataUrl.length > 650000) {
      res.status(400).json({ error: 'Valid payment screenshot is required.' });
      return;
    }

    const db = loadDb();
    const pkg = db.packages.find((p) => p.id === packageId && p.enabled);
    if (!pkg) {
      res.status(404).json({ error: 'Selected package not found or unavailable.' });
      return;
    }

    const now = new Date().toISOString();
    const payment: StoredPaymentRequest = {
      id: makeId('pay'),
      userId: user.uid,
      userEmail: user.email,
      userName: user.fullName,
      packageId: pkg.id,
      packageName: pkg.name,
      durationDays: pkg.durationDays,
      originalPrice: pkg.originalPrice,
      discountPercent: pkg.discountPercent,
      finalAmount: pkg.finalPrice,
      binanceUidUsed: db.paymentSettings.binanceUid,
      binanceWalletUsed: db.paymentSettings.binanceWalletAddress,
      transactionId,
      screenshotDataUrl,
      status: 'pending',
      adminNotes: '',
      reviewedBy: '',
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    db.payments.unshift(payment);
    saveDb(db);
    res.status(201).json({ payment });
  });

  // Admin: full workspace data (excludes exposing admin credentials)
  app.get('/api/admin/overview', requireAdmin, (_req: AuthedRequest, res) => {
    const db = loadDb();
    const clientUsers = db.users
      .filter((u) => u.role !== 'admin')
      .map(sanitizeUser)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    res.json({
      users: clientUsers,
      payments: [...db.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      subscriptions: [...db.subscriptions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      proxies: [...db.proxies].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      packages: [...db.packages].sort((a, b) => a.sortOrder - b.sortOrder),
      siteSettings: db.siteSettings,
      paymentSettings: db.paymentSettings,
      auditLogs: db.auditLogs.slice(0, 150),
    });
  });

  // Admin: approve payment & activate subscription
  app.post('/api/admin/payments/:id/approve', requireAdmin, (req: AuthedRequest, res) => {
    const admin = req.authUser!;
    const paymentId = String(req.params.id);
    const adminNotes = String(req.body?.adminNotes || '').trim().slice(0, 500);
    const proxyIdToAssign = String(req.body?.proxyId || '').trim();

    const db = loadDb();
    const payment = db.payments.find((p) => p.id === paymentId);
    if (!payment) {
      res.status(404).json({ error: 'Payment request not found.' });
      return;
    }
    if (payment.status !== 'pending') {
      res.status(400).json({ error: 'Payment request has already been processed.' });
      return;
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const expiresIso = new Date(nowMs + payment.durationDays * 24 * 60 * 60 * 1000).toISOString();
    const subId = makeId('sub');

    let assignedProxyId = '';
    if (proxyIdToAssign) {
      const proxy = db.proxies.find((p) => p.id === proxyIdToAssign);
      if (proxy) {
        proxy.assignedUserId = payment.userId;
        proxy.assignedUserEmail = payment.userEmail;
        proxy.subscriptionId = subId;
        proxy.status = 'active';
        proxy.expiresAt = expiresIso;
        proxy.updatedAt = nowIso;
        assignedProxyId = proxy.id;
      }
    }

    payment.status = 'approved';
    payment.adminNotes = adminNotes;
    payment.reviewedBy = 'Administrator';
    payment.reviewedAt = nowIso;
    payment.updatedAt = nowIso;

    db.subscriptions.unshift({
      id: subId,
      userId: payment.userId,
      userEmail: payment.userEmail,
      paymentId: payment.id,
      packageId: payment.packageId,
      packageName: payment.packageName,
      durationDays: payment.durationDays,
      status: 'active',
      startsAt: nowIso,
      expiresAt: expiresIso,
      assignedProxyId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    appendAudit(
      db,
      admin,
      'APPROVE_PAYMENT',
      'payment',
      payment.id,
      `Approved ${payment.packageName} ($${payment.finalAmount}) for ${payment.userEmail}. TxID: ${payment.transactionId}`
    );
    saveDb(db);
    res.json({ ok: true });
  });

  // Admin: reject payment
  app.post('/api/admin/payments/:id/reject', requireAdmin, (req: AuthedRequest, res) => {
    const admin = req.authUser!;
    const paymentId = String(req.params.id);
    const adminNotes = String(req.body?.adminNotes || '').trim().slice(0, 500) || 'Payment could not be verified.';

    const db = loadDb();
    const payment = db.payments.find((p) => p.id === paymentId);
    if (!payment) {
      res.status(404).json({ error: 'Payment request not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    payment.status = 'rejected';
    payment.adminNotes = adminNotes;
    payment.reviewedBy = 'Administrator';
    payment.reviewedAt = nowIso;
    payment.updatedAt = nowIso;

    appendAudit(
      db,
      admin,
      'REJECT_PAYMENT',
      'payment',
      payment.id,
      `Rejected ${payment.packageName} for ${payment.userEmail}. Reason: ${adminNotes}`
    );
    saveDb(db);
    res.json({ ok: true });
  });

  // Admin: suspend / activate client user
  app.patch('/api/admin/users/:uid', requireAdmin, (req: AuthedRequest, res) => {
    const admin = req.authUser!;
    const targetUid = String(req.params.uid);
    const status = req.body?.status === 'suspended' ? 'suspended' : 'active';

    const db = loadDb();
    const target = db.users.find((u) => u.uid === targetUid && u.role !== 'admin');
    if (!target) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    target.status = status;
    target.updatedAt = new Date().toISOString();
    appendAudit(db, admin, 'UPDATE_USER', 'user', target.uid, `Updated ${target.email} -> status: ${status}`);
    saveDb(db);
    res.json({ ok: true });
  });

  // Admin: update / extend subscription
  app.patch('/api/admin/subscriptions/:id', requireAdmin, (req: AuthedRequest, res) => {
    const admin = req.authUser!;
    const subId = String(req.params.id);
    const newStatus = req.body?.status;
    const newExpiresAt = String(req.body?.expiresAt || '');

    if (!['active', 'pending', 'expired', 'suspended'].includes(newStatus)) {
      res.status(400).json({ error: 'Invalid subscription status.' });
      return;
    }

    const db = loadDb();
    const sub = db.subscriptions.find((s) => s.id === subId);
    if (!sub) {
      res.status(404).json({ error: 'Subscription not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    sub.status = newStatus;
    if (newExpiresAt) {
      sub.expiresAt = new Date(newExpiresAt).toISOString();
    }
    sub.updatedAt = nowIso;

    if (sub.assignedProxyId) {
      const proxy = db.proxies.find((p) => p.id === sub.assignedProxyId);
      if (proxy) {
        proxy.status = newStatus === 'active' ? 'active' : newStatus === 'expired' ? 'expired' : 'inactive';
        proxy.expiresAt = sub.expiresAt;
        proxy.updatedAt = nowIso;
      }
    }

    appendAudit(
      db,
      admin,
      'UPDATE_SUBSCRIPTION',
      'subscription',
      sub.id,
      `Set ${sub.userEmail} (${sub.packageName}) status=${sub.status}, expires=${sub.expiresAt.slice(0, 10)}`
    );
    saveDb(db);
    res.json({ ok: true });
  });

  // Admin: save or create proxy node
  app.post('/api/admin/proxies', requireAdmin, (req: AuthedRequest, res) => {
    const admin = req.authUser!;
    const proxyId = req.body?.id ? String(req.body.id) : makeId('prx');
    const ipAddress = String(req.body?.ipAddress || '').trim().slice(0, 80);
    const port = Math.min(65535, Math.max(1, Number(req.body?.port || 1080)));
    const username = String(req.body?.username || '').trim().slice(0, 80);
    const password = String(req.body?.password || '').trim().slice(0, 120);
    const protocol = (['SOCKS5', 'HTTP', 'HTTPS', 'SOCKS5/HTTP'].includes(req.body?.protocol)
      ? req.body.protocol
      : 'SOCKS5') as StoredProxyNode['protocol'];
    const country = String(req.body?.country || '').trim().slice(0, 60);
    const location = String(req.body?.location || '').trim().slice(0, 80);
    const status = (['active', 'inactive', 'expired'].includes(req.body?.status)
      ? req.body.status
      : 'active') as StoredProxyNode['status'];
    const assignedUserId = String(req.body?.assignedUserId || '').trim();
    const subscriptionId = String(req.body?.subscriptionId || '').trim();
    const expiresAt = new Date(req.body?.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (ipAddress.length < 3 || !username || !password || country.length < 2 || location.length < 2) {
      res.status(400).json({ error: 'Complete all required proxy host, credential, and location fields.' });
      return;
    }

    const db = loadDb();
    const assignedUser = db.users.find((u) => u.uid === assignedUserId && u.role !== 'admin');
    const nowIso = new Date().toISOString();
    const existing = db.proxies.find((p) => p.id === proxyId);

    const record: StoredProxyNode = {
      id: proxyId,
      assignedUserId: assignedUser ? assignedUser.uid : '',
      assignedUserEmail: assignedUser ? assignedUser.email : '',
      subscriptionId,
      ipAddress,
      port,
      username,
      password,
      protocol,
      country,
      location,
      status,
      expiresAt,
      createdAt: existing ? existing.createdAt : nowIso,
      updatedAt: nowIso,
    };

    if (existing) {
      Object.assign(existing, record);
    } else {
      db.proxies.unshift(record);
    }

    appendAudit(
      db,
      admin,
      existing ? 'UPDATE_PROXY' : 'CREATE_PROXY',
      'proxy',
      proxyId,
      `${ipAddress}:${port} (${protocol}) assigned to ${record.assignedUserEmail || 'unassigned pool'}`
    );
    saveDb(db);
    res.json({ proxy: record });
  });

  // Admin: delete proxy node
  app.delete('/api/admin/proxies/:id', requireAdmin, (req: AuthedRequest, res) => {
    const admin = req.authUser!;
    const proxyId = String(req.params.id);
    const db = loadDb();
    const idx = db.proxies.findIndex((p) => p.id === proxyId);
    if (idx === -1) {
      res.status(404).json({ error: 'Proxy node not found.' });
      return;
    }
    const [removed] = db.proxies.splice(idx, 1);
    appendAudit(db, admin, 'DELETE_PROXY', 'proxy', proxyId, `Deleted proxy ${removed.ipAddress}:${removed.port}`);
    saveDb(db);
    res.json({ ok: true });
  });

  // Admin: save package
  app.put('/api/admin/packages/:id', requireAdmin, (req: AuthedRequest, res) => {
    const admin = req.authUser!;
    const packageId = String(req.params.id);
    const db = loadDb();
    const pkg = db.packages.find((p) => p.id === packageId);
    if (!pkg) {
      res.status(404).json({ error: 'Package not found.' });
      return;
    }

    const durationDays = Math.max(1, Number(req.body?.durationDays || pkg.durationDays));
    pkg.name = String(req.body?.name || pkg.name).trim().slice(0, 60);
    pkg.durationDays = durationDays;
    pkg.durationLabel = `${durationDays} Days Access`;
    pkg.originalPrice = Math.max(0, Number(req.body?.originalPrice ?? pkg.originalPrice));
    pkg.discountPercent = Math.min(99, Math.max(0, Number(req.body?.discountPercent ?? pkg.discountPercent)));
    pkg.finalPrice = Math.max(0, Number(req.body?.finalPrice ?? pkg.finalPrice));
    pkg.isBestValue = Boolean(req.body?.isBestValue);
    pkg.enabled = Boolean(req.body?.enabled);
    pkg.features = Array.isArray(req.body?.features)
      ? req.body.features.map((f: unknown) => String(f).trim().slice(0, 100)).filter(Boolean).slice(0, 8)
      : pkg.features;
    pkg.updatedAt = new Date().toISOString();

    appendAudit(
      db,
      admin,
      'UPDATE_PACKAGE',
      'package',
      pkg.id,
      `Updated ${pkg.name}: $${pkg.finalPrice} (${pkg.discountPercent}% off ${pkg.originalPrice})`
    );
    saveDb(db);
    res.json({ package: pkg });
  });

  // Admin: save site & Binance settings
  app.put('/api/admin/settings', requireAdmin, (req: AuthedRequest, res) => {
    const admin = req.authUser!;
    const site = req.body?.site || {};
    const payment = req.body?.payment || {};
    const db = loadDb();
    const nowIso = new Date().toISOString();

    db.siteSettings = {
      siteName: String(site.siteName || db.siteSettings.siteName).trim().slice(0, 60),
      tagline: String(site.tagline || db.siteSettings.tagline).trim().slice(0, 120),
      logoUrl: String(site.logoUrl ?? db.siteSettings.logoUrl).trim(),
      heroHeadline: String(site.heroHeadline || db.siteSettings.heroHeadline).trim().slice(0, 160),
      heroSubheadline: String(site.heroSubheadline || db.siteSettings.heroSubheadline).trim().slice(0, 400),
      announcementText: String(site.announcementText ?? db.siteSettings.announcementText).trim().slice(0, 300),
      announcementActive: Boolean(site.announcementActive),
      telegramUsername: String(site.telegramUsername || db.siteSettings.telegramUsername)
        .trim()
        .replace(/^@+/, '')
        .slice(0, 64),
      supportInstructions: String(site.supportInstructions ?? db.siteSettings.supportInstructions)
        .trim()
        .slice(0, 600),
      updatedAt: nowIso,
    };

    db.paymentSettings = {
      binanceUid: String(payment.binanceUid || db.paymentSettings.binanceUid).trim().slice(0, 64),
      binanceName: String(payment.binanceName || db.paymentSettings.binanceName).trim().slice(0, 80),
      binanceWalletAddress: String(payment.binanceWalletAddress || db.paymentSettings.binanceWalletAddress)
        .trim()
        .slice(0, 128),
      binanceNetwork: String(payment.binanceNetwork || db.paymentSettings.binanceNetwork).trim().slice(0, 40),
      paymentInstructions: String(payment.paymentInstructions ?? db.paymentSettings.paymentInstructions)
        .trim()
        .slice(0, 800),
      updatedAt: nowIso,
    };

    appendAudit(db, admin, 'UPDATE_SETTINGS', 'settings', 'site_payment', 'Updated website, Binance, and Telegram settings');
    saveDb(db);
    res.json({
      siteSettings: db.siteSettings,
      paymentSettings: db.paymentSettings,
    });
  });

  // Admin: log backup export
  app.post('/api/admin/backup-log', requireAdmin, (req: AuthedRequest, res) => {
    const admin = req.authUser!;
    const db = loadDb();
    appendAudit(db, admin, 'EXPORT_BACKUP', 'system', 'backup', 'Exported database snapshot JSON');
    saveDb(db);
    res.json({ ok: true });
  });

  // Frontend serving (Vite dev middleware in development, dist/ static in production)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`MIX NEXUS IP server listening on port ${port}`);
  });
}

void startServer();
