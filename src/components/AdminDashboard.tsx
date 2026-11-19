import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Download,
  Edit3,
  LogOut,
  Package,
  Plus,
  Search,
  Server,
  Settings,
  Shield,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { validateAndCompressImage } from '../lib/imageUtils.ts';
import {
  adminDeleteProxyNode,
  adminExtendOrUpdateSubscription,
  adminLogBackupExport,
  adminSavePackage,
  adminSaveProxyNode,
  adminSaveSiteAndPaymentSettings,
  adminUpdateUser,
  approvePaymentAndActivateSubscription,
  getEffectiveSubscriptionStatus,
  rejectPaymentRequest,
} from '../services/apiService.ts';
import {
  AdminTab,
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
} from '../types/index.ts';
import { BinanceLogo } from './BinanceLogo.tsx';

interface AdminDashboardProps {
  users: UserProfile[];
  payments: PaymentRequest[];
  subscriptions: SubscriptionRecord[];
  proxies: ProxyNode[];
  packages: SubscriptionPackage[];
  siteSettings: SiteSettings;
  paymentSettings: PaymentSettings;
  auditLogs: AuditLog[];
  onBackToClient: () => void;
  onRefreshAdmin: () => Promise<void>;
  onLogout: () => Promise<void>;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.03,
    },
  },
};

