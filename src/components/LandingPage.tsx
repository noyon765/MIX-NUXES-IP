import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  Clock,
  Lock,
  MessageCircle,
  Server,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { GENERATED_ASSETS } from '../lib/defaults.ts';
import { SiteSettings, SubscriptionPackage, UserProfile } from '../types/index.ts';
import { BinanceLogo } from './BinanceLogo.tsx';
import { BrandMark } from './BrandMark.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface LandingPageProps {
  packages: SubscriptionPackage[];
  siteSettings: SiteSettings;
  userProfile: UserProfile | null;
  onSelectPackage: (pkg: SubscriptionPackage) => void;
  onOpenAuth: () => void;
  onOpenDashboard: () => void;
}

type PolicyDocKey = 'terms' | 'privacy' | 'refund' | 'acceptable';

export const LandingPage: React.FC<LandingPageProps> = ({
  packages,
  siteSettings,
  userProfile,
  onSelectPackage,
  onOpenAuth,
  onOpenDashboard,
}) => {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [bladesImgFailed, setBladesImgFailed] = useState(false);
  const [emblemImgFailed, setEmblemImgFailed] = useState(false);
  const [activePolicy, setActivePolicy] = useState<PolicyDocKey | null>(null);

  const visiblePackages = packages.filter((p) => p.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const telegramHandle = siteSettings.telegramUsername.replace(/^@+/, '');
  const telegramHref = `https://t.me/${telegramHandle}`;

  const policyContent: Record<
    PolicyDocKey,
    { title: string; subtitle: string; points: string[] }
  > = {
    terms: {
      title: 'Terms of Service',
      subtitle: `${siteSettings.siteName} Subscription Agreement`,
      points: [
        'Subscriptions grant isolated access to dedicated SOCKS5/HTTP(S) proxy credentials for the exact duration of the verified package (30, 60, 180, or 365 days).',
        'Access credentials are provisioned strictly to the purchasing account and may not be resold, shared publicly, or transferred without written authorization.',
        'Account status and expiration timestamps are enforced automatically according to the verified activation date.',
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'Account & Credential Isolation Standard',
      points: [
        'We collect only the account fields required to operate your subscription: full name, unique username, email address, and Binance payment verification metadata.',
        'Assigned proxy hosts, ports, usernames, and passwords are isolated per account so no other client can view or query your credentials.',
        'Passwords are protected with salted scrypt cryptographic hashing and authenticated via short-lived signed session tokens.',
      ],
    },
    refund: {
      title: 'Payment & Verification Policy',
      subtitle: 'Binance Pay & USDT (TRC20) Settlement',
      points: [
        'All package settlements are processed exclusively through Binance using the official UID or USDT TRC20 address displayed on the checkout screen.',
        'Submitting a payment form creates a Pending verification request. Subscriptions are never activated until an administrator independently confirms the Binance transaction.',
        `For transfer discrepancies or TxID corrections, contact our Telegram support desk (@${telegramHandle}) with your account email and Transaction ID.`,
      ],
    },
    acceptable: {
      title: 'Acceptable Use Policy',
      subtitle: 'Network Integrity & Abuse Prevention',
      points: [
        'Dedicated proxy endpoints must only be used for lawful connectivity, privacy protection, automated QA, and authorized business routing.',
        'Credential stuffing, distributed denial-of-service traffic, unsolicited spam, or unauthorized network intrusion results in immediate suspension without refund.',
        'We reserve the right to rotate or suspend any endpoint flagged for abusive traffic to protect network reputation for all subscribers.',
      ],
    },
  };

  return (
    <div className="min-h-screen bg-[#07090E] bg-luxury-mesh text-slate-100">
      {/* Optional Admin Announcement Bar */}
      {siteSettings.announcementActive && siteSettings.announcementText.trim().length > 0 && (
        <div className="border-b border-violet-500/25 bg-violet-950/35 px-4 py-2.5 text-center text-xs sm:text-sm text-violet-100">
          <span>{siteSettings.announcementText}</span>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-architectural-grid opacity-60 pointer-events-none" />
        <div className="pointer-events-none absolute -top-28 left-1/4 w-96 h-96 rounded-full bg-violet-600/15 blur-3xl animate-ambient" />
        <div className="pointer-events-none absolute -bottom-24 right-1/6 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl animate-orbital" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 flex flex-col justify-between space-y-8"
            >
              <div className="space-y-5">
                <p className="text-xs sm:text-sm font-medium text-violet-300 tracking-wide">
                  {siteSettings.siteName} <span className="text-slate-600 mx-1.5">/</span> {siteSettings.tagline}
                </p>

                <h1
                  className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-[1.12]"
                  style={{ textWrap: 'balance' }}
                >
                  {siteSettings.heroHeadline}
                </h1>

                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                  {siteSettings.heroSubheadline}
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="#pricing"
                    className="group relative overflow-hidden inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-violet-600/25 whitespace-nowrap shrink-0 min-h-[46px]"
                  >
                    <span className="pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-sheen" />
                    <span className="relative">View Subscription Plans</span>
                    <ArrowRight className="w-4 h-4 relative transition-transform group-hover:translate-x-0.5" />
                  </a>
                  {userProfile ? (
                    <button
                      type="button"
                      onClick={onOpenDashboard}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-100 text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[46px]"
                    >
                      Open Client Dashboard
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-100 text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[46px]"
                    >
                      Client Portal Sign In
                    </button>
                  )}
                  <PWAInstallButton />
                </div>

                {/* Clean 3-column unboxed architectural specifications */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                  <div>
                    <p className="text-xs text-slate-400">Protocols</p>
                    <p className="text-sm font-semibold text-white mt-1">SOCKS5 · HTTP(S)</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Settlement</p>
                    <p className="text-sm font-semibold text-white mt-1 flex items-center gap-1.5">
                      <BinanceLogo size={16} showWordmark={false} />
                      <span>Binance Pay · TRC20</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Provisioning</p>
                    <p className="text-sm font-semibold text-white mt-1">Dedicated Node Vault</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Hero Visual Carrier (16:9 aligned) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 flex"
            >
              <div className="group relative w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0D1322] min-h-[280px] sm:min-h-[340px] lg:h-full shadow-2xl shadow-violet-950/30">
                {!heroImgFailed ? (
                  <img
                    src={GENERATED_ASSETS.heroMonolith}
                    alt="MIX NEXUS IP private server vault infrastructure"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#0D1322] via-[#07090E] to-violet-950/30">
                    <Server className="w-12 h-12 text-violet-400 mb-3" />
                    <p className="text-sm font-medium text-slate-200">{siteSettings.siteName}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#07090E]/90 via-[#07090E]/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-violet-300 font-medium">Private Allocation</p>
                    <p className="text-base font-semibold text-white mt-0.5">
                      Isolated Credentials per Subscription
                    </p>
                  </div>
                  <p className="text-xs font-mono tabular-nums text-slate-300">
                    1M · 2M · 6M · 12M
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Architecture & Operational Workflow */}
      <section id="architecture" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <p className="text-xs font-medium text-violet-300">Operational Workflow</p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white" style={{ textWrap: 'balance' }}>
                Verified settlement before node activation
              </h2>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Every subscription moves through an auditable workflow—eliminating unverified access and ensuring each account receives dedicated credentials.
              </p>
            </div>

            <div className="group rounded-2xl overflow-hidden border border-white/10 bg-[#0D1322] aspect-[4/3]">
              {!bladesImgFailed ? (
                <img
                  src={GENERATED_ASSETS.opticalBlades}
                  alt="Dedicated optical network routing blades"
                  referrerPolicy="no-referrer"
                  onError={() => setBladesImgFailed(true)}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#0D1322]">
                  <Server className="w-10 h-10 text-violet-400" />
                </div>
              )}
            </div>
          </motion.div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 content-center">
            {[
              {
                step: '01. Select & Authenticate',
                title: 'Protected Client Access',
                desc: 'Register in seconds with a unique username, salted password encryption, and instant self-service recovery.',
              },
              {
                step: '02. Binance Settlement',
                title: 'UID & Wallet Transfer',
                desc: 'Transfer the discounted package total via Binance UID or TRC20 address and upload your Transaction ID and screenshot.',
              },
              {
                step: '03. Manual Verification',
                title: 'Zero Unverified Activations',
                desc: 'Administrators independently verify each Binance transaction before activating your subscription and calculating expiration.',
              },
              {
                step: '04. Credential Vault',
                title: 'Private Proxy Delivery',
                desc: 'View and copy your assigned IP, port, username, password, protocol, and region exclusively from your dashboard.',
              },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="glass-surface luxury-card-interactive rounded-2xl p-6 space-y-3"
              >
                <p className="text-xs font-mono text-violet-300">{item.step}</p>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing & Subscription Packages */}
      <section id="pricing" className="relative border-y border-white/10 bg-[#0A0E18]/85 py-16 sm:py-24 overflow-hidden">
        <div className="pointer-events-none absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-violet-600/12 blur-3xl animate-ambient" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-medium text-violet-300">Subscription Packages</p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white" style={{ textWrap: 'balance' }}>
                Transparent duration tiers with automated expiration
              </h2>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                Every plan includes private credential isolation, Binance Pay verification, and direct Telegram support access.
              </p>
            </div>

            <div className="glass-surface rounded-2xl px-5 py-4 border border-[#F0B90B]/25 flex items-center gap-4 shrink-0">
              <BinanceLogo size={28} />
              <div className="border-l border-white/10 pl-4">
                <p className="text-xs font-medium text-white">Verified Binance-Only Checkout</p>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Binance Pay UID &amp; USDT (TRC20)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
            {visiblePackages.map((pkg, idx) => {
              const isBest = pkg.isBestValue;
              const tierIndex = String(idx + 1).padStart(2, '0');
              const tierAccentBar = isBest
                ? 'from-[#F0B90B] via-violet-500 to-indigo-400'
                : idx === 2
                  ? 'from-violet-500 via-purple-400 to-indigo-500'
                  : idx === 1
                    ? 'from-indigo-400 via-violet-400 to-sky-400'
                    : 'from-slate-500 via-violet-400/70 to-slate-600';
              const tierSubtitle = isBest
                ? 'Maximum annual savings'
                : idx === 2
                  ? 'Extended semi-annual node'
                  : idx === 1
                    ? 'Dual-month continuity'
                    : 'Starter monthly access';

              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.38, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -6 }}
                  className={`group relative rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 ${
                    isBest
                      ? 'bg-gradient-to-b from-[#171530]/95 via-[#0E1324]/95 to-[#080B14] border border-violet-400/45 shadow-2xl shadow-violet-950/50'
                      : 'bg-gradient-to-b from-[#10172A]/85 via-[#0B101D]/90 to-[#080B14] border border-white/10 hover:border-violet-400/35'
                  }`}
                >
                  {/* Architectural Top Accent Strip */}
                  <div className={`h-1 w-full bg-gradient-to-r ${tierAccentBar}`} />

                  {/* Luxury Sheen Sweep on Best Value */}
                  {isBest && (
                    <span className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-[#F0B90B]/10 to-transparent animate-sheen" />
                  )}

                  {/* Subtle Radial Spotlight on Hover / Best Value */}
                  <div
                    className={`pointer-events-none absolute -top-20 -right-20 w-44 h-44 rounded-full blur-3xl transition-opacity duration-300 ${
                      isBest
                        ? 'bg-[#F0B90B]/15 opacity-90'
                        : 'bg-violet-600/15 opacity-0 group-hover:opacity-100'
                    }`}
                  />

                  <div className="p-6 flex-1 flex flex-col justify-between relative">
                    <div className="space-y-6">
                      {/* Header Row */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs tracking-widest text-slate-500">
                            TIER {tierIndex}
                          </span>
                          {isBest ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#F0B90B]">
                              <Sparkles className="w-3.5 h-3.5" />
                              Best Value
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-slate-400">
                              {pkg.durationDays}d
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-white tracking-tight">
                            {pkg.name}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">{tierSubtitle}</p>
                        </div>
                      </div>

                      {/* Price Display Block */}
                      <div className="p-4 rounded-xl bg-[#07090E]/85 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-mono tabular-nums text-slate-500 line-through">
                            ${pkg.originalPrice}.00
                          </span>
                          <span
                            className={`text-xs font-semibold font-mono tabular-nums ${
                              isBest ? 'text-[#F0B90B]' : 'text-emerald-400'
                            }`}
                          >
                            {pkg.discountPercent}% OFF
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between gap-2">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-4xl font-semibold font-mono tabular-nums text-white tracking-tight">
                              ${pkg.finalPrice}
                            </span>
                            <span className="text-xs font-mono text-slate-400">USDT</span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                            <Clock className="w-3 h-3 text-violet-400" />
                            {pkg.durationLabel}
                          </span>
                        </div>
                      </div>

                      {/* Feature Checklist */}
                      <ul className="space-y-2.5">
                        {pkg.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                            <Check
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                isBest ? 'text-[#F0B90B]' : 'text-violet-400'
                              }`}
                            />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-7">
                      <button
                        type="button"
                        onClick={() => onSelectPackage(pkg)}
                        className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 min-h-[46px] whitespace-nowrap ${
                          isBest
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/25'
                            : 'bg-white/10 hover:bg-violet-600 text-white border border-white/10 hover:border-violet-500'
                        }`}
                      >
                        Buy Now
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security & Telegram Support Section */}
      <section id="security" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 glass-surface luxury-card-interactive rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6"
          >
            <div className="aspect-square max-w-[220px] rounded-xl overflow-hidden border border-white/10 bg-[#07090E]">
              {!emblemImgFailed ? (
                <img
                  src={GENERATED_ASSETS.brandEmblem}
                  alt="MIX NEXUS IP security emblem"
                  referrerPolicy="no-referrer"
                  onError={() => setEmblemImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BrandMark logoUrl={siteSettings.logoUrl} size={64} />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-violet-300">Credential Isolation</p>
              <h3 className="text-xl font-semibold text-white">Zero Cross-Account Visibility</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Proxy hosts, ports, usernames, and passwords are protected at the server authorization layer so only the assigned owner and verified administrators can inspect them.
              </p>
            </div>
          </motion.div>

          <motion.div
            id="support"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 glass-surface luxury-card-interactive rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-8"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-medium text-violet-300">
                <ShieldCheck className="w-4 h-4" />
                <span>Dedicated Operator Desk</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Direct Telegram Customer Support
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                {siteSettings.supportInstructions}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Official Telegram Handle</p>
                <p className="text-base font-mono font-medium text-white">
                  @{telegramHandle}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400">Payment Channel</p>
                <p className="text-base font-medium text-white flex items-center gap-2.5">
                  <BinanceLogo size={20} />
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-violet-400" />
                    Verified Only
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={telegramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors whitespace-nowrap min-h-[46px]"
              >
                <MessageCircle className="w-4 h-4" />
                Contact Support on Telegram
              </a>
              <button
                type="button"
                onClick={userProfile ? onOpenDashboard : onOpenAuth}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-medium transition-colors whitespace-nowrap min-h-[46px]"
              >
                {userProfile ? 'Manage Subscriptions' : 'Create Client Account'}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Comprehensive Realistic Enterprise Footer */}
      <footer className="border-t border-white/10 bg-[#05070B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
            {/* Brand Overview */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-3">
                <BrandMark logoUrl={siteSettings.logoUrl} size={32} />
                <div>
                  <p className="text-base font-semibold text-white">{siteSettings.siteName}</p>
                  <p className="text-xs text-violet-300">{siteSettings.tagline}</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
                Dedicated static IP and private SOCKS5 / HTTP(S) proxy subscription management platform engineered for isolated credential delivery and verified Binance settlement.
              </p>
              <div className="pt-1 flex items-center gap-3">
                <BinanceLogo size={18} />
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs font-mono text-slate-400">USDT (TRC20)</span>
              </div>
            </div>

            {/* Platform Navigation */}
            <div className="lg:col-span-2 space-y-3">
              <p className="text-xs font-semibold text-white tracking-wide">Platform</p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
                <li>
                  <a href="#architecture" className="hover:text-white transition-colors">
                    Architecture
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Subscription Plans
                  </a>
                </li>
                <li>
                  <a href="#security" className="hover:text-white transition-colors">
                    Security &amp; Isolation
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={userProfile ? onOpenDashboard : onOpenAuth}
                    className="hover:text-white transition-colors text-left"
                  >
                    {userProfile ? 'Client Dashboard' : 'Client Sign In'}
                  </button>
                </li>
              </ul>
            </div>

            {/* Service & Infrastructure Details */}
            <div className="lg:col-span-3 space-y-3">
              <p className="text-xs font-semibold text-white tracking-wide">Service Specifications</p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
                <li className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
                  <span>Protocols</span>
                  <span className="font-mono text-slate-200">SOCKS5 · HTTP(S)</span>
                </li>
                <li className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
                  <span>Plan Cycles</span>
                  <span className="font-mono tabular-nums text-slate-200">30 · 60 · 180 · 365d</span>
                </li>
                <li className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
                  <span>Verification</span>
                  <span className="text-slate-200">Manual Binance Audit</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>Support Desk</span>
                  <a
                    href={telegramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-violet-300 hover:text-violet-200 transition-colors"
                  >
                    @{telegramHandle}
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal & Policies */}
            <div className="lg:col-span-3 space-y-3">
              <p className="text-xs font-semibold text-white tracking-wide">Policies &amp; Support</p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => setActivePolicy('terms')}
                    className="hover:text-white transition-colors text-left"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActivePolicy('privacy')}
                    className="hover:text-white transition-colors text-left"
                  >
                    Privacy &amp; Data Isolation
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActivePolicy('refund')}
                    className="hover:text-white transition-colors text-left"
                  >
                    Binance Verification &amp; Refund Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActivePolicy('acceptable')}
                    className="hover:text-white transition-colors text-left"
                  >
                    Acceptable Use Policy
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
            <p>
              © {new Date().getFullYear()} {siteSettings.siteName}. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-slate-400">
              <span>Binance-Only Settlement</span>
              <span aria-hidden="true">·</span>
              <span>Private Credential Vault</span>
              <span aria-hidden="true">·</span>
              <a
                href={telegramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-300 hover:text-white transition-colors"
              >
                t.me/{telegramHandle}
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Policy Modal */}
      <AnimatePresence>
        {activePolicy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setActivePolicy(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-lg w-full glass-elevated rounded-2xl p-6 sm:p-7 space-y-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-violet-300">
                    {policyContent[activePolicy].subtitle}
                  </p>
                  <h3 className="text-xl font-semibold text-white mt-1">
                    {policyContent[activePolicy].title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePolicy(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                  aria-label="Close policy dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ul className="space-y-3 text-sm text-slate-300 leading-relaxed">
                {policyContent[activePolicy].points.map((point, index) => (
                  <li key={index} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0 mt-1" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/10">
                <a
                  href={telegramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-violet-300 hover:text-violet-200 transition-colors"
                >
                  Questions? Contact @{telegramHandle}
                </a>
                <button
                  type="button"
                  onClick={() => setActivePolicy(null)}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium min-h-[38px]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
