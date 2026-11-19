import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AuthView } from './components/AuthView.tsx';
import { BinanceCheckout } from './components/BinanceCheckout.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { LoadingScreen } from './components/LoadingScreen.tsx';
import { Navbar } from './components/Navbar.tsx';
import { OfflineIndicator } from './components/PWAInstallButton.tsx';
import { UserDashboard } from './components/UserDashboard.tsx';
import {
  DEFAULT_PACKAGES,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_SITE_SETTINGS,
} from './lib/defaults.ts';
import {
  fetchAdminOverview,
  fetchBootstrap,
  fetchMyWorkspace,
  getStoredToken,
  logoutAccount,
  setStoredToken,
} from './services/apiService.ts';
import {
  AppView,
  AuditLog,
  AuthMode,
  DashboardTab,
  PaymentRequest,
  PaymentSettings,
  ProxyNode,
  SiteSettings,
  SubscriptionPackage,
  SubscriptionRecord,
  UserProfile,
} from './types/index.ts';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<AppView>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<AuthMode>('login');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('overview');
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);

  // Public & Shared Catalog State
  const [packages, setPackages] = useState<SubscriptionPackage[]>(DEFAULT_PACKAGES);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);

  // Private User State
  const [userPayments, setUserPayments] = useState<PaymentRequest[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [userProxies, setUserProxies] = useState<ProxyNode[]>([]);

  // Admin State
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentRequest[]>([]);
  const [allSubscriptions, setAllSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [allProxies, setAllProxies] = useState<ProxyNode[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    document.title = `${siteSettings.siteName} — ${siteSettings.tagline}`;
  }, [siteSettings.siteName, siteSettings.tagline]);

  const clearSessionState = useCallback(() => {
    setUserProfile(null);
    setUserPayments([]);
    setUserSubscriptions([]);
    setUserProxies([]);
    setAllUsers([]);
    setAllPayments([]);
    setAllSubscriptions([]);
    setAllProxies([]);
    setAuditLogs([]);
    setView((prev) =>
      prev === 'dashboard' || prev === 'checkout' || prev === 'admin' ? 'landing' : prev
    );
  }, []);

  const refreshBootstrap = useCallback(async () => {
    const boot = await fetchBootstrap();
    setPackages(boot.packages);
    setSiteSettings(boot.siteSettings);
  }, []);

  const refreshWorkspace = useCallback(async () => {
    if (!getStoredToken()) {
      clearSessionState();
      return null;
    }
    try {
      const ws = await fetchMyWorkspace();
      setUserProfile(ws.user);
      setPaymentSettings(ws.paymentSettings);
      setUserPayments(ws.payments);
      setUserSubscriptions(ws.subscriptions);
      setUserProxies(ws.proxies);
      return ws.user;
    } catch {
      setStoredToken(null);
      clearSessionState();
      return null;
    }
  }, [clearSessionState]);

  const refreshAdmin = useCallback(async () => {
    if (!getStoredToken()) return;
    try {
      const overview = await fetchAdminOverview();
      setAllUsers(overview.users);
      setAllPayments(overview.payments);
      setAllSubscriptions(overview.subscriptions);
      setAllProxies(overview.proxies);
      setPackages(overview.packages);
      setSiteSettings(overview.siteSettings);
      setPaymentSettings(overview.paymentSettings);
      setAuditLogs(overview.auditLogs);
    } catch {
      // Non-admin or expired session handled gracefully
    }
  }, []);

  // Initial load: public catalog + existing session
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        await refreshBootstrap();
        if (getStoredToken()) {
          const user = await refreshWorkspace();
          if (mounted && user?.role === 'admin') {
            await refreshAdmin();
          }
        }
      } catch (err) {
        console.error('Bootstrap error:', err);
      } finally {
        if (mounted) setAuthReady(true);
      }
    };
    void init();
    return () => {
      mounted = false;
    };
  }, [refreshAdmin, refreshBootstrap, refreshWorkspace]);

  // Background refresh every 5 seconds while signed in
  useEffect(() => {
    if (!userProfile) return;
    const interval = setInterval(() => {
      void refreshBootstrap().catch(() => undefined);
      void refreshWorkspace().then((u) => {
        if (u?.role === 'admin') {
          void refreshAdmin();
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshAdmin, refreshBootstrap, refreshWorkspace, userProfile]);

  const handleSelectPackage = (pkg: SubscriptionPackage) => {
    setSelectedPackage(pkg);
    if (!userProfile) {
      setAuthInitialMode('login');
      setView('auth');
    } else {
      setView('checkout');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = async (profile: UserProfile) => {
    setUserProfile(profile);
    await refreshWorkspace();
    if (profile.role === 'admin') {
      await refreshAdmin();
    }
    if (selectedPackage) {
      setView('checkout');
    } else if (profile.role === 'admin' && authInitialMode === 'admin') {
      setView('admin');
    } else {
      setView('dashboard');
      setDashboardTab('overview');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await logoutAccount();
    setSelectedPackage(null);
    clearSessionState();
    setView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavigate = (nextView: AppView) => {
    if ((nextView === 'dashboard' || nextView === 'checkout') && !userProfile) {
      setAuthInitialMode('login');
      setView('auth');
      return;
    }
    if (nextView === 'admin' && userProfile?.role !== 'admin') {
      setAuthInitialMode('admin');
      setView('auth');
      return;
    }
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAdminPanel = () => {
    if (userProfile?.role === 'admin') {
      void refreshAdmin();
      setView('admin');
    } else {
      setAuthInitialMode('admin');
      setView('auth');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <ErrorBoundary>
      <AnimatePresence>
        {!authReady && (
          <LoadingScreen
            siteName={siteSettings.siteName}
            tagline={siteSettings.tagline}
            logoUrl={siteSettings.logoUrl}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-[#07090E] text-slate-100">
        <Navbar
          siteSettings={siteSettings}
          userProfile={userProfile}
          currentView={view}
          onNavigate={handleNavigate}
          onOpenAdminPanel={handleOpenAdminPanel}
          onScrollToSection={handleScrollToSection}
        />

        {view === 'landing' && (
          <LandingPage
            packages={packages}
            siteSettings={siteSettings}
            userProfile={userProfile}
            onSelectPackage={handleSelectPackage}
            onOpenAuth={() => {
              setAuthInitialMode('login');
              handleNavigate('auth');
            }}
            onOpenDashboard={() => handleNavigate('dashboard')}
          />
        )}

        {view === 'auth' && (
          <AuthView
            siteSettings={siteSettings}
            pendingPackageName={selectedPackage?.name || null}
            initialMode={authInitialMode}
            onSuccess={(profile) => {
              void handleAuthSuccess(profile);
            }}
            onBack={() => handleNavigate('landing')}
          />
        )}

        {view === 'checkout' && userProfile && selectedPackage && (
          <BinanceCheckout
            pkg={selectedPackage}
            user={userProfile}
            paymentSettings={paymentSettings}
            siteSettings={siteSettings}
            onBack={() => handleNavigate(userProfile ? 'dashboard' : 'landing')}
            onSubmitted={() => {
              setSelectedPackage(null);
              void refreshWorkspace();
              setDashboardTab('billing');
              setView('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {view === 'dashboard' && userProfile && (
          <UserDashboard
            user={userProfile}
            siteSettings={siteSettings}
            packages={packages}
            payments={userPayments}
            subscriptions={userSubscriptions}
            proxies={userProxies}
            activeTab={dashboardTab}
            onTabChange={setDashboardTab}
            onSelectPackage={handleSelectPackage}
            onOpenAdmin={handleOpenAdminPanel}
            onProfileUpdated={(updated) => setUserProfile(updated)}
            onLoggedOut={() => {
              setSelectedPackage(null);
              clearSessionState();
              setView('landing');
            }}
          />
        )}

        {view === 'admin' && userProfile?.role === 'admin' && (
          <AdminDashboard
            users={allUsers}
            payments={allPayments}
            subscriptions={allSubscriptions}
            proxies={allProxies}
            packages={packages}
            siteSettings={siteSettings}
            paymentSettings={paymentSettings}
            auditLogs={auditLogs}
            onBackToClient={() => handleNavigate('dashboard')}
            onRefreshAdmin={refreshAdmin}
            onLogout={handleLogout}
          />
        )}

        <OfflineIndicator />
      </div>
    </ErrorBoundary>
  );
}
