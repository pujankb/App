import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { BRAND_LOGO_URL } from '../components/Layout';

export const AuthPage: React.FC<{ mode: 'login' | 'register' }> = ({ mode }) => {
  const {
    signInWithGoogle,
    signInWithCredentials,
    registerWithCredentials,
    claimAdminAccess,
    isAuthenticated,
    profile,
    settings,
  } = usePlatform();

  const [fullName, setFullName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminSetupMode, setAdminSetupMode] = useState(false);
  const [adminNeedsSetup, setAdminNeedsSetup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecoveryInfo, setShowRecoveryInfo] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || '/dashboard';

  useEffect(() => {
    if (mode !== 'login' || isAuthenticated) return;
    fetch('/api/auth/admin-status')
      .then((r) => r.json())
      .then((s) => {
        const unclaimed = !s.claimed && !s.envConfigured;
        setAdminNeedsSetup(unclaimed);
        if (!unclaimed) setAdminSetupMode(false);
      })
      .catch(() => setAdminNeedsSetup(false));
  }, [mode, isAuthenticated]);

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login' && adminSetupMode) {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setSubmitting(false);
          return;
        }
        await claimAdminAccess(loginId || 'admin', password);
        setAdminNeedsSetup(false);
        setAdminSetupMode(false);
        navigate('/admin', { replace: true });
        return;
      }

      const signedProfile =
        mode === 'login'
          ? await signInWithCredentials(loginId, password)
          : await registerWithCredentials(fullName, loginId, password);

      if (signedProfile.role === 'admin' && redirectTo === '/dashboard') {
        navigate('/admin', { replace: true });
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to authenticate with those credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Sign-in window was closed before completing authentication.');
      } else {
        setError(err?.message || 'Unable to sign in right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated && profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-5">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
          <div>
            <h1 className="font-display text-2xl font-bold text-[#0F172A]">You are signed in</h1>
            <p className="mt-2 text-sm text-slate-600">
              Signed in as <span className="font-semibold text-[#0F172A]">{profile.email}</span> ({profile.role}).
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg transition-colors"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            {profile.role === 'admin' && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0F172A] border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Admin Panel</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1040px] mx-auto px-4 sm:px-6 py-12 lg:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <img
                src={BRAND_LOGO_URL}
                alt={`${settings.platformName} logo`}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-md object-cover border border-slate-200"
              />
              <span className="font-display text-lg font-bold text-[#0F172A]">
                {settings.platformName}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">
              {mode === 'register'
                ? `Create your ${settings.platformName} account`
                : adminSetupMode
                ? 'Set Admin ID & Password'
                : 'Sign in with ID & password'}
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {mode === 'register'
                ? 'Register with your name, preferred ID or email, and a secure password.'
                : adminSetupMode
                ? 'One-time setup: save your Admin ID and password. After this, sign in normally using this form or /admin.'
                : 'Students and administrators can sign in normally using their Login ID / Email and password, or continue with Google.'}
            </p>

            {mode === 'login' && adminNeedsSetup && (
              <div className="mt-4 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <span>
                  {adminSetupMode
                    ? 'Setting up Admin ID & password for first-time login.'
                    : 'Admin password not set yet? Set it once here.'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !adminSetupMode;
                    setAdminSetupMode(next);
                    setError(null);
                    setConfirmPassword('');
                    if (next && !loginId) setLoginId('admin');
                  }}
                  className="font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap cursor-pointer"
                >
                  {adminSetupMode ? 'Back to Sign In' : 'Set Admin Password'}
                </button>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleCredentialSubmit} className="mt-6 space-y-4">
              {mode === 'register' && (
                <div>
                  <label htmlFor="auth-fullname" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    minLength={2}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8]"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-id" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {adminSetupMode ? 'Admin ID' : 'Login ID or Email'}
                </label>
                <input
                  id="auth-id"
                  type="text"
                  required
                  minLength={adminSetupMode ? 3 : 2}
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder={
                    adminSetupMode
                      ? 'admin'
                      : mode === 'login'
                      ? 'admin or student@example.com'
                      : 'Choose a login ID or email'
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8]"
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {adminSetupMode ? 'Create Admin Password' : 'Password'}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={mode === 'register' || adminSetupMode ? 6 : 1}
                  autoComplete={mode === 'login' && !adminSetupMode ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8]"
                />
              </div>

              {mode === 'login' && adminSetupMode && (
                <div>
                  <label htmlFor="auth-confirm-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm Admin Password
                  </label>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8]"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                <KeyRound className="h-4 w-4" />
                <span>
                  {submitting
                    ? 'Please wait...'
                    : mode === 'register'
                    ? 'Create Account'
                    : adminSetupMode
                    ? 'Save & Sign In as Admin'
                    : 'Sign In'}
                </span>
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 px-5 py-2.5 text-sm font-semibold text-[#0F172A] bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.88-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.29V6.62H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l4-3.09Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4 3.09c.95-2.84 3.6-4.94 6.72-4.94Z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="pt-4 flex items-center justify-between text-xs text-slate-600">
              <button
                type="button"
                onClick={() => setShowRecoveryInfo((prev) => !prev)}
                className="text-[#1D4ED8] hover:underline font-medium cursor-pointer"
              >
                Forgot password?
              </button>
              {mode === 'login' ? (
                <Link to="/register" className="hover:text-[#0F172A] font-medium">
                  Create account
                </Link>
              ) : (
                <Link to="/login" className="hover:text-[#0F172A] font-medium">
                  Already registered? Sign in
                </Link>
              )}
            </div>

            {showRecoveryInfo && (
              <div className="mt-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                Need a password reset or admin recovery? Contact {settings.ownerName} via{' '}
                <Link to="/contact" className="text-[#1D4ED8] underline">
                  Contact Owner
                </Link>{' '}
                or sign in directly with Google.
              </div>
            )}
          </div>

          <p className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
            Admin portal direct access:{' '}
            <Link to="/admin" className="font-semibold text-[#1D4ED8] hover:underline">
              Open /admin
            </Link>
          </p>
        </div>

        <div className="lg:col-span-6 bg-[#0F172A] text-white rounded-xl p-8 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-blue-300">
              <Lock className="h-3.5 w-3.5" />
              <span>Unified Student & Admin Authentication</span>
            </div>
            <h2 className="font-display text-2xl font-bold leading-snug">
              Sign in with ID & password or Google across {settings.platformName}.
            </h2>
            <ul className="space-y-4 pt-2 text-sm text-slate-300">
              <li className="border-t border-slate-800 pt-3">
                <strong className="text-white block">Salted Server-Side Password Hashing</strong>
                Passwords are verified exclusively on the server using salted scrypt hashes in PostgreSQL.
              </li>
              <li className="border-t border-slate-800 pt-3">
                <strong className="text-white block">Admin Portal Access (/admin)</strong>
                Administrators can claim and sign in with their Admin ID & password or Google account.
              </li>
              <li className="border-t border-slate-800 pt-3">
                <strong className="text-white block">Synced Library & Progress</strong>
                Bookmarks, downloads, and video checkpoints follow your account automatically.
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-5 border-t border-slate-800 text-xs text-slate-400">
            Support hours: {settings.supportHours}
          </div>
        </div>
      </div>
    </div>
  );
};
