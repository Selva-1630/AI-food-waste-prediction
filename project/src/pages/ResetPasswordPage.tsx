import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Leaf, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function getPasswordStrength(value: string) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 2) return { label: 'Weak', color: 'text-red-300', score };
  if (score <= 4) return { label: 'Medium', color: 'text-amber-300', score };
  return { label: 'Strong', color: 'text-emerald-300', score };
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setIsSessionValid(Boolean(session));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsSessionValid(Boolean(session));
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (strength.score < 3) {
      setError('Use a stronger password with 8+ characters, uppercase, lowercase, number, or symbol.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isSessionValid) {
      setError('This password reset link is invalid or expired. Please request a new link.');
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Unable to update your password.');
        return;
      }

      await supabase.auth.signOut();
      setSuccess('Password updated successfully. You can now sign in with your new password.');
      setPassword('');
      setConfirmPassword('');
    } catch {
      setError('Something went wrong while updating the password. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function goToLogin() {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  return (
    <div className="min-h-screen w-full bg-ink-950 text-white flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-emerald-600/30 blur-[120px] animate-drift" />
        <div className="absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full bg-cyan-500/20 blur-[120px] animate-float-slow" />
      </div>

      <div className="w-full max-w-md glass rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 animate-shimmer pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-glow">
              <Leaf size={24} className="text-white" />
            </div>
          </div>

          {isSessionValid === false ? (
            <>
              <h3 className="font-display text-2xl font-semibold mb-3 text-center">Reset link expired</h3>
              <p className="text-ink-300 text-sm leading-relaxed text-center">
                This password reset link is invalid or expired. Please request a new link.
              </p>
              <button
                type="button"
                onClick={goToLogin}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all"
              >
                Go to Login
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <h3 className="font-display text-2xl font-semibold mb-1">Set a new password</h3>
              <p className="text-ink-300 text-sm mb-6">Create a secure password for your account.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <label className="sr-only">New password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-ink-400 text-sm focus:outline-none focus:border-emerald-400/60"
                    required
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">🔒</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-white transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="relative">
                  <label className="sr-only">Confirm new password</label>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-ink-400 text-sm focus:outline-none focus:border-emerald-400/60"
                    required
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">🔒</span>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-white transition-colors"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-400">Password strength</span>
                      <span className={strength.color}>{strength.label}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          strength.score <= 2
                            ? 'w-1/3 bg-red-400'
                            : strength.score <= 4
                              ? 'w-2/3 bg-amber-400'
                              : 'w-full bg-emerald-400'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                {!success ? (
                  <button
                    type="submit"
                    disabled={busy || isSessionValid === null}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all disabled:opacity-70"
                  >
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <>Update Password <ArrowRight size={16} /></>}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goToLogin}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all"
                  >
                    Go to Login
                    <ArrowRight size={16} />
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
