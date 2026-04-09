import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, MapPin, Smartphone, Lock, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { signupSchema, loginSchema, forgotPasswordSchema } from '../lib/validation';
import { venueConfig } from '../lib/venueConfig';

const AuthPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'register' | 'login' | 'forgot'
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, signInWithFacebook, resetPassword } = useAuth();

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setFieldErrors({});
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSuccessMessage('');
    setLoading(true);

    const form = e.target;

    try {
      if (mode === 'forgot') {
        const data = { email: form.email.value };
        const result = forgotPasswordSchema.safeParse(data);
        if (!result.success) {
          setFieldErrors(Object.fromEntries(result.error.issues.map(i => [i.path[0], i.message])));
          setLoading(false);
          return;
        }
        await resetPassword(data.email);
        setSuccessMessage('Password reset link sent! Check your email inbox.');
      } else if (mode === 'login') {
        const data = { email: form.email.value, password: form.password.value };
        const result = loginSchema.safeParse(data);
        if (!result.success) {
          setFieldErrors(Object.fromEntries(result.error.issues.map(i => [i.path[0], i.message])));
          setLoading(false);
          return;
        }
        await signIn(data);
      } else {
        const data = {
          firstName: form.firstName.value,
          lastName: form.lastName.value,
          phone: form.phone?.value || '',
          address: form.address?.value || '',
          email: form.email.value,
          password: form.password.value,
          confirmPassword: form.confirmPassword.value,
        };
        const result = signupSchema.safeParse(data);
        if (!result.success) {
          setFieldErrors(Object.fromEntries(result.error.issues.map(i => [i.path[0], i.message])));
          setLoading(false);
          return;
        }
        const signUpResult = await signUp(data);
        if (signUpResult?.needsConfirmation) {
          setSuccessMessage(`We've sent a verification link to ${data.email}. Please check your inbox and confirm your email to continue.`);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try { await signInWithGoogle(); } catch (err) { setError(err.message); }
  };

  const handleFacebookLogin = async () => {
    try { await signInWithFacebook(); } catch (err) { setError(err.message); }
  };

  const titles = {
    register: { heading: 'Create an Account', sub: `Join ${venueConfig.name} to start booking courts` },
    login: { heading: 'Welcome Back', sub: 'Enter your details to access your dashboard' },
    forgot: { heading: 'Reset Password', sub: 'Enter your email to receive a reset link' },
  };

  return (
    <main className="min-h-screen bg-[#0a0a0c] flex relative overflow-hidden">

      {/* Hero / Background Section */}
      <div className="absolute inset-0 z-0 lg:static lg:flex-1 lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center lg:bg-[center_top_10%] scale-105"
          style={{ backgroundImage: "url('/court-bg.png')" }}
        />
        {/* Mobile: darker overlay + blur. Desktop: lighter gradient, no blur */}
        <div className="absolute inset-0 bg-[#0a0a0c]/80 backdrop-blur-sm lg:backdrop-blur-none lg:bg-gradient-to-t lg:from-[#0a0a0c] lg:via-[#0a0a0c]/20 lg:to-transparent" />

        {/* Desktop Branding Content */}
        <div className="hidden lg:flex absolute inset-0 flex-col justify-end p-12 lg:p-16 xl:p-24 z-10">
          <div className="relative mb-6 self-start p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <img src={venueConfig.logoPath} alt={`${venueConfig.name} Logo`} className="relative z-10 h-16 w-auto animate-in fade-in slide-in-from-bottom-4 duration-700 object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-5xl xl:text-6xl font-black text-white mb-4 tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            Elevate <br /><span className="text-blue-500">Your Game.</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            The smarter way to manage and book sports courts — less admin, more play.
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="w-full relative z-10 flex items-center justify-center p-4 sm:p-8 lg:p-0 lg:flex-1 lg:w-1/2">
        <div className="w-full max-w-md xl:max-w-lg bg-[#111116]/80 backdrop-blur-2xl border border-gray-800 lg:border-none lg:bg-transparent lg:backdrop-blur-none rounded-3xl lg:rounded-none shadow-2xl shadow-blue-900/10 lg:shadow-none p-6 sm:p-8 xl:p-12 transition-all animate-in fade-in zoom-in-95 lg:zoom-in-100 lg:slide-in-from-right-8 duration-500">

          <div className="text-center lg:text-left mb-8">
            <img src={venueConfig.logoPath} alt={`${venueConfig.name} Logo`} className="lg:hidden h-14 w-auto mx-auto mb-6 object-contain drop-shadow-md" />
            <h2 className="text-3xl font-bold text-gray-100 tracking-tight">{titles[mode].heading}</h2>
            <p className="text-sm text-gray-400 mt-2">{titles[mode].sub}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-6 bg-green-500/10 border border-green-500/20 rounded-xl text-center animate-in fade-in slide-in-from-top-2">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-green-400 font-semibold mb-1">{mode === 'forgot' ? 'Email Sent!' : 'Account Created!'}</p>
              <p className="text-gray-400 text-sm mt-2">{successMessage}</p>
              <button onClick={() => switchMode('login')} className="mt-4 text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Go to Login →
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input label="First Name" name="firstName" placeholder="Juan" icon={User} required />
                    {fieldErrors.firstName && <p className="text-red-400 text-xs mt-1">{fieldErrors.firstName}</p>}
                  </div>
                  <div>
                    <Input label="Last Name" name="lastName" placeholder="Dela Cruz" icon={User} required />
                    {fieldErrors.lastName && <p className="text-red-400 text-xs mt-1">{fieldErrors.lastName}</p>}
                  </div>
                </div>
                <div>
                  <Input label="Phone Number" name="phone" type="tel" placeholder="+63 912 345 6789" icon={Phone} />
                  {fieldErrors.phone && <p className="text-red-400 text-xs mt-1">{fieldErrors.phone}</p>}
                </div>
                <div>
                  <Input label="Complete Address" name="address" placeholder="San Gregorio, San Pablo City" icon={MapPin} />
                  {fieldErrors.address && <p className="text-red-400 text-xs mt-1">{fieldErrors.address}</p>}
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <Input label="Email Address" name="email" type="email" placeholder="juan.delacruz@example.com" icon={Smartphone} required />
                  {fieldErrors.email && <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>}
                </div>
                <div>
                  <Input label="Password" name="password" type="password" placeholder="••••••••" icon={Lock} required />
                  {fieldErrors.password && <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>}
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Input label="Confirm Password" name="confirmPassword" type="password" placeholder="••••••••" icon={Lock} required />
                {fieldErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{fieldErrors.confirmPassword}</p>}
              </div>
            )}

            {mode === 'forgot' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Input label="Email Address" name="email" type="email" placeholder="juan.delacruz@example.com" icon={Smartphone} required />
                {fieldErrors.email && <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>}
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right">
                <button type="button" onClick={() => switchMode('forgot')} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full !mt-6 py-3 text-base font-semibold shadow-lg shadow-blue-600/20" disabled={loading}>
              {loading ? 'Please wait...' : (
                mode === 'register' ? 'Sign Up' :
                  mode === 'login' ? 'Sign In' :
                    'Send Reset Link'
              )}
            </Button>
          </form>

          {mode === 'forgot' && (
            <button onClick={() => switchMode('login')} className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors w-full font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to login
            </button>
          )}

          {mode !== 'forgot' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
              <div className="mt-8 flex items-center justify-center space-x-4">
                <span className="h-px w-full bg-gray-800"></span>
                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold whitespace-nowrap">Or continue with</span>
                <span className="h-px w-full bg-gray-800"></span>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button type="button" onClick={handleGoogleLogin} className="flex items-center justify-center gap-3 py-2.5 px-4 bg-[#1a1a24] hover:bg-[#22222d] border border-gray-800 hover:border-gray-700 rounded-xl transition-all text-sm font-semibold text-gray-200 shadow-sm">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" /></svg>
                  Google
                </button>
                <button type="button" onClick={handleFacebookLogin} className="flex items-center justify-center gap-3 py-2.5 px-4 bg-[#1a1a24] hover:bg-[#22222d] border border-gray-800 hover:border-gray-700 rounded-xl transition-all text-sm font-semibold text-gray-200 shadow-sm">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  Facebook
                </button>
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-gray-400 font-medium">
            {mode === 'login' ? "Don't have an account? " : mode === 'register' ? "Already have an account? " : ''}
            {mode !== 'forgot' && (
              <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                {mode === 'login' ? 'Sign up' : 'Log in'}
              </button>
            )}
          </p>

          {mode !== 'forgot' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate('/book')}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Just need a slot? <span className="text-gray-400 font-medium">Book as Guest →</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default AuthPage;
