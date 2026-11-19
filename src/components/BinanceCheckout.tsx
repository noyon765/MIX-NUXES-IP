import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  FileCheck2,
  ImagePlus,
  Lock,
  MessageCircle,
  ShieldAlert,
} from 'lucide-react';
import { validateAndCompressImage } from '../lib/imageUtils.ts';
import { submitBinancePayment } from '../services/apiService.ts';
import {
  PaymentSettings,
  SiteSettings,
  SubscriptionPackage,
  UserProfile,
} from '../types/index.ts';
import { BinanceLogo } from './BinanceLogo.tsx';

interface BinanceCheckoutProps {
  pkg: SubscriptionPackage;
  user: UserProfile;
  paymentSettings: PaymentSettings;
  siteSettings: SiteSettings;
  onBack: () => void;
  onSubmitted: (paymentId: string) => void;
}

export const BinanceCheckout: React.FC<BinanceCheckoutProps> = ({
  pkg,
  user,
  paymentSettings,
  siteSettings,
  onBack,
  onSubmitted,
}) => {
  const [transactionId, setTransactionId] = useState('');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [copiedField, setCopiedField] = useState<'name' | 'uid' | 'wallet' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const estimatedExpiry = new Date(Date.now() + pkg.durationDays * 24 * 60 * 60 * 1000);
  const telegramHref = `https://t.me/${siteSettings.telegramUsername.replace(/^@+/, '')}`;

  const handleCopy = async (text: string, field: 'name' | 'uid' | 'wallet') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      setError('Clipboard access unavailable. Please copy the value manually.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await validateAndCompressImage(file);
      setScreenshotDataUrl(compressed);
      setFileName(file.name);
    } catch (err) {
      setScreenshotDataUrl('');
      setFileName('');
      setError(err instanceof Error ? err.message : 'Failed to process screenshot.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (user.status === 'suspended') {
      setError('Your account is currently suspended. Contact support on Telegram.');
      return;
    }
    if (transactionId.trim().length < 4) {
      setError('Enter the valid Binance Transaction ID / Order ID (at least 4 characters).');
      return;
    }
    if (!screenshotDataUrl) {
      setError('Upload a screenshot of your completed Binance payment.');
      return;
    }

    setSubmitting(true);
    try {
      const payment = await submitBinancePayment({
        packageId: pkg.id,
        transactionId: transactionId.trim(),
        screenshotDataUrl,
      });
      onSubmitted(payment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit payment request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#07090E] bg-luxury-mesh py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Packages
          </button>
          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium text-violet-300 hover:text-violet-200"
          >
            <MessageCircle className="w-4 h-4" />
            Need help? @{siteSettings.telegramUsername.replace(/^@+/, '')}
          </a>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left Column: Package Summary & Binance Destination Details */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-elevated rounded-2xl p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-violet-300">Selected Package</p>
                  <h1 className="text-2xl font-semibold text-white mt-1">{pkg.name}</h1>
                </div>
                <span className="text-xs font-mono tabular-nums text-emerald-400 font-semibold">
                  {pkg.discountPercent}% OFF
                </span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-white/10 text-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Original Price</span>
                  <span className="font-mono tabular-nums line-through">${pkg.originalPrice}.00</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Discount Applied</span>
                  <span className="font-mono tabular-nums text-emerald-400">
                    -${(pkg.originalPrice - pkg.finalPrice).toFixed(2)} ({pkg.discountPercent}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Subscription Duration</span>
                  <span className="font-mono tabular-nums text-white">{pkg.durationDays} Days</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Projected Expiration (upon approval)</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {estimatedExpiry.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-baseline justify-between">
                <span className="text-sm font-medium text-slate-300">Final Payable Amount</span>
                <span className="text-3xl font-semibold font-mono tabular-nums text-white">
                  ${pkg.finalPrice} USDT
                </span>
              </div>
            </div>

            <div className="glass-surface rounded-2xl p-6 space-y-5 border border-[#F0B90B]/20">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <BinanceLogo size={22} />
                  <h2 className="text-base font-semibold text-white">
                    Transfer Destination
                  </h2>
                </div>
                <Lock className="w-4 h-4 text-[#F0B90B]" />
              </div>

              {/* Binance Account Name */}
              <div className="space-y-1.5">
                <label className="block text-xs text-slate-400">Binance Account Name</label>
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#07090E] border border-white/10">
                  <span className="font-mono text-sm text-white truncate">
                    {paymentSettings.binanceName}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy(paymentSettings.binanceName, 'name')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0B90B]/15 hover:bg-[#F0B90B]/25 text-[#F0B90B] text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
                  >
                    {copiedField === 'name' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Name
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Binance UID */}
              <div className="space-y-1.5">
                <label className="block text-xs text-slate-400">Binance Pay UID</label>
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#07090E] border border-white/10">
                  <span className="font-mono text-sm text-white truncate tabular-nums">
                    {paymentSettings.binanceUid}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy(paymentSettings.binanceUid, 'uid')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 text-violet-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
                  >
                    {copiedField === 'uid' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy UID
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Binance Wallet Address */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs text-slate-400">Binance Wallet Address</label>
                  <span className="text-xs font-mono text-[#F0B90B]">
                    {paymentSettings.binanceNetwork}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#07090E] border border-white/10">
                  <span className="font-mono text-xs sm:text-sm text-white break-all">
                    {paymentSettings.binanceWalletAddress}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy(paymentSettings.binanceWalletAddress, 'wallet')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 text-violet-200 text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
                  >
                    {copiedField === 'wallet' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Address
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 space-y-1.5">
                <p className="text-xs font-medium text-slate-200">Payment Instructions</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {paymentSettings.paymentInstructions}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Payment Proof Submission Form */}
          <div className="lg:col-span-7 glass-surface rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-violet-300">Step 2 · Verification Queue</p>
              <h2 className="text-xl font-semibold text-white">Submit Binance Payment Proof</h2>
              <p className="text-sm text-slate-400">
                Submitting your Transaction ID and receipt queues an order in Pending status. Your subscription activates once an administrator confirms receipt.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Binance Transaction ID / Pay Order ID
                </label>
                <input
                  type="text"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. 294810482910 or Internal TxID"
                  className="w-full px-4 py-3 rounded-xl bg-[#07090E] border border-white/10 focus:border-violet-500 focus:outline-none text-sm font-mono text-white placeholder:text-slate-600 min-h-[46px]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  Payment Screenshot Upload (PNG, JPG, WebP)
                </label>

                <label className="block cursor-pointer rounded-2xl border border-dashed border-white/20 hover:border-violet-400/60 bg-[#07090E]/70 p-6 text-center transition-colors">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => void handleFileChange(e)}
                    className="sr-only"
                  />
                  {screenshotDataUrl ? (
                    <div className="space-y-3">
                      <img
                        src={screenshotDataUrl}
                        alt="Uploaded Binance receipt preview"
                        className="max-h-60 mx-auto rounded-xl border border-white/10 object-contain"
                      />
                      <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
                        <FileCheck2 className="w-4 h-4" />
                        <span>{fileName || 'Receipt attached'} · Tap to replace</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <ImagePlus className="w-8 h-8 text-violet-400 mx-auto" />
                      <p className="text-sm font-medium text-slate-200">
                        Select or tap to upload payment screenshot
                      </p>
                      <p className="text-xs text-slate-500">
                        Must clearly show the ${pkg.finalPrice} USDT amount and Transaction ID
                      </p>
                    </div>
                  )}
                </label>
              </div>

              <div className="p-4 rounded-xl bg-[#07090E] border border-white/10 flex items-start gap-3 text-xs text-slate-400 leading-relaxed">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Uploaded screenshots are inspected by an administrator against Binance ledger records. Never rely on automated instant unlock; status begins as <span className="text-amber-300 font-medium">Pending</span>.
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors min-h-[48px] disabled:opacity-60"
              >
                {submitting ? 'Submitting Payment Proof...' : `Submit Payment ($${pkg.finalPrice} USDT)`}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
