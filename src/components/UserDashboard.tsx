import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  getDaysRemaining,
  getEffectiveSubscriptionStatus,
  logoutAccount,
  updateOwnPassword,
  updateOwnProfile,
} from '../services/apiService.ts';
import {
  DashboardTab,
  PaymentRequest,
  ProxyNode,
  SiteSettings,
  SubscriptionPackage,
  SubscriptionRecord,
  UserProfile,
} from '../types/index.ts';
import { BinanceLogo } from './BinanceLogo.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface UserDashboardProps {
  user: UserProfile;
  siteSettings: SiteSettings;
  packages: SubscriptionPackage[];
  payments: PaymentRequest[];
  subscriptions: SubscriptionRecord[];
  proxies: ProxyNode[];
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onSelectPackage: (pkg: SubscriptionPackage) => void;
  onOpenAdmin: () => void;
  onProfileUpdated: (user: UserProfile) => void;
  onLoggedOut: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  siteSettings,
  packages,
  payments,
  subscriptions,
  proxies,
  activeTab,
  onTabChange,
  onSelectPackage,
  onOpenAdmin,
  onProfileUpdated,
  onLoggedOut,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);

  // Account Settings form
  const [editFullName, setEditFullName] = useState(user.fullName);
  const [editUsername, setEditUsername] = useState(user.username);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  const [profileError, setProfileError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [confirmAccountPassword, setConfirmAccountPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setEditFullName(user.fullName);
    setEditUsername(user.username);
  }, [user.fullName, user.username]);

  const telegramHandle = siteSettings.telegramUsername.replace(/^@+/, '');
  const telegramHref = `https://t.me/${telegramHandle}`;

  const enrichedSubs = subscriptions.map((s) => ({
    ...s,
    effectiveStatus: getEffectiveSubscriptionStatus(s),
    daysRemaining: getDaysRemaining(s.expiresAt),
  }));

  const activeSub = enrichedSubs.find((s) => s.effectiveStatus === 'active') || null;
  const expiringSoonSub =
    activeSub && activeSub.daysRemaining > 0 && activeSub.daysRemaining <= 7 ? activeSub : null;
  const pendingPayment = payments.find((p) => p.status === 'pending') || null;
  const enabledPackages = packages.filter((p) => p.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleLogout = async () => {
    await logoutAccount();
    onLoggedOut();
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileNotice('');
    setSavingProfile(true);
    try {
      const updated = await updateOwnProfile(editFullName, editUsername);
      onProfileUpdated(updated);
      setProfileNotice('Account details updated.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordNotice('');
    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (newAccountPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newAccountPassword !== confirmAccountPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await updateOwnPassword(currentPassword, newAccountPassword);
      setCurrentPassword('');
      setNewAccountPassword('');
      setConfirmAccountPassword('');
      setPasswordNotice('Account password updated successfully.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const renderStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status === 'approved' ? 'Approved' : 'Active'}
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            Pending Verification
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            Expired
          </span>
        );
      case 'suspended':
      case 'rejected':
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400">
            <XCircle className="w-3.5 h-3.5" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  const navItems: { id: DashboardTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'proxy', label: 'My Proxy', icon: Server },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'support', label: 'Support', icon: MessageCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#07090E] bg-luxury-mesh pb-24 lg:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex lg:col-span-3 flex-col justify-between glass-surface rounded-2xl p-5 h-fit sticky top-24 space-y-6">
            <div className="space-y-6">
              <div className="space-y-1 pb-4 border-b border-white/10">
                <p className="text-xs text-slate-400">Client Workspace</p>
                <p className="text-base font-semibold text-white truncate">{user.fullName}</p>
                <p className="text-xs font-mono text-slate-400 truncate">@{user.username}</p>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                        active ? 'text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="userSidebarPill"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-600/20"
                        />
                      )}
                      <Icon className="w-4 h-4 shrink-0 relative z-10" />
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-2 pt-4 border-t border-white/10">
              {user.role === 'admin' && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-violet-950/60 border border-violet-500/30 hover:bg-violet-900/50 text-violet-200 text-sm font-medium transition-colors min-h-[44px]"
                >
                  <span className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-violet-400" />
                    Admin Panel
                  </span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors min-h-[44px]"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </aside>

          {/* Main Workspace Viewport */}
          <main className="lg:col-span-9 space-y-6">
            {/* Suspended Banner */}
            {user.status === 'suspended' && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white">Account Suspended</p>
                    <p className="text-xs text-rose-200 mt-0.5">
                      New purchases and proxy access are paused. Contact Telegram support for assistance.
                    </p>
                  </div>
                </div>
                <a
                  href={telegramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium whitespace-nowrap shrink-0"
                >
                  Contact Support
                </a>
              </div>
            )}

            {/* Expiring Soon Alert */}
            {expiringSoonSub && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Subscription Expiring in {expiringSoonSub.daysRemaining} Day{expiringSoonSub.daysRemaining === 1 ? '' : 's'}
                    </p>
                    <p className="text-xs text-amber-200 mt-0.5">
                      Renew your {expiringSoonSub.packageName} plan before{' '}
                      {expiringSoonSub.expiresAt.toLocaleDateString()} to maintain proxy continuity.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onTabChange('overview')}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium whitespace-nowrap shrink-0"
                >
                  Renew Plan
                </button>
              </div>
            )}

            {/* Mobile Admin Shortcut */}
            {user.role === 'admin' && (
              <div className="lg:hidden flex items-center justify-between glass-surface rounded-xl px-4 py-3">
                <span className="text-xs font-medium text-violet-300">Administrator Access</span>
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium"
                >
                  Open Admin Panel
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="glass-surface rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-violet-300 font-medium">Welcome back</p>
                    <h1 className="text-2xl font-semibold text-white">{user.fullName}</h1>
                    <p className="text-xs text-slate-400">
                      {user.email} <span className="mx-1.5">·</span> @{user.username}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {renderStatusLabel(user.status)}
                    <button
                      type="button"
                      onClick={() => onTabChange('proxy')}
                      className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors whitespace-nowrap min-h-[42px]"
                    >
                      View My Proxy
                    </button>
                  </div>
                </div>

                {/* Subscription & Payment Status Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-surface rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-white">Active Subscription</h2>
                      {activeSub
                        ? renderStatusLabel(activeSub.effectiveStatus)
                        : pendingPayment
                          ? renderStatusLabel('pending')
                          : renderStatusLabel('expired')}
                    </div>

                    {activeSub ? (
                      <div className="space-y-3 pt-2 border-t border-white/10">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xl font-semibold text-white">
                            {activeSub.packageName}
                          </span>
                          <span className="text-xs font-mono tabular-nums text-violet-300">
                            {Math.max(0, activeSub.daysRemaining)} days left
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-slate-400">Activated</p>
                            <p className="text-slate-200 font-mono tabular-nums mt-0.5">
                              {activeSub.startsAt.toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Expiration Date</p>
                            <p className="text-white font-mono tabular-nums mt-0.5">
                              {activeSub.expiresAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : pendingPayment ? (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <p className="text-sm text-amber-200 font-medium">
                          {pendingPayment.packageName} awaiting verification
                        </p>
                        <p className="text-xs text-slate-400">
                          TxID: <span className="font-mono text-slate-200">{pendingPayment.transactionId}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Your subscription activates immediately after administrator verification.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2 border-t border-white/10">
                        <p className="text-sm text-slate-400">
                          No active subscription on this account. Choose a package below to begin.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Assigned Proxy Quick View */}
                  <div className="glass-surface rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-white">Assigned Proxy Node</h2>
                      <button
                        type="button"
                        onClick={() => onTabChange('proxy')}
                        className="text-xs text-violet-400 hover:text-violet-300"
                      >
                        Manage
                      </button>
                    </div>

                    {proxies.length > 0 ? (
                      <div className="space-y-3 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-base font-semibold text-white tabular-nums">
                            {proxies[0].ipAddress}:{proxies[0].port}
                          </span>
                          {renderStatusLabel(proxies[0].status)}
                        </div>
                        <p className="text-xs text-slate-400">
                          {proxies[0].protocol} <span className="mx-1">·</span> {proxies[0].country} ({proxies[0].location})
                        </p>
                        <button
                          type="button"
                          onClick={() => onTabChange('proxy')}
                          className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors"
                        >
                          Open Credential Vault
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <p className="text-sm text-slate-400">
                          No proxy node assigned yet.
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          After your Binance payment is approved, an administrator assigns dedicated IP credentials here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Purchase Packages */}
                <div className="glass-surface rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold text-white">Purchase or Extend Plan</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Binance-only checkout · Instant review queue upon submission
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {enabledPackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`rounded-xl p-4 border flex flex-col justify-between gap-4 ${
                          pkg.isBestValue
                            ? 'bg-violet-950/30 border-violet-500/40'
                            : 'bg-[#07090E]/70 border-white/10'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white">{pkg.name}</span>
                            {pkg.isBestValue && (
                              <span className="text-[11px] font-semibold text-violet-300">Best Value</span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-semibold font-mono tabular-nums text-white">
                              ${pkg.finalPrice}
                            </span>
                            <span className="text-xs font-mono tabular-nums text-slate-500 line-through">
                              ${pkg.originalPrice}
                            </span>
                            <span className="text-[11px] font-mono text-emerald-400">
                              -{pkg.discountPercent}%
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{pkg.durationDays} days</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectPackage(pkg)}
                          className="w-full py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors min-h-[40px]"
                        >
                          Buy Now
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: MY PROXY */}
            {activeTab === 'proxy' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="glass-surface rounded-2xl p-6 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-violet-300 font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Protected Credential Vault</span>
                  </div>
                  <h1 className="text-2xl font-semibold text-white">My Assigned Proxies</h1>
                  <p className="text-sm text-slate-400">
                    Credentials displayed below are strictly isolated to {user.email}.
                  </p>
                </div>

                {proxies.length === 0 ? (
                  <div className="glass-surface rounded-2xl p-8 text-center space-y-4">
                    <Server className="w-10 h-10 text-slate-500 mx-auto" />
                    <div className="space-y-1 max-w-md mx-auto">
                      <h2 className="text-base font-semibold text-white">No Proxy Assigned Yet</h2>
                      <p className="text-sm text-slate-400">
                        {pendingPayment
                          ? 'Your Binance payment is currently pending verification. Once approved, an administrator will provision your dedicated proxy credentials.'
                          : 'Purchase a subscription package and complete Binance verification to receive your dedicated IP credentials.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => onTabChange('overview')}
                        className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium min-h-[44px]"
                      >
                        Browse Packages
                      </button>
                      <a
                        href={telegramHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-medium min-h-[44px] inline-flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Contact Support
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {proxies.map((proxy) => {
                      const isExpired = proxy.expiresAt.getTime() <= Date.now();
                      const displayStatus = isExpired ? 'expired' : proxy.status;
                      const revealed = Boolean(revealedPasswords[proxy.id]);
                      const fullString = `${proxy.protocol.toLowerCase()}://${proxy.username}:${proxy.password}@${proxy.ipAddress}:${proxy.port}`;

                      return (
                        <div key={proxy.id} className="glass-elevated rounded-2xl p-6 space-y-5">
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                            <div>
                              <p className="text-xs text-slate-400">
                                {proxy.country} <span className="mx-1">·</span> {proxy.location}
                              </p>
                              <h2 className="text-lg font-semibold font-mono text-white mt-0.5 tabular-nums">
                                {proxy.ipAddress}:{proxy.port}
                              </h2>
                            </div>
                            <div className="flex items-center gap-4">
                              {renderStatusLabel(displayStatus)}
                              <button
                                type="button"
                                onClick={() => void handleCopy(fullString, `full_${proxy.id}`)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium min-h-[40px]"
                              >
                                {copiedKey === `full_${proxy.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    Copied Connection String
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy Connection String
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <CredentialField
                              label="IP Address"
                              value={proxy.ipAddress}
                              copied={copiedKey === `ip_${proxy.id}`}
                              onCopy={() => void handleCopy(proxy.ipAddress, `ip_${proxy.id}`)}
                            />
                            <CredentialField
                              label="Port"
                              value={String(proxy.port)}
                              copied={copiedKey === `port_${proxy.id}`}
                              onCopy={() => void handleCopy(String(proxy.port), `port_${proxy.id}`)}
                            />
                            <CredentialField
                              label="Protocol"
                              value={proxy.protocol}
                              copied={copiedKey === `proto_${proxy.id}`}
                              onCopy={() => void handleCopy(proxy.protocol, `proto_${proxy.id}`)}
                            />
                            <CredentialField
                              label="Username"
                              value={proxy.username}
                              copied={copiedKey === `user_${proxy.id}`}
                              onCopy={() => void handleCopy(proxy.username, `user_${proxy.id}`)}
                            />
                            <div className="p-3 rounded-xl bg-[#07090E] border border-white/10 space-y-1">
                              <span className="block text-[11px] text-slate-400">Password</span>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-sm text-white truncate">
                                  {revealed ? proxy.password : '••••••••••••'}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRevealedPasswords((prev) => ({
                                        ...prev,
                                        [proxy.id]: !prev[proxy.id],
                                      }))
                                    }
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                                    aria-label={revealed ? 'Hide password' : 'Reveal password'}
                                  >
                                    {revealed ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleCopy(proxy.password, `pass_${proxy.id}`)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                                    aria-label="Copy password"
                                  >
                                    {copiedKey === `pass_${proxy.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-[#07090E] border border-white/10 space-y-1">
                              <span className="block text-[11px] text-slate-400">Expiration Date</span>
                              <p className="font-mono text-sm text-white tabular-nums">
                                {proxy.expiresAt.toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Support Section Inside Proxy / Subscription Details */}
                <div className="glass-surface rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">Need Proxy Configuration Help?</p>
                    <p className="text-xs text-slate-400">
                      Reach our operator desk directly on Telegram at <span className="font-mono text-slate-200">@{telegramHandle}</span>.
                    </p>
                  </div>
                  <a
                    href={telegramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium whitespace-nowrap shrink-0 min-h-[42px]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contact Support
                  </a>
                </div>
              </motion.div>
            )}

            {/* TAB 3: BILLING & HISTORY */}
            {activeTab === 'billing' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="glass-surface rounded-2xl p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-xl font-semibold text-white">Transaction & Payment History</h1>
                    <BinanceLogo size={20} />
                  </div>
                  {payments.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6">No Binance payment submissions yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-xs text-slate-400">
                            <th className="py-3 pr-4 font-medium">Package</th>
                            <th className="py-3 pr-4 font-medium">Transaction ID</th>
                            <th className="py-3 pr-4 font-medium">Amount</th>
                            <th className="py-3 pr-4 font-medium">Status</th>
                            <th className="py-3 pr-4 font-medium">Date</th>
                            <th className="py-3 text-right font-medium">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {payments.map((pay) => (
                            <tr key={pay.id} className="hover:bg-white/[0.02]">
                              <td className="py-3.5 pr-4">
                                <p className="font-medium text-white">{pay.packageName}</p>
                                {pay.adminNotes && (
                                  <p className="text-xs text-slate-400 mt-0.5">Note: {pay.adminNotes}</p>
                                )}
                              </td>
                              <td className="py-3.5 pr-4 font-mono text-xs text-slate-300">
                                {pay.transactionId}
                              </td>
                              <td className="py-3.5 pr-4 font-mono tabular-nums text-white">
                                ${pay.finalAmount}
                              </td>
                              <td className="py-3.5 pr-4">{renderStatusLabel(pay.status)}</td>
                              <td className="py-3.5 pr-4 font-mono text-xs tabular-nums text-slate-400">
                                {pay.createdAt ? pay.createdAt.toLocaleDateString() : '—'}
                              </td>
                              <td className="py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setPreviewScreenshot(pay.screenshotDataUrl)}
                                  className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="glass-surface rounded-2xl p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-white">Subscription History</h2>
                  {enrichedSubs.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4">No activated subscriptions yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-xs text-slate-400">
                            <th className="py-3 pr-4 font-medium">Package</th>
                            <th className="py-3 pr-4 font-medium">Start Date</th>
                            <th className="py-3 pr-4 font-medium">Expiration Date</th>
                            <th className="py-3 pr-4 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {enrichedSubs.map((sub) => (
                            <tr key={sub.id} className="hover:bg-white/[0.02]">
                              <td className="py-3.5 pr-4 font-medium text-white">{sub.packageName}</td>
                              <td className="py-3.5 pr-4 font-mono text-xs tabular-nums text-slate-300">
                                {sub.startsAt.toLocaleDateString()}
                              </td>
                              <td className="py-3.5 pr-4 font-mono text-xs tabular-nums text-slate-200">
                                {sub.expiresAt.toLocaleDateString()}
                              </td>
                              <td className="py-3.5 pr-4">{renderStatusLabel(sub.effectiveStatus)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 4: SUPPORT CENTER */}
            {activeTab === 'support' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="glass-surface rounded-2xl p-6 sm:p-8 space-y-6"
              >
                <div className="space-y-2">
                  <p className="text-xs font-medium text-violet-300">Support Center</p>
                  <h1 className="text-2xl font-semibold text-white">Telegram Customer Support</h1>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                    {siteSettings.supportInstructions}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-[#07090E] border border-white/10">
                  <div>
                    <p className="text-xs text-slate-400">Configured Telegram Username</p>
                    <p className="text-lg font-mono font-semibold text-white mt-1">
                      @{telegramHandle}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Your Registered Email (for reference)</p>
                    <p className="text-sm font-mono text-slate-200 mt-1.5 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={telegramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium min-h-[46px]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contact Support
                  </a>
                  <a
                    href={telegramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-medium min-h-[46px]"
                  >
                    Open Telegram Profile
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            )}

            {/* TAB 5: ACCOUNT SETTINGS */}
            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="glass-surface rounded-2xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h1 className="text-xl font-semibold text-white">Account Settings</h1>
                    <p className="text-xs text-slate-400 mt-1">
                      Manage your profile details and review verified account credentials.
                    </p>
                  </div>

                  {profileError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
                      {profileError}
                    </div>
                  )}
                  {profileNotice && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
                      {profileNotice}
                    </div>
                  )}

                  <form onSubmit={handleProfileSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs text-slate-300">Full Name</label>
                      <input
                        type="text"
                        required
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 focus:border-violet-500 focus:outline-none text-sm text-white min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs text-slate-300">Username</label>
                      <input
                        type="text"
                        required
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value.toLowerCase())}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 focus:border-violet-500 focus:outline-none text-sm font-mono text-white min-h-[44px]"
                      />
                    </div>

                    <div className="sm:col-span-2 pt-2">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors min-h-[44px]"
                      >
                        {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                      </button>
                    </div>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/10 text-xs">
                    <div>
                      <p className="text-slate-400">Verified Email</p>
                      <p className="text-white font-mono mt-1 truncate">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Authentication Method</p>
                      <p className="text-white mt-1 capitalize">{user.authProvider}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Account Role</p>
                      <p className="text-white mt-1 capitalize">{user.role}</p>
                    </div>
                  </div>
                </div>

                <div className="glass-surface rounded-2xl p-6 sm:p-8 space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Change Account Password</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Update the password for <span className="font-mono text-slate-200">{user.email}</span>.
                    </p>
                  </div>

                  {passwordError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
                      {passwordError}
                    </div>
                  )}
                  {passwordNotice && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
                      {passwordNotice}
                    </div>
                  )}

                  <form onSubmit={handleUpdatePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs text-slate-300">Current Password</label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 focus:border-violet-500 focus:outline-none text-sm text-white min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs text-slate-300">New Password (8+ chars)</label>
                      <input
                        type="password"
                        required
                        value={newAccountPassword}
                        onChange={(e) => setNewAccountPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 focus:border-violet-500 focus:outline-none text-sm text-white min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs text-slate-300">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={confirmAccountPassword}
                        onChange={(e) => setConfirmAccountPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 focus:border-violet-500 focus:outline-none text-sm text-white min-h-[44px]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="px-5 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors min-h-[44px]"
                      >
                        {savingPassword ? 'Updating Password...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="glass-surface rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-white">Application & Session</h2>
                    <p className="text-xs text-slate-400">
                      Install MIX NEXUS IP on Android or desktop, or sign out securely.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <PWAInstallButton variant="card" />
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 text-sm font-medium min-h-[44px]"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#07090E]/95 backdrop-blur-xl">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center gap-1 min-h-[44px] ${
                  active ? 'text-violet-400' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Receipt Lightbox Modal */}
      <AnimatePresence>
      {previewScreenshot && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl w-full glass-elevated rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Submitted Payment Screenshot</span>
              <button
                type="button"
                onClick={() => setPreviewScreenshot(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewScreenshot}
              alt="Payment receipt"
              className="w-full max-h-[75vh] object-contain rounded-xl bg-[#07090E]"
            />
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

const CredentialField: React.FC<{
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}> = ({ label, value, copied, onCopy }) => (
  <div className="p-3 rounded-xl bg-[#07090E] border border-white/10 space-y-1">
    <span className="block text-[11px] text-slate-400">{label}</span>
    <div className="flex items-center justify-between gap-2">
      <span className="font-mono text-sm text-white truncate">{value}</span>
      <button
        type="button"
        onClick={onCopy}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 shrink-0"
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  </div>
);
