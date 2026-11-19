export type AuthProviderType = 'google' | 'password';
export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'suspended';
export type ProxyProtocol = 'SOCKS5' | 'HTTP' | 'HTTPS' | 'SOCKS5/HTTP';
export type ProxyStatus = 'active' | 'inactive' | 'expired';

export interface UserProfile {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  authProvider: AuthProviderType;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SubscriptionPackage {
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
  updatedAt: Date | null;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  logoUrl: string;
  heroHeadline: string;
  heroSubheadline: string;
  announcementText: string;
  announcementActive: boolean;
  telegramUsername: string;
  supportInstructions: string;
  updatedAt: Date | null;
}

export interface PaymentSettings {
  binanceUid: string;
  binanceName: string;
  binanceWalletAddress: string;
  binanceNetwork: string;
  paymentInstructions: string;
  updatedAt: Date | null;
}

export interface PaymentRequest {
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
  status: PaymentStatus;
  adminNotes: string;
  reviewedBy: string;
  reviewedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  userEmail: string;
  paymentId: string;
  packageId: string;
  packageName: string;
  durationDays: number;
  status: SubscriptionStatus;
  startsAt: Date;
  expiresAt: Date;
  assignedProxyId: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ProxyNode {
  id: string;
  assignedUserId: string;
  assignedUserEmail: string;
  subscriptionId: string;
  ipAddress: string;
  port: number;
  username: string;
  password: string;
  protocol: ProxyProtocol;
  country: string;
  location: string;
  status: ProxyStatus;
  expiresAt: Date;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: Date | null;
}

export type AppView = 'landing' | 'auth' | 'checkout' | 'dashboard' | 'admin';
export type AuthMode = 'login' | 'register' | 'forgot' | 'admin';
export type DashboardTab = 'overview' | 'proxy' | 'billing' | 'support' | 'settings';
export type AdminTab = 'overview' | 'payments' | 'users' | 'proxies' | 'packages' | 'settings' | 'audit';
