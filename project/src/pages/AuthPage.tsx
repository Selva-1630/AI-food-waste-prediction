import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Leaf, Mail, Lock, User, Building2, Eye, EyeOff, ArrowRight,
  Loader2, AlertCircle, TrendingDown, HeartHandshake, Sparkles,
  Apple, Carrot, Wheat, Egg,
} from 'lucide-react';

type Mode = 'signin' | 'signup';

const floatingIcons = [
  { Icon: Apple, className: 'top-[14%] left-[10%] text-red-400/70', size: 34, delay: 'animation-delay-2000', anim: 'animate-float-slow' },
  { Icon: Carrot, className: 'top-[28%] right-[12%] text-orange-400/70', size: 30, delay: 'animation-delay-3000', anim: 'animate-float-medium' },
  { Icon: Wheat, className: 'bottom-[26%] left-[16%] text-amber-400/70', size: 32, delay: 'animation-delay-4000', anim: 'animate-drift' },
  { Icon: Egg, className: 'bottom-[16%] right-[18%] text-amber-200/80', size: 28, delay: 'animation-delay-2000', anim: 'animate-float-slow' },
  { Icon: Leaf, className: 'top-[52%] left-[6%] text-emerald-300/70', size: 26, delay: 'animation-delay-3000', anim: 'animate-float-medium' },
  { Icon: Leaf, className: 'top-[68%] right-[8%] text-emerald-400/60', size: 24, delay: 'animation-delay-4000', anim: 'animate-drift' },
];

