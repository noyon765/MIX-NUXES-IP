import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Shield,
  ShieldAlert,
  User,
} from 'lucide-react';
import {
  completePasswordReset,
  isUsernameAvailable,
  loginAccount,
  registerAccount,
  requestPasswordReset,
} from '../services/apiService.ts';
import { AuthMode, SiteSettings, UserProfile } from '../types/index.ts';
import { BrandMark } from './BrandMark.tsx';

interface AuthViewProps {
  siteSettings: SiteSettings;
  pendingPackageName?: string | null;
  initialMode?: AuthMode;
  onSuccess: (profile: UserProfile) => void;
  onBack: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  siteSettings,
  pendingPackageName,
  initialMode = 'login',
  onSuccess,
  onBack,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [issuedCodeHint, setIssuedCodeHint] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setNotice('');
    setResetStep('request');
    setIssuedCodeHint('');
  }, [initialMode]);

  useEffect(() => {
    if (mode !== 'register') return;
    const clean = username.trim().toLowerCase();
    if (!clean) {
      setUsernameStatus('idle');
      return;
    }
    if (!/^[a-z0-9_.-]{3,32}$/.test(clean)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(clean);
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (mode === 'forgot') {
      if (resetStep === 'request') {
        if (!email.trim()) {
          setError('Enter the email address associated with your account.');
          return;
        }
        setLoading(true);
        try {
          const res = await requestPasswordReset(email);
          setNotice(res.message);
          if (res.resetCode) {
            setIssuedCodeHint(res.resetCode);
          }
          setResetStep('confirm');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unable to initiate password reset.');
        } finally {
          setLoading(false);
        }
        return;
      }

      if (!resetCode.trim() || password.length < 8) {
        setError('Enter the 6-digit verification code and a new password (at least 8 characters).');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setLoading(true);
      try {
        const res = await completePasswordReset({
          email,
          code: resetCode,
          newPassword: password,
        });
        setNotice(res.message);
        setResetStep('request');
        setResetCode('');
        setPassword('');
        setConfirmPassword('');
        setIssuedCodeHint('');
        setMode('login');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Password reset failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'register') {
      if (fullName.trim().length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (!/^[a-z0-9_.-]{3,32}$/i.test(username.trim())) {
        setError('Username must be 3–32 characters using letters, numbers, dots, underscores, or hyphens.');
        return;
      }
      if (usernameStatus === 'taken') {
        setError('This username is already taken. Choose another one.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setError('Enter a valid email address.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      setLoading(true);
      try {
        const profile = await registerAccount({
          fullName: fullName.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password,
        });
        onSuccess(profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Registration failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'admin') {
      if (!email.trim() || !password) {
        setError('Enter your administrator username or email and password.');
        return;
      }
      setLoading(true);
      try {
        const profile = await loginAccount({
          identifier: email.trim(),
          password,
          portal: 'admin',
        });
        onSuccess(profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid administrator credentials.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Standard client login mode
    if (!email.trim() || !password) {
      setError('Enter your email or username and password.');
      return;
    }
    setLoading(true);
    try {
      const profile = await loginAccount({
        identifier: email.trim(),
        password,
        portal: 'client',
      });
      onSuccess(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#07090E] bg-luxury-mesh py-10 sm:py-16 px-4 sm:px-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {siteSettings.siteName}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="glass-surface rounded-2xl p-6 sm:p-8 space-y-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <BrandMark logoUrl={siteSettings.logoUrl} size={36} />
              <div>
                <h1 className="text-xl font-semibold text-white">
                  {mode === 'admin'
                    ? 'Administrator Portal'
                    : mode === 'login'
                      ? 'Client Portal Sign In'
                      : mode === 'register'
                        ? 'Create Client Account'
                        : 'Reset Account Password'}
                </h1>
                <p className="text-xs text-slate-400">{siteSettings.tagline}</p>
              </div>
            </div>

            {pendingPackageName && mode !== 'admin' && (
              <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-violet-950/40 border border-violet-500/25 text-xs text-violet-200">
                Authenticate to continue to Binance checkout for{' '}
                <span className="font-semibold text-white">{pendingPackageName}</span>.
              </div>
            )}
          </div>

          {/* Client-only 2-tab switch (Sign In / Register) */}
          {(mode === 'login' || mode === 'register') && (
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#07090E] border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setNotice('');
                }}
                className={`py-2.5 text-xs font-medium rounded-lg transition-colors min-h-[40px] ${
                  mode === 'login'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                  setNotice('');
                }}
                className={`py-2.5 text-xs font-medium rounded-lg transition-colors min-h-[40px] ${
                  mode === 'register'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5 leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-start gap-2.5 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>{notice}</p>
                {issuedCodeHint && (
                  <p className="font-mono text-white">
                    Recovery Code: <span className="font-semibold">{issuedCodeHint}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 focus:border-violet-500 focus:outline-none text-sm text-white placeholder:text-slate-600 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-300">Username</label>
                    {usernameStatus === 'available' && (
                      <span className="text-[11px] text-emerald-400">Available</span>
                    )}
                    {usernameStatus === 'taken' && (
                      <span className="text-[11px] text-rose-400">Already taken</span>
                    )}
                    {usernameStatus === 'invalid' && (
                      <span className="text-[11px] text-amber-400">3–32 chars (a-z, 0-9, . _ -)</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="Choose a unique username"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 focus:border-violet-500 focus:outline-none text-sm font-mono text-white placeholder:text-slate-600 min-h-[44px]"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                {mode === 'admin'
                  ? 'Administrator Username or Email'
                  : mode === 'login'
                    ? 'Email or Username'
                    : 'Email Address'}
              </label>
              <div className="relative">
                {mode === 'admin' ? (
                  <Shield className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                ) : (
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                )}
                <input
                  type={mode === 'register' || mode === 'forgot' ? 'email' : 'text'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={mode === 'forgot' && resetStep === 'confirm'}
                  placeholder={
                    mode === 'admin'
                      ? 'Enter admin username or email'
                      : mode === 'login'
                        ? 'Enter email or username'
                        : 'you@domain.com'
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 focus:border-violet-500 focus:outline-none text-sm text-white placeholder:text-slate-600 min-h-[44px]"
                />
              </div>
            </div>

            {mode === 'forgot' && resetStep === 'confirm' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">6-Digit Verification Code</label>
                <input
                  type="text"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 focus:border-violet-500 focus:outline-none text-sm font-mono text-white placeholder:text-slate-600 min-h-[44px]"
                />
              </div>
            )}

            {(mode !== 'forgot' || resetStep === 'confirm') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-300">
                    {mode === 'forgot' ? 'New Password' : 'Password'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setResetStep('request');
                        setError('');
                        setNotice('');
                      }}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === 'register' || mode === 'forgot'
                        ? 'Minimum 8 characters'
                        : 'Enter your password'
                    }
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-[#07090E] border border-white/10 focus:border-violet-500 focus:outline-none text-sm text-white placeholder:text-slate-600 min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {(mode === 'register' || (mode === 'forgot' && resetStep === 'confirm')) && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#07090E] border border-white/10 focus:border-violet-500 focus:outline-none text-sm text-white placeholder:text-slate-600 min-h-[44px]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors min-h-[46px] disabled:opacity-60"
            >
              {loading
                ? 'Processing...'
                : mode === 'admin'
                  ? 'Sign In to Admin Panel'
                  : mode === 'login'
                    ? 'Sign In to Dashboard'
                    : mode === 'register'
                      ? 'Create Client Account'
                      : resetStep === 'request'
                        ? 'Send Verification Code'
                        : 'Update Password'}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setResetStep('request');
                  setError('');
                  setNotice('');
                }}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-white"
              >
                Return to Sign In
              </button>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
};