const cardFadeSlide = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const rowSlide = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  payments,
  subscriptions,
  proxies,
  packages,
  siteSettings,
  paymentSettings,
  auditLogs,
  onBackToClient,
  onRefreshAdmin,
  onLogout,
}) => {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Payments review state
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [reviewingPayment, setReviewingPayment] = useState<PaymentRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedProxyIdForApprove, setSelectedProxyIdForApprove] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // User search & inspection
  const [userSearch, setUserSearch] = useState('');
  const [inspectedUser, setInspectedUser] = useState<UserProfile | null>(null);

  // Proxy modal state
  const [editingProxy, setEditingProxy] = useState<Partial<ProxyNode> | null>(null);
  const [savingProxy, setSavingProxy] = useState(false);

  // Package edit state
  const [editingPackage, setEditingPackage] = useState<SubscriptionPackage | null>(null);
  const [pkgFeaturesText, setPkgFeaturesText] = useState('');
  const [savingPackage, setSavingPackage] = useState(false);

  // Website & Binance settings form
  const [siteForm, setSiteForm] = useState<SiteSettings>(siteSettings);
  const [paymentForm, setPaymentForm] = useState<PaymentSettings>(paymentSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setSiteForm(siteSettings);
  }, [siteSettings]);

  useEffect(() => {
    setPaymentForm(paymentSettings);
  }, [paymentSettings]);

  const notify = (type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Metrics
  const activeSubsCount = useMemo(
    () => subscriptions.filter((s) => getEffectiveSubscriptionStatus(s) === 'active').length,
    [subscriptions]
  );
  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending').length;
  const approvedPaymentsCount = payments.filter((p) => p.status === 'approved').length;
  const rejectedPaymentsCount = payments.filter((p) => p.status === 'rejected').length;

  const unassignedProxies = proxies.filter((p) => !p.assignedUserId);

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = paymentFilter === 'all' || p.status === paymentFilter;
    const q = paymentSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.userEmail.toLowerCase().includes(q) ||
      p.transactionId.toLowerCase().includes(q) ||
      p.packageName.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    return (
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  });

  const handleApprovePayment = async () => {
    if (!reviewingPayment) return;
    setProcessingPayment(true);
    try {
      await approvePaymentAndActivateSubscription({
        paymentId: reviewingPayment.id,
        adminNotes: reviewNotes,
        proxyId: selectedProxyIdForApprove || undefined,
      });
      await onRefreshAdmin();
      notify('ok', `Approved payment and activated ${reviewingPayment.packageName} for ${reviewingPayment.userEmail}.`);
      setReviewingPayment(null);
      setReviewNotes('');
      setSelectedProxyIdForApprove('');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!reviewingPayment) return;
    setProcessingPayment(true);
    try {
      await rejectPaymentRequest({
        paymentId: reviewingPayment.id,
        adminNotes: reviewNotes,
      });
      await onRefreshAdmin();
      notify('ok', `Rejected payment ${reviewingPayment.transactionId}.`);
      setReviewingPayment(null);
      setReviewNotes('');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleToggleUserStatus = async (target: UserProfile) => {
    const nextStatus = target.status === 'suspended' ? 'active' : 'suspended';
    try {
      await adminUpdateUser({
        uid: target.uid,
        status: nextStatus,
        role: target.role,
      });
      await onRefreshAdmin();
      notify('ok', `${target.email} is now ${nextStatus}.`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'User update failed.');
    }
  };

  const handleExtendSub = async (sub: SubscriptionRecord, addDays: number) => {
    const base = sub.expiresAt.getTime() > Date.now() ? sub.expiresAt.getTime() : Date.now();
    const nextDate = new Date(base + addDays * 24 * 60 * 60 * 1000);
    try {
      await adminExtendOrUpdateSubscription({
        id: sub.id,
        newStatus: 'active',
        newExpiresAt: nextDate,
      });
      await onRefreshAdmin();
      notify('ok', `Extended ${sub.packageName} by ${addDays} days.`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to extend subscription.');
    }
  };

  const handleSubStatusChange = async (
    sub: SubscriptionRecord,
    newStatus: SubscriptionRecord['status']
  ) => {
    try {
      await adminExtendOrUpdateSubscription({
        id: sub.id,
        newStatus,
        newExpiresAt: sub.expiresAt,
      });
      await onRefreshAdmin();
      notify('ok', `Updated subscription status to ${newStatus}.`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to update subscription.');
    }
  };

  const openNewProxyModal = () => {
    const defaultExp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    setEditingProxy({
      ipAddress: '',
      port: 1080,
      username: '',
      password: '',
      protocol: 'SOCKS5',
      country: 'United States',
      location: 'New York',
      status: 'active',
      assignedUserId: '',
      assignedUserEmail: '',
      subscriptionId: '',
      expiresAt: defaultExp,
    });
  };

  const handleSaveProxy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProxy) return;
    setSavingProxy(true);
    try {
      const assignedUser = users.find((u) => u.uid === editingProxy.assignedUserId);
      const userSub = subscriptions.find(
        (s) => s.id === editingProxy.subscriptionId || (assignedUser && s.userId === assignedUser.uid)
      );
      await adminSaveProxyNode({
        proxyId: editingProxy.id,
        ipAddress: editingProxy.ipAddress || '',
        port: Number(editingProxy.port || 1080),
        username: editingProxy.username || '',
        password: editingProxy.password || '',
        protocol: (editingProxy.protocol as ProxyProtocol) || 'SOCKS5',
        country: editingProxy.country || 'United States',
        location: editingProxy.location || 'Primary Node',
        status: (editingProxy.status as ProxyStatus) || 'active',
        assignedUserId: assignedUser ? assignedUser.uid : '',
        subscriptionId: editingProxy.subscriptionId || userSub?.id || '',
        expiresAt: editingProxy.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await onRefreshAdmin();
      notify('ok', 'Proxy node saved.');
      setEditingProxy(null);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to save proxy node.');
    } finally {
      setSavingProxy(false);
    }
  };

  const handleDeleteProxy = async (proxy: ProxyNode) => {
    try {
      await adminDeleteProxyNode(proxy.id);
      await onRefreshAdmin();
      notify('ok', `Deleted proxy ${proxy.ipAddress}:${proxy.port}.`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to delete proxy.');
    }
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage) return;
    setSavingPackage(true);
    try {
      const features = pkgFeaturesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8);
      await adminSavePackage({ ...editingPackage, features });
      await onRefreshAdmin();
      notify('ok', `Saved package ${editingPackage.name}.`);
      setEditingPackage(null);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to save package.');
    } finally {
      setSavingPackage(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await validateAndCompressImage(file, 256);
      setSiteForm((prev) => ({ ...prev, logoUrl: dataUrl }));
      notify('ok', 'Logo processed. Click Save Website Settings to publish.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to process logo.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await adminSaveSiteAndPaymentSettings({
        site: siteForm,
        payment: paymentForm,
      });
      await onRefreshAdmin();
      notify('ok', 'Website, Binance, and Telegram support settings updated.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        exportedBy: 'Administrator',
        siteSettings,
        paymentSettings,
        packages,
        users,
        payments: payments.map((p) => ({ ...p, screenshotDataUrl: '[omitted_or_attached]' })),
        subscriptions,
        proxies,
        auditLogs,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mix-nexus-ip-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      await adminLogBackupExport();
      await onRefreshAdmin();
      notify('ok', 'Database backup exported and recorded in Audit Logs.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Backup export failed.');
    }
  };

  const adminTabs: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'payments', label: `Payments (${pendingPaymentsCount})`, icon: CreditCard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'proxies', label: 'Proxies', icon: Server },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'audit', label: 'Audit Logs', icon: Shield },
  ];

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-4rem)] bg-[#07090E] bg-luxury-mesh py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -top-28 right-1/5 w-96 h-96 rounded-full bg-violet-600/12 blur-3xl animate-ambient" />
      <div className="pointer-events-none absolute bottom-10 -left-24 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl animate-orbital" />

      <div className="relative max-w-7xl mx-auto space-y-6">
        {/* Top Admin Control Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden glass-surface rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4"
        >
          <span className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-violet-400/10 to-transparent animate-sheen" />
          <div className="space-y-1 relative">
            <button
              type="button"
              onClick={onBackToClient}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Client Dashboard
            </button>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Administrator Control Panel</h1>
            <p className="text-xs text-slate-400">
              Authorized Administrator Session
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 relative">
            <button
              type="button"
              onClick={() => void handleExportBackup()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-medium text-white transition-colors min-h-[42px]"
            >
              <Download className="w-4 h-4 text-violet-400" />
              Export Database Backup
            </button>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium text-rose-200 transition-colors min-h-[42px]"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </motion.div>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                toast.type === 'ok'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              <span>{toast.text}</span>
              <button type="button" onClick={() => setToast(null)} className="p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Horizontal Tab Bar with Sliding Indicator */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {adminTabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setTab(item.id)}
                className={`relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 min-h-[42px] transition-colors ${
                  active ? 'text-white' : 'glass-surface text-slate-300 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="adminTabPill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-600/25"
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Animated Tab Views */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
        {/* ADMIN TAB 1: OVERVIEW */}
        {tab === 'overview' && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatTile label="Total Users" value={users.length} index={0} />
              <StatTile label="Active Subs" value={activeSubsCount} tone="emerald" index={1} />
              <StatTile label="Pending Payments" value={pendingPaymentsCount} tone="amber" index={2} />
              <StatTile label="Approved" value={approvedPaymentsCount} tone="emerald" index={3} />
              <StatTile label="Rejected" value={rejectedPaymentsCount} tone="rose" index={4} />
              <StatTile label="Total Orders" value={payments.length} index={5} />
            </div>

            <motion.div
              variants={cardFadeSlide}
              className="glass-surface rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Pending Payment Verification Queue</h2>
                <button
                  type="button"
                  onClick={() => setTab('payments')}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Open Full Queue
                </button>
              </div>
              {pendingPaymentsCount === 0 ? (
                <p className="text-sm text-slate-400 py-4">No pending Binance payments awaiting review.</p>
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {payments
                    .filter((p) => p.status === 'pending')
                    .map((pay) => (
                      <motion.div
                        key={pay.id}
                        variants={rowSlide}
                        whileHover={{ x: 3 }}
                        className="p-4 rounded-xl bg-[#07090E] border border-white/10 hover:border-violet-500/35 transition-colors flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">
                            {pay.userEmail} <span className="text-slate-500">·</span> {pay.packageName} (${pay.finalAmount})
                          </p>
                          <p className="text-xs font-mono text-slate-400">
                            TxID: {pay.transactionId}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingPayment(pay);
                            setReviewNotes(pay.adminNotes || '');
                          }}
                          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors min-h-[40px]"
                        >
                          Verify & Review
                        </button>
                      </motion.div>
                    ))}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ADMIN TAB 2: PAYMENTS */}
        {tab === 'payments' && (
          <motion.div
            variants={cardFadeSlide}
            initial="hidden"
            animate="visible"
            className="glass-surface rounded-2xl p-6 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <BinanceLogo size={20} />
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#07090E] border border-white/10">
                  {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setPaymentFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize min-h-[36px] ${
                        paymentFilter === f ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Search email or TxID..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-xs text-white focus:border-violet-500 focus:outline-none min-h-[40px]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-400">
                    <th className="py-3 pr-4 font-medium">Client</th>
                    <th className="py-3 pr-4 font-medium">Package</th>
                    <th className="py-3 pr-4 font-medium">TxID</th>
                    <th className="py-3 pr-4 font-medium">Payable</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPayments.map((pay, idx) => (
                    <motion.tr
                      key={pay.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.24, delay: Math.min(idx * 0.03, 0.24), ease: [0.16, 1, 0.3, 1] }}
                      className="hover:bg-white/[0.02]"
                    >
                      <td className="py-3.5 pr-4">
                        <p className="text-white font-medium">{pay.userName}</p>
                        <p className="text-xs text-slate-400">{pay.userEmail}</p>
                      </td>
                      <td className="py-3.5 pr-4 text-slate-200">{pay.packageName}</td>
                      <td className="py-3.5 pr-4 font-mono text-xs text-slate-300">{pay.transactionId}</td>
                      <td className="py-3.5 pr-4 font-mono tabular-nums text-white">${pay.finalAmount}</td>
                      <td className="py-3.5 pr-4">
                        {pay.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        ) : pay.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-rose-400">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        ) : (
                          <span className="text-xs text-amber-400 font-medium">Pending</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewingPayment(pay);
                            setReviewNotes(pay.adminNotes || '');
                            setSelectedProxyIdForApprove('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-200 hover:text-white text-xs font-medium transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filteredPayments.length === 0 && (
                <p className="text-sm text-slate-400 py-8 text-center">No matching payment requests.</p>
              )}
            </div>
          </motion.div>
        )}

        {/* ADMIN TAB 3: USERS & SUBSCRIPTIONS */}
        {tab === 'users' && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div
              variants={cardFadeSlide}
              className="glass-surface rounded-2xl p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-white">User Accounts ({users.length})</h2>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search name, username, email..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-xs text-white focus:border-violet-500 focus:outline-none min-h-[40px]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-slate-400">
                      <th className="py-3 pr-4 font-medium">User</th>
                      <th className="py-3 pr-4 font-medium">Username</th>
                      <th className="py-3 pr-4 font-medium">Provider</th>
                      <th className="py-3 pr-4 font-medium">Role</th>
                      <th className="py-3 pr-4 font-medium">Status</th>
                      <th className="py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u, idx) => (
                      <motion.tr
                        key={u.uid}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.24, delay: Math.min(idx * 0.03, 0.24), ease: [0.16, 1, 0.3, 1] }}
                        className="hover:bg-white/[0.02]"
                      >
                        <td className="py-3.5 pr-4">
                          <p className="font-medium text-white">{u.fullName}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </td>
                        <td className="py-3.5 pr-4 font-mono text-xs text-slate-300">@{u.username}</td>
                        <td className="py-3.5 pr-4 text-xs capitalize text-slate-300">{u.authProvider}</td>
                        <td className="py-3.5 pr-4 text-xs capitalize text-violet-300">{u.role}</td>
                        <td className="py-3.5 pr-4 text-xs">
                          <span className={u.status === 'suspended' ? 'text-rose-400' : 'text-emerald-400'}>
                            {u.status === 'suspended' ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3.5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => setInspectedUser(u)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-200 transition-colors"
                          >
                            Profile
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleUserStatus(u)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              u.status === 'suspended'
                                ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                                : 'bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white'
                            }`}
                          >
                            {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Subscriptions Lifecycle Table */}
            <motion.div
              variants={cardFadeSlide}
              className="glass-surface rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-base font-semibold text-white">Subscription Management</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-slate-400">
                      <th className="py-3 pr-4 font-medium">User Email</th>
                      <th className="py-3 pr-4 font-medium">Package</th>
                      <th className="py-3 pr-4 font-medium">Expires</th>
                      <th className="py-3 pr-4 font-medium">Status</th>
                      <th className="py-3 text-right font-medium">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {subscriptions.map((sub, idx) => {
                      const eff = getEffectiveSubscriptionStatus(sub);
                      return (
                        <motion.tr
                          key={sub.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.24, delay: Math.min(idx * 0.03, 0.24), ease: [0.16, 1, 0.3, 1] }}
                          className="hover:bg-white/[0.02]"
                        >
                          <td className="py-3.5 pr-4 text-white">{sub.userEmail}</td>
                          <td className="py-3.5 pr-4 text-slate-300">{sub.packageName}</td>
                          <td className="py-3.5 pr-4 font-mono text-xs tabular-nums text-slate-200">
                            {sub.expiresAt.toLocaleDateString()}
                          </td>
                          <td className="py-3.5 pr-4 text-xs capitalize text-violet-300">{eff}</td>
                          <td className="py-3.5 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => void handleExtendSub(sub, 30)}
                              className="px-2.5 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-200 hover:text-white text-xs transition-colors"
                            >
                              +30d
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleSubStatusChange(
                                  sub,
                                  eff === 'active' ? 'suspended' : 'active'
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs transition-colors"
                            >
                              {eff === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
                {subscriptions.length === 0 && (
                  <p className="text-sm text-slate-400 py-6 text-center">No subscriptions created yet.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ADMIN TAB 4: PROXIES */}
        {tab === 'proxies' && (
          <motion.div
            variants={cardFadeSlide}
            initial="hidden"
            animate="visible"
            className="glass-surface rounded-2xl p-6 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-white">Proxy Pool & Assignments</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create proxy credentials and assign them directly to verified subscribers.
                </p>
              </div>
              <button
                type="button"
                onClick={openNewProxyModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium min-h-[42px]"
              >
                <Plus className="w-4 h-4" />
                Add Proxy Node
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-400">
                    <th className="py-3 pr-4 font-medium">Host / Port</th>
                    <th className="py-3 pr-4 font-medium">Protocol & Region</th>
                    <th className="py-3 pr-4 font-medium">Assigned User</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Expires</th>
                    <th className="py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {proxies.map((proxy, idx) => (
                    <motion.tr
                      key={proxy.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.24, delay: Math.min(idx * 0.03, 0.24), ease: [0.16, 1, 0.3, 1] }}
                      className="hover:bg-white/[0.02]"
                    >
                      <td className="py-3.5 pr-4 font-mono text-xs text-white tabular-nums">
                        {proxy.ipAddress}:{proxy.port}
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-slate-300">
                        {proxy.protocol} · {proxy.country} ({proxy.location})
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-slate-300">
                        {proxy.assignedUserEmail || <span className="text-slate-500">Unassigned</span>}
                      </td>
                      <td className="py-3.5 pr-4 text-xs capitalize">
                        <span
                          className={
                            proxy.status === 'active'
                              ? 'text-emerald-400'
                              : proxy.status === 'inactive'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                          }
                        >
                          {proxy.status}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 font-mono text-xs tabular-nums text-slate-400">
                        {proxy.expiresAt.toLocaleDateString()}
                      </td>
                      <td className="py-3.5 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditingProxy(proxy)}
                          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5"
                          aria-label="Edit proxy"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteProxy(proxy)}
                          className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          aria-label="Delete proxy"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {proxies.length === 0 && (
                <p className="text-sm text-slate-400 py-8 text-center">
                  No proxy nodes added yet. Click &quot;Add Proxy Node&quot; to create one.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ADMIN TAB 5: PACKAGES */}
        {tab === 'packages' && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {packages.map((pkg) => (
              <motion.div
                key={pkg.id}
                variants={cardFadeSlide}
                whileHover={{ y: -4 }}
                className={`relative overflow-hidden glass-surface rounded-2xl p-6 space-y-4 transition-colors ${
                  pkg.isBestValue
                    ? 'border-violet-400/35 hover:border-[#F0B90B]/50'
                    : 'hover:border-violet-400/35'
                }`}
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${
                    pkg.isBestValue
                      ? 'from-[#F0B90B] via-violet-500 to-indigo-400'
                      : 'from-violet-500/60 to-indigo-500/20'
                  }`}
                />
                {pkg.isBestValue && (
                  <span className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-[#F0B90B]/10 to-transparent animate-sheen" />
                )}
                <div className="flex items-start justify-between relative">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{pkg.name}</h3>
                    <p className="text-xs text-slate-400">
                      {pkg.durationDays} days · {pkg.enabled ? 'Enabled' : 'Disabled'}
                      {pkg.isBestValue ? ' · Best Value' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPackage(pkg);
                      setPkgFeaturesText(pkg.features.join('\n'));
                    }}
                    className="px-3.5 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-200 hover:text-white text-xs font-medium transition-colors"
                  >
                    Edit Plan
                  </button>
                </div>
                <div className="flex items-baseline gap-3 relative">
                  <span className="text-2xl font-semibold font-mono tabular-nums text-white">
                    ${pkg.finalPrice}
                  </span>
                  <span className="text-sm font-mono tabular-nums text-slate-500 line-through">
                    ${pkg.originalPrice}
                  </span>
                  <span className="text-xs font-mono text-emerald-400">{pkg.discountPercent}% OFF</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ADMIN TAB 6: WEBSITE & BINANCE SETTINGS */}
        {tab === 'settings' && (
          <motion.form
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            onSubmit={handleSaveSettings}
            className="space-y-6"
          >
            <motion.div variants={cardFadeSlide} className="glass-surface rounded-2xl p-6 space-y-5">
              <h2 className="text-base font-semibold text-white">Website Branding & Content</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-300">Website Name</label>
                  <input
                    type="text"
                    required
                    value={siteForm.siteName}
                    onChange={(e) => setSiteForm({ ...siteForm, siteName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-sm text-white min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-300">Tagline</label>
                  <input
                    type="text"
                    required
                    value={siteForm.tagline}
                    onChange={(e) => setSiteForm({ ...siteForm, tagline: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-sm text-white min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs text-slate-300">
                    Website Logo URL (or upload custom logo image)
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={siteForm.logoUrl}
                      onChange={(e) => setSiteForm({ ...siteForm, logoUrl: e.target.value })}
                      placeholder="Leave empty to use default geometric emblem"
                      className="flex-1 min-w-[220px] px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-xs text-white min-h-[44px]"
                    />
                    <label className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-white cursor-pointer min-h-[44px] flex items-center">
                      Upload Logo
                      <input type="file" accept="image/*" onChange={(e) => void handleLogoUpload(e)} className="sr-only" />
                    </label>
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs text-slate-300">Homepage Hero Headline</label>
                  <input
                    type="text"
                    required
                    value={siteForm.heroHeadline}
                    onChange={(e) => setSiteForm({ ...siteForm, heroHeadline: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-sm text-white min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs text-slate-300">Homepage Subheadline</label>
                  <textarea
                    rows={2}
                    required
                    value={siteForm.heroSubheadline}
                    onChange={(e) => setSiteForm({ ...siteForm, heroSubheadline: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-sm text-white"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs text-slate-300">Website Announcement Banner</label>
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={siteForm.announcementActive}
                        onChange={(e) =>
                          setSiteForm({ ...siteForm, announcementActive: e.target.checked })
                        }
                      />
                      Active
                    </label>
                  </div>
                  <input
                    type="text"
                    value={siteForm.announcementText}
                    onChange={(e) => setSiteForm({ ...siteForm, announcementText: e.target.value })}
                    placeholder="Optional sitewide announcement message..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-sm text-white min-h-[44px]"
                  />
                </div>
              </div>
            </motion.div>

            <motion.div variants={cardFadeSlide} className="glass-surface rounded-2xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-white">Binance Payment & Telegram Support</h2>
                <BinanceLogo size={20} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-300">Binance Account Name</label>
                  <input
                    type="text"
                    required
                    value={paymentForm.binanceName}
                    onChange={(e) => setPaymentForm({ ...paymentForm, binanceName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-sm font-mono text-white min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-300">Binance UID</label>
                  <input
                    type="text"
                    required
                    value={paymentForm.binanceUid}
                    onChange={(e) => setPaymentForm({ ...paymentForm, binanceUid: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-sm font-mono text-white min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs text-slate-300">Wallet Network</label>
                  <input
                    type="text"
                    required
                    value={paymentForm.binanceNetwork}
                    onChange={(e) => setPaymentForm({ ...paymentForm, binanceNetwork: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-sm text-white min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs text-slate-300">Binance Wallet Address</label>
                  <input
                    type="text"
                    required
                    value={paymentForm.binanceWalletAddress}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, binanceWalletAddress: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-sm font-mono text-white min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs text-slate-300">Binance Payment Instructions</label>
                  <textarea
                    rows={2}
                    value={paymentForm.paymentInstructions}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, paymentInstructions: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-sm text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-300">Telegram Support Username</label>
                  <input
                    type="text"
                    required
                    value={siteForm.telegramUsername}
                    onChange={(e) =>
                      setSiteForm({
                        ...siteForm,
                        telegramUsername: e.target.value.replace(/^@+/, ''),
                      })
                    }
                    placeholder="MIX_NEXUS_IP_SUPPORT"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-sm font-mono text-white min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-300">Support Instructions</label>
                  <input
                    type="text"
                    value={siteForm.supportInstructions}
                    onChange={(e) =>
                      setSiteForm({ ...siteForm, supportInstructions: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-sm text-white min-h-[44px]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors min-h-[46px]"
              >
                {savingSettings ? 'Saving Settings...' : 'Save Website Settings'}
              </button>
            </motion.div>
          </motion.form>
        )}

        {/* ADMIN TAB 7: AUDIT LOGS */}
        {tab === 'audit' && (
          <motion.div
            variants={cardFadeSlide}
            initial="hidden"
            animate="visible"
            className="glass-surface rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-white">Administrative Audit Trail</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-3 pr-4 font-medium">Timestamp</th>
                    <th className="py-3 pr-4 font-medium">Actor</th>
                    <th className="py-3 pr-4 font-medium">Action</th>
                    <th className="py-3 pr-4 font-medium">Target</th>
                    <th className="py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLogs.map((log, idx) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(idx * 0.025, 0.22), ease: [0.16, 1, 0.3, 1] }}
                      className="hover:bg-white/[0.02]"
                    >
                      <td className="py-3 pr-4 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                        {log.createdAt ? log.createdAt.toLocaleString() : '—'}
                      </td>
                      <td className="py-3 pr-4 text-slate-200">{log.actorEmail}</td>
                      <td className="py-3 pr-4 font-mono text-violet-300">{log.action}</td>
                      <td className="py-3 pr-4 font-mono text-slate-400">{log.targetType}</td>
                      <td className="py-3 text-slate-300">{log.details}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {auditLogs.length === 0 && (
                <p className="text-sm text-slate-400 py-8 text-center">No administrative audit entries yet.</p>
              )}
            </div>
          </motion.div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* MODAL: REVIEW BINANCE PAYMENT */}
      <AnimatePresence>
      {reviewingPayment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl w-full glass-elevated rounded-2xl p-6 space-y-5 my-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-violet-300">Payment Verification</p>
                <h3 className="text-lg font-semibold text-white">
                  {reviewingPayment.packageName} · ${reviewingPayment.finalAmount} USDT
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewingPayment(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#07090E] p-4 rounded-xl border border-white/10">
              <div>
                <span className="text-slate-400">Client:</span>{' '}
                <span className="text-white">{reviewingPayment.userEmail}</span>
              </div>
              <div>
                <span className="text-slate-400">TxID:</span>{' '}
                <span className="font-mono text-white">{reviewingPayment.transactionId}</span>
              </div>
              <div>
                <span className="text-slate-400">UID Used:</span>{' '}
                <span className="font-mono text-slate-200">{reviewingPayment.binanceUidUsed}</span>
              </div>
              <div>
                <span className="text-slate-400">Duration:</span>{' '}
                <span className="text-slate-200">{reviewingPayment.durationDays} days</span>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-white/10 bg-[#07090E]">
              <img
                src={reviewingPayment.screenshotDataUrl}
                alt="Binance payment screenshot"
                className="w-full max-h-72 object-contain"
              />
            </div>

            {reviewingPayment.status === 'pending' && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-300">
                    Optional: Assign Available Proxy Node Immediately on Approval
                  </label>
                  <select
                    value={selectedProxyIdForApprove}
                    onChange={(e) => setSelectedProxyIdForApprove(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-xs text-white min-h-[42px]"
                  >
                    <option value="">Assign proxy manually later</option>
                    {unassignedProxies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.ipAddress}:{p.port} ({p.protocol} · {p.country})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-slate-300">Admin Notes</label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Verification notes or rejection reason..."
                    className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-xs text-white"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    disabled={processingPayment}
                    onClick={() => void handleRejectPayment()}
                    className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-200 hover:text-white text-xs font-medium min-h-[42px]"
                  >
                    Reject Payment
                  </button>
                  <button
                    type="button"
                    disabled={processingPayment}
                    onClick={() => void handleApprovePayment()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium min-h-[42px]"
                  >
                    {processingPayment ? 'Processing...' : 'Approve & Activate Subscription'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MODAL: USER PROFILE INSPECTOR */}
      <AnimatePresence>
      {inspectedUser && (
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
            className="max-w-lg w-full glass-elevated rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{inspectedUser.fullName}</h3>
              <button
                type="button"
                onClick={() => setInspectedUser(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-slate-300 bg-[#07090E] p-4 rounded-xl border border-white/10">
              <p>Email: <span className="text-white font-mono">{inspectedUser.email}</span></p>
              <p>Username: <span className="text-white font-mono">@{inspectedUser.username}</span></p>
              <p>UID: <span className="text-slate-400 font-mono">{inspectedUser.uid}</span></p>
              <p>Orders: <span className="text-white font-mono">{payments.filter((p) => p.userId === inspectedUser.uid).length}</span></p>
              <p>Assigned Proxies: <span className="text-white font-mono">{proxies.filter((p) => p.assignedUserId === inspectedUser.uid).length}</span></p>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MODAL: ADD / EDIT PROXY */}
      <AnimatePresence>
      {editingProxy && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.form
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handleSaveProxy}
            className="max-w-lg w-full glass-elevated rounded-2xl p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingProxy.id ? 'Edit Proxy Node' : 'Add New Proxy Node'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProxy(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300">IP Address</label>
                <input
                  type="text"
                  required
                  value={editingProxy.ipAddress || ''}
                  onChange={(e) => setEditingProxy({ ...editingProxy, ipAddress: e.target.value })}
                  placeholder="198.51.100.42"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#07090E] border border-white/10 font-mono text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300">Port</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={65535}
                  value={editingProxy.port || 1080}
                  onChange={(e) => setEditingProxy({ ...editingProxy, port: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#07090E] border border-white/10 font-mono text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300">Username</label>
                <input
                  type="text"
                  required
                  value={editingProxy.username || ''}
                  onChange={(e) => setEditingProxy({ ...editingProxy, username: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#07090E] border border-white/10 font-mono text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300">Password</label>
                <input
                  type="text"
                  required
                  value={editingProxy.password || ''}
                  onChange={(e) => setEditingProxy({ ...editingProxy, password: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#07090E] border border-white/10 font-mono text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300">Protocol</label>
                <select
                  value={editingProxy.protocol || 'SOCKS5'}
                  onChange={(e) =>
                    setEditingProxy({ ...editingProxy, protocol: e.target.value as ProxyProtocol })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-white"
                >
                  <option value="SOCKS5">SOCKS5</option>
                  <option value="HTTP">HTTP</option>
                  <option value="HTTPS">HTTPS</option>
                  <option value="SOCKS5/HTTP">SOCKS5/HTTP</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-300">Status</label>
                <select
                  value={editingProxy.status || 'active'}
                  onChange={(e) =>
                    setEditingProxy({ ...editingProxy, status: e.target.value as ProxyStatus })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-300">Country</label>
                <input
                  type="text"
                  required
                  value={editingProxy.country || ''}
                  onChange={(e) => setEditingProxy({ ...editingProxy, country: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300">Location / City</label>
                <input
                  type="text"
                  required
                  value={editingProxy.location || ''}
                  onChange={(e) => setEditingProxy({ ...editingProxy, location: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-white"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-slate-300">Assign to User</label>
                <select
                  value={editingProxy.assignedUserId || ''}
                  onChange={(e) => {
                    const u = users.find((item) => item.uid === e.target.value);
                    setEditingProxy({
                      ...editingProxy,
                      assignedUserId: u ? u.uid : '',
                      assignedUserEmail: u ? u.email : '',
                    });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-white"
                >
                  <option value="">Unassigned (Pool)</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-slate-300">Expiration Date</label>
                <input
                  type="date"
                  required
                  value={
                    editingProxy.expiresAt
                      ? new Date(editingProxy.expiresAt).toISOString().slice(0, 10)
                      : ''
                  }
                  onChange={(e) =>
                    setEditingProxy({
                      ...editingProxy,
                      expiresAt: new Date(`${e.target.value}T23:59:59Z`),
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingProxy(null)}
                className="px-4 py-2 rounded-xl border border-white/15 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProxy}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium"
              >
                {savingProxy ? 'Saving...' : 'Save Proxy Node'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MODAL: EDIT PACKAGE */}
      <AnimatePresence>
      {editingPackage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.form
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handleSavePackage}
            className="max-w-md w-full glass-elevated rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Edit {editingPackage.name}</h3>
              <button
                type="button"
                onClick={() => setEditingPackage(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 col-span-2">
                <label className="text-slate-300">Package Name</label>
                <input
                  type="text"
                  required
                  value={editingPackage.name}
                  onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300">Original Price ($)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={editingPackage.originalPrice}
                  onChange={(e) =>
                    setEditingPackage({ ...editingPackage, originalPrice: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 font-mono text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300">Discount (%)</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={99}
                  value={editingPackage.discountPercent}
                  onChange={(e) =>
                    setEditingPackage({ ...editingPackage, discountPercent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 font-mono text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300">Final Price ($)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={editingPackage.finalPrice}
                  onChange={(e) =>
                    setEditingPackage({ ...editingPackage, finalPrice: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 font-mono text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300">Duration (Days)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editingPackage.durationDays}
                  onChange={(e) =>
                    setEditingPackage({ ...editingPackage, durationDays: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 font-mono text-white"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-slate-300">Features (one per line)</label>
                <textarea
                  rows={4}
                  value={pkgFeaturesText}
                  onChange={(e) => setPkgFeaturesText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white"
                />
              </div>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={editingPackage.enabled}
                  onChange={(e) =>
                    setEditingPackage({ ...editingPackage, enabled: e.target.checked })
                  }
                />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={editingPackage.isBestValue}
                  onChange={(e) =>
                    setEditingPackage({ ...editingPackage, isBestValue: e.target.checked })
                  }
                />
                Best Value
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingPackage(null)}
                className="px-4 py-2 rounded-xl border border-white/15 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingPackage}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium"
              >
                {savingPackage ? 'Saving...' : 'Save Package'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

const StatTile: React.FC<{
  label: string;
  value: number;
  tone?: 'default' | 'emerald' | 'amber' | 'rose';
  index?: number;
}> = ({ label, value, tone = 'default', index = 0 }) => {
  const color =
    tone === 'emerald'
      ? 'text-emerald-400'
      : tone === 'amber'
        ? 'text-amber-400'
        : tone === 'rose'
          ? 'text-rose-400'
          : 'text-white';
  const accentBar =
    tone === 'emerald'
      ? 'from-emerald-400/70 to-emerald-500/10'
      : tone === 'amber'
        ? 'from-[#F0B90B]/80 to-amber-500/10'
        : tone === 'rose'
          ? 'from-rose-400/70 to-rose-500/10'
          : 'from-violet-400/70 to-indigo-500/10';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.045, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="relative overflow-hidden glass-surface rounded-2xl p-4 space-y-1 transition-colors hover:border-violet-400/35"
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accentBar}`} />
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-2xl font-semibold font-mono tabular-nums ${color}`}>{value}</p>
    </motion.div>
  );
};