export default function AuthPage() {
  const { signInWithEmail, signUpWithEmail, sendPasswordResetEmail, updatePassword } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (params.get('type') === 'recovery' || hashParams.get('type') === 'recovery') {
      setShowResetPassword(true);
      setMode('signin');
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await signInWithEmail(email, password);
        if (err) setError(err);
      } else {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setBusy(false);
          return;
        }
        const { error: err } = await signUpWithEmail(email, password, fullName, companyName);
        if (err) setError(err);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    const trimmedEmail = email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      setError('Enter your email address first.');
      return;
    }

    if (!emailPattern.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const { error: err, message } = await sendPasswordResetEmail(trimmedEmail);
      if (err) {
        setError(err);
      } else {
        setResetSent(true);
        setSuccess(message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const { error: err } = await updatePassword(newPassword);
      if (err) {
        setError(err);
        return;
      }

      setSuccess('Password updated successfully. You can now sign in with your new password.');
      setShowResetPassword(false);
      setResetSent(false);
      setNewPassword('');
      setConfirmPassword('');
      window.history.replaceState({}, '', window.location.pathname);
      setMode('signin');
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setError(null);
    setSuccess(null);
    setMode(next);
    setResetSent(false);
  }

  return (
    <div className="min-h-screen w-full bg-ink-950 text-white flex flex-col lg:flex-row overflow-hidden relative">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-emerald-600/30 blur-[120px] animate-drift" />
        <div className="absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full bg-cyan-500/20 blur-[120px] animate-float-slow" />
        <div className="absolute -bottom-40 left-1/3 w-[460px] h-[460px] rounded-full bg-amber-500/15 blur-[120px] animate-float-medium" />
      </div>

      {/* Floating food icons */}
      {floatingIcons.map(({ Icon, className, size, delay, anim }, i) => (
        <div key={i} className={`absolute z-0 pointer-events-none ${anim} ${delay} ${className}`}>
          <Icon size={size} strokeWidth={1.4} />
        </div>
      ))}

      {/* ============ LEFT: Brand / Hero ============ */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-14 lg:px-20 py-12 relative z-10">
        <div className="max-w-xl animate-rise-in">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-glow">
              <Leaf size={24} className="text-white" />
              <span className="absolute inset-0 rounded-2xl border border-emerald-300/40 animate-pulse-ring" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">ZeroWaste AI</h1>
              <p className="text-xs text-emerald-300/80 tracking-wide uppercase">Food Waste Prediction &amp; Donation Portal</p>
            </div>
          </div>

          {/* Headline */}
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-[1.1] mb-6">
            Predict waste before
            <br />
            it happens.
            <span className="block bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent animate-gradient">
              Donate what you can't use.
            </span>
          </h2>

          <p className="text-ink-300 text-lg leading-relaxed mb-10 max-w-md">
            AI-driven insights help your company cut food waste, protect margins, and route
            surplus to communities that need it — all from one dashboard.
          </p>

          {/* Feature pills */}
          <div className="grid sm:grid-cols-3 gap-4 stagger">
            <FeaturePill icon={Sparkles} title="AI Predictions" sub="Daily risk scoring" />
            <FeaturePill icon={TrendingDown} title="Cut Waste" sub="Up to 40% less" />
            <FeaturePill icon={HeartHandshake} title="Donate" sub="Local partners" />
          </div>

          {/* Stats strip */}
          <div className="mt-10 flex gap-8 animate-rise-in animation-delay-800">
            <Stat value="1.2M" label="Meals donated" />
            <Stat value="38%" label="Avg. waste cut" />
            <Stat value="540+" label="Partner orgs" />
          </div>
        </div>
      </div>

      {/* ============ RIGHT: Auth Card ============ */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12 relative z-10">
        <div className="w-full max-w-md animate-scale-in">
          <div className="glass rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            {/* shimmer sweep */}
            <div className="absolute inset-0 animate-shimmer pointer-events-none" />

            {!showResetPassword && (
              <div className="relative flex bg-white/5 rounded-full p-1 mb-8 border border-white/10">
                <div
                  className={`absolute top-1 bottom-1 w-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-transform duration-300 ease-out ${
                    mode === 'signup' ? 'translate-x-full' : 'translate-x-0'
                  }`}
                />
                <button
                  onClick={() => switchMode('signin')}
                  className={`relative z-10 flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
                    mode === 'signin' ? 'text-white' : 'text-ink-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => switchMode('signup')}
                  className={`relative z-10 flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
                    mode === 'signup' ? 'text-white' : 'text-ink-300'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            <div className="relative">
              {showResetPassword ? (
               <>
                 <h3 className="font-display text-2xl font-semibold mb-1">Set a new password</h3>
                 <p className="text-ink-300 text-sm mb-7">
                   Choose a new secure password for your account.
                 </p>

                 <form onSubmit={handlePasswordReset} className="space-y-4">
                   <div className="relative">
                     <Field
                       icon={Lock}
                       type={showPassword ? 'text' : 'password'}
                       placeholder="New password"
                       value={newPassword}
                       onChange={setNewPassword}
                       required
                     />
                     <button
                       type="button"
                       onClick={() => setShowPassword((s) => !s)}
                       className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-white transition-colors"
                       aria-label="Toggle password visibility"
                     >
                       {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                     </button>
                   </div>

                   <Field
                     icon={Lock}
                     type={showPassword ? 'text' : 'password'}
                     placeholder="Confirm new password"
                     value={confirmPassword}
                     onChange={setConfirmPassword}
                     required
                   />

                   {error && (
                     <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3 animate-rise-in">
                       <AlertCircle size={16} className="mt-0.5 shrink-0" />
                       <span>{error}</span>
                     </div>
                   )}

                   {success && (
                     <div className="flex items-start gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 animate-rise-in">
                       <AlertCircle size={16} className="mt-0.5 shrink-0" />
                       <span>{success}</span>
                     </div>
                   )}

                   <button
                     type="submit"
                     disabled={busy}
                     className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                   >
                     {busy ? <Loader2 size={18} className="animate-spin" /> : <>Update Password <ArrowRight size={16} /></>}
                   </button>

                   <button
                     type="button"
                     onClick={() => {
                       setShowResetPassword(false);
                       setError(null);
                       setSuccess(null);
                       setMode('signin');
                     }}
                     className="w-full text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                   >
                     Back to sign in
                   </button>
                 </form>
               </>
              ) : (
               <>
                 <h3 className="font-display text-2xl font-semibold mb-1">
                   {mode === 'signin' ? 'Welcome back' : 'Join ZeroWaste AI'}
                 </h3>
                 <p className="text-ink-300 text-sm mb-7">
                   {mode === 'signin'
                     ? 'Sign in to your company workspace.'
                     : 'Create your company workspace in seconds.'}
                 </p>

                 <div className="flex items-center gap-3 mb-6">
                   <div className="flex-1 h-px bg-white/10" />
                   <span className="text-xs text-ink-400 uppercase tracking-wider">or with email</span>
                   <div className="flex-1 h-px bg-white/10" />
                 </div>

                 <form onSubmit={handleSubmit} className="space-y-4">
                   {mode === 'signup' && (
                     <div className="grid grid-cols-2 gap-3 animate-rise-in">
                       <Field
                         icon={User}
                         type="text"
                         placeholder="Full name"
                         value={fullName}
                         onChange={setFullName}
                         required
                       />
                       <Field
                         icon={Building2}
                         type="text"
                         placeholder="Company"
                         value={companyName}
                         onChange={setCompanyName}
                         required
                       />
                     </div>
                   )}

                   <Field
                     icon={Mail}
                     type="email"
                     placeholder="Work email"
                     value={email}
                     onChange={setEmail}
                     required
                   />

                   {(mode === 'signin' || mode === 'signup') && (
                     <div className="relative">
                       <Field
                         icon={Lock}
                         type={showPassword ? 'text' : 'password'}
                         placeholder="Password"
                         value={password}
                         onChange={setPassword}
                         required
                       />
                       <button
                         type="button"
                         onClick={() => setShowPassword((s) => !s)}
                         className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-white transition-colors"
                         aria-label="Toggle password visibility"
                       >
                         {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                       </button>
                     </div>
                   )}

                   {mode === 'signin' && (
                     <div className="flex justify-end">
                       <button
                         type="button"
                         onClick={handleForgotPassword}
                         className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                       >
                         Forgot password?
                       </button>
                     </div>
                   )}

                   {error && (
                     <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3 animate-rise-in">
                       <AlertCircle size={16} className="mt-0.5 shrink-0" />
                       <span>{error}</span>
                     </div>
                   )}

                   {success && (
                     <div className="flex items-start gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 animate-rise-in">
                       <AlertCircle size={16} className="mt-0.5 shrink-0" />
                       <span>{success}</span>
                     </div>
                   )}

                   <button
                     type="submit"
                     disabled={busy}
                     className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                   >
                     {busy ? (
                       <Loader2 size={18} className="animate-spin" />
                     ) : (
                       <>
                         {mode === 'signin' ? 'Sign In' : 'Create Account'}
                         <ArrowRight size={16} />
                       </>
                     )}
                   </button>
                 </form>

                 {mode === 'signin' && resetSent && (
                   <p className="text-xs text-emerald-300 mt-4">
                     A reset link has been sent to {email.trim()}.
                   </p>
                 )}
               </>
              )}

              {!showResetPassword && (
                <p className="text-center text-xs text-ink-400 mt-6">
                  {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                    className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    {mode === 'signin' ? 'Create one' : 'Sign in'}
                  </button>
                </p>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-ink-500 mt-6">
            By continuing you agree to our Terms &amp; Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeaturePill({ icon: Icon, title, sub }: { icon: typeof Leaf; title: string; sub: string }) {
  return (
    <div className="glass rounded-2xl p-4 hover:bg-white/10 transition-colors">
      <Icon size={20} className="text-emerald-400 mb-2" />
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-ink-400">{sub}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-ink-400">{label}</p>
    </div>
  );
}

function Field({
  icon: Icon,
  type,
  placeholder,
  value,
  onChange,
  required,
}: {
  icon: typeof Mail;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <Icon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-ink-400 text-sm focus:outline-none focus:border-emerald-400/60 focus:bg-white/10 transition-all"
      />
    </div>
  );
}
