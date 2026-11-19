import {
  AuditLog,
  PaymentRequest,
  PaymentSettings,
  ProxyNode,
  ProxyProtocol,
  ProxyStatus,
  SiteSettings,
  SubscriptionPackage,
  SubscriptionRecord,
  UserProfile,
  UserRole,
  UserStatus,
} from '../types/index.ts';

const TOKEN_STORAGE_KEY = 'mix_nexus_session_token';

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function hydrateUser(raw: any): UserProfile {
  return {
    uid: raw.uid,
    fullName: raw.fullName,
    username: raw.username,
    email: raw.email,
    authProvider: raw.authProvider || 'password',
    role: raw.role,
    status: raw.status,
    emailVerified: Boolean(raw.emailVerified),
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

function hydratePackage(raw: any): SubscriptionPackage {
  return {
    ...raw,
    updatedAt: toDate(raw.updatedAt),
  };
}

function hydrateSiteSettings(raw: any): SiteSettings {
  return {
    ...raw,
    updatedAt: toDate(raw.updatedAt),
  };
}

function hydratePaymentSettings(raw: any): PaymentSettings {
  return {
    ...raw,
    updatedAt: toDate(raw.updatedAt),
  };
}

function hydratePayment(raw: any): PaymentRequest {
  return {
    ...raw,
    reviewedAt: toDate(raw.reviewedAt),
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

function hydrateSubscription(raw: any): SubscriptionRecord {
  return {
    ...raw,
    startsAt: toDate(raw.startsAt) || new Date(),
    expiresAt: toDate(raw.expiresAt) || new Date(),
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

function hydrateProxy(raw: any): ProxyNode {
  return {
    ...raw,
    expiresAt: toDate(raw.expiresAt) || new Date(),
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

function hydrateAudit(raw: any): AuditLog {
  return {
    ...raw,
    createdAt: toDate(raw.createdAt),
  };
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota / private mode issues
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && url !== '/api/auth/login') {
      setStoredToken(null);
    }
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function getEffectiveSubscriptionStatus(sub: SubscriptionRecord): SubscriptionRecord['status'] {
  if (sub.status === 'suspended') return 'suspended';
  if (sub.status === 'pending') return 'pending';
  if (sub.expiresAt && sub.expiresAt.getTime() <= Date.now()) {
    return 'expired';
  }
  return sub.status;
}

export function getDaysRemaining(expiresAt: Date): number {
  const diff = expiresAt.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Public & Auth Endpoints
// ---------------------------------------------------------------------------

export async function fetchBootstrap(): Promise<{
  packages: SubscriptionPackage[];
  siteSettings: SiteSettings;
}> {
  const data = await apiFetch<{ packages: any[]; siteSettings: any }>('/api/bootstrap');
  return {
    packages: data.packages.map(hydratePackage),
    siteSettings: hydrateSiteSettings(data.siteSettings),
  };
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const clean = username.trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,32}$/.test(clean)) return false;
  const res = await apiFetch<{ available: boolean }>(
    `/api/auth/check-username?username=${encodeURIComponent(clean)}`
  );
  return Boolean(res.available);
}

export async function registerAccount(params: {
  fullName: string;
  username: string;
  email: string;
  password: string;
}): Promise<UserProfile> {
  const data = await apiFetch<{ token: string; user: any }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  setStoredToken(data.token);
  return hydrateUser(data.user);
}

export async function loginAccount(params: {
  identifier: string;
  password: string;
  portal?: 'client' | 'admin';
}): Promise<UserProfile> {
  const data = await apiFetch<{ token: string; user: any }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  setStoredToken(data.token);
  return hydrateUser(data.user);
}

export async function logoutAccount(): Promise<void> {
  const token = getStoredToken();
  try {
    if (token) {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    }
  } catch {
    // Always clear local session even if request fails
  } finally {
    setStoredToken(null);
  }
}

export async function requestPasswordReset(
  email: string
): Promise<{ message: string; resetCode?: string }> {
  return apiFetch('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function completePasswordReset(params: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ message: string }> {
  return apiFetch('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ---------------------------------------------------------------------------
// Authenticated Client Workspace
// ---------------------------------------------------------------------------

export async function fetchMyWorkspace(): Promise<{
  user: UserProfile;
  paymentSettings: PaymentSettings;
  payments: PaymentRequest[];
  subscriptions: SubscriptionRecord[];
  proxies: ProxyNode[];
}> {
  const data = await apiFetch<{
    user: any;
    paymentSettings: any;
    payments: any[];
    subscriptions: any[];
    proxies: any[];
  }>('/api/me');

  return {
    user: hydrateUser(data.user),
    paymentSettings: hydratePaymentSettings(data.paymentSettings),
    payments: data.payments.map(hydratePayment),
    subscriptions: data.subscriptions.map(hydrateSubscription),
    proxies: data.proxies.map(hydrateProxy),
  };
}

export async function updateOwnProfile(fullName: string, username: string): Promise<UserProfile> {
  const data = await apiFetch<{ user: any }>('/api/me/profile', {
    method: 'PATCH',
    body: JSON.stringify({ fullName, username }),
  });
  return hydrateUser(data.user);
}

export async function updateOwnPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiFetch('/api/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function submitBinancePayment(params: {
  packageId: string;
  transactionId: string;
  screenshotDataUrl: string;
}): Promise<PaymentRequest> {
  const data = await apiFetch<{ payment: any }>('/api/payments', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return hydratePayment(data.payment);
}

// ---------------------------------------------------------------------------
// Admin Endpoints
// ---------------------------------------------------------------------------

export async function fetchAdminOverview(): Promise<{
  users: UserProfile[];
  payments: PaymentRequest[];
  subscriptions: SubscriptionRecord[];
  proxies: ProxyNode[];
  packages: SubscriptionPackage[];
  siteSettings: SiteSettings;
  paymentSettings: PaymentSettings;
  auditLogs: AuditLog[];
}> {
  const data = await apiFetch<{
    users: any[];
    payments: any[];
    subscriptions: any[];
    proxies: any[];
    packages: any[];
    siteSettings: any;
    paymentSettings: any;
    auditLogs: any[];
  }>('/api/admin/overview');

  return {
    users: data.users.map(hydrateUser),
    payments: data.payments.map(hydratePayment),
    subscriptions: data.subscriptions.map(hydrateSubscription),
    proxies: data.proxies.map(hydrateProxy),
    packages: data.packages.map(hydratePackage),
    siteSettings: hydrateSiteSettings(data.siteSettings),
    paymentSettings: hydratePaymentSettings(data.paymentSettings),
    auditLogs: data.auditLogs.map(hydrateAudit),
  };
}

export async function approvePaymentAndActivateSubscription(params: {
  paymentId: string;
  adminNotes: string;
  proxyId?: string;
}): Promise<void> {
  await apiFetch(`/api/admin/payments/${encodeURIComponent(params.paymentId)}/approve`, {
    method: 'POST',
    body: JSON.stringify({
      adminNotes: params.adminNotes,
      proxyId: params.proxyId || '',
    }),
  });
}

export async function rejectPaymentRequest(params: {
  paymentId: string;
  adminNotes: string;
}): Promise<void> {
  await apiFetch(`/api/admin/payments/${encodeURIComponent(params.paymentId)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ adminNotes: params.adminNotes }),
  });
}

export async function adminUpdateUser(params: {
  uid: string;
  status: UserStatus;
  role?: UserRole;
}): Promise<void> {
  await apiFetch(`/api/admin/users/${encodeURIComponent(params.uid)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: params.status }),
  });
}

export async function adminExtendOrUpdateSubscription(params: {
  id: string;
  newStatus: SubscriptionRecord['status'];
  newExpiresAt: Date;
}): Promise<void> {
  await apiFetch(`/api/admin/subscriptions/${encodeURIComponent(params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: params.newStatus,
      expiresAt: params.newExpiresAt.toISOString(),
    }),
  });
}

export async function adminSaveProxyNode(params: {
  proxyId?: string;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  protocol: ProxyProtocol;
  country: string;
  location: string;
  status: ProxyStatus;
  assignedUserId: string;
  subscriptionId: string;
  expiresAt: Date;
}): Promise<ProxyNode> {
  const data = await apiFetch<{ proxy: any }>('/api/admin/proxies', {
    method: 'POST',
    body: JSON.stringify({
      id: params.proxyId,
      ipAddress: params.ipAddress,
      port: params.port,
      username: params.username,
      password: params.password,
      protocol: params.protocol,
      country: params.country,
      location: params.location,
      status: params.status,
      assignedUserId: params.assignedUserId,
      subscriptionId: params.subscriptionId,
      expiresAt: params.expiresAt.toISOString(),
    }),
  });
  return hydrateProxy(data.proxy);
}

export async function adminDeleteProxyNode(proxyId: string): Promise<void> {
  await apiFetch(`/api/admin/proxies/${encodeURIComponent(proxyId)}`, {
    method: 'DELETE',
  });
}

export async function adminSavePackage(pkg: SubscriptionPackage): Promise<SubscriptionPackage> {
  const data = await apiFetch<{ package: any }>(`/api/admin/packages/${encodeURIComponent(pkg.id)}`, {
    method: 'PUT',
    body: JSON.stringify(pkg),
  });
  return hydratePackage(data.package);
}

export async function adminSaveSiteAndPaymentSettings(params: {
  site: SiteSettings;
  payment: PaymentSettings;
}): Promise<{ siteSettings: SiteSettings; paymentSettings: PaymentSettings }> {
  const data = await apiFetch<{ siteSettings: any; paymentSettings: any }>('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(params),
  });
  return {
    siteSettings: hydrateSiteSettings(data.siteSettings),
    paymentSettings: hydratePaymentSettings(data.paymentSettings),
  };
}

export async function adminLogBackupExport(): Promise<void> {
  await apiFetch('/api/admin/backup-log', { method: 'POST' });
}
