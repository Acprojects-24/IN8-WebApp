import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import Toast from '../components/Toast';

// <-- IMPORT YOUR ASSETS HERE -->
import logoImage from '../assets/logo.png'; 
import backgroundImage from '../assets/bg5.jpg'; 
import authBannerImage from '../assets/auth-banner.jpg';

// Your Firebase imports
import { supabase } from '../supabase.js';

// --- Components (Icons and Loaders) ---

// Google Sign-In removed

const LoadingSpinner = () => (
  <svg className="animate-spin h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);


const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [activeToast, setActiveToast] = useState(null);

  const showToast = (toastData) => {
    setActiveToast({ id: Date.now(), ...toastData });
  };
  
  useEffect(() => {
    if (location.state?.message) {
      showToast({ 
        title: 'Access Denied', 
        message: location.state.message, 
        type: 'error',
        duration: 4000 
      });
      window.history.replaceState({}, document.title)
    }
  }, [location]);


  const handleAuthSuccess = (message, redirectPath) => {
    setIsSuccess(true);
    showToast({ title: 'Success', message, type: 'success', duration: 2000 });
    setTimeout(() => {
      navigate(redirectPath);
    }, 2000);
  };
  
  const handleAuthError = (err) => {
      const msg = err?.message || '';
      let friendly = msg;
      if (/invalid\s*grant/i.test(msg) || /invalid login credentials/i.test(msg)) {
        friendly = 'Invalid email or password. Please try again.';
      } else if (/email not confirmed/i.test(msg)) {
        friendly = 'Email not confirmed. Disable confirmation in Supabase or confirm the email.';
      }
      showToast({ title: 'Authentication Error', message: friendly, type: 'error' });
  };

  // Determine user's role based on profile.role or config_roles admin_email
  const resolveUserRole = async (user) => {
    const emailLower = (user?.email || '').toLowerCase();
    let role = 'user';
    try {
      const { data: u } = await supabase.from('users').select('role').eq('uid', user.id).single();
      if (u?.role) role = (u.role || 'user').toLowerCase();
    } catch (_) {}
    if (role !== 'admin') {
      try {
        const { data: cfg } = await supabase
          .from('config_roles')
          .select('admin_email')
          .eq('admin_email', emailLower)
          .maybeSingle();
        if (cfg?.admin_email && cfg.admin_email.toLowerCase() === emailLower) {
          role = 'admin';
          // persist role on profile for faster checks next time
          await supabase.from('users').update({ role: 'admin' }).eq('uid', user.id);
        }
      } catch (_) {}
    }
    return role;
  };

  // Session state removed (no sign out UI)
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setActiveToast(null);
    setLoading(true);

    if (isLogin) {
      try {
        const emailInput = email.trim();
        const passwordInput = password;
        const { data, error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput });
        if (error) throw error;
        const user = data.user;
        const accessToken = data.session?.access_token || '';
        let { data: profile, error: profileErr } = await supabase
            .from('users')
            .select('first_name,last_name,role,is_active')
            .eq('uid', user.id)
            .single();
        if (profileErr && /is_active/.test(String(profileErr.message || ''))) {
            // Column missing: retry without is_active
            const fallback = await supabase
                .from('users')
                .select('first_name,last_name,role')
                .eq('uid', user.id)
                .single();
            profile = fallback.data;
        }
        if (!profile) {
            await supabase.from('users').upsert({ uid: user.id, email: user.email, first_name: '', last_name: '', role: 'user', auth_provider: 'email', is_active: true });
            const res = await supabase.from('users').select('first_name,last_name,role').eq('uid', user.id).single();
            profile = res.data;
        }
        if (profile && typeof profile.is_active !== 'undefined' && profile.is_active === false) {
            throw new Error('Your account has been disabled by the admin.');
        }
        if (profile) {
            const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
            localStorage.setItem('authToken', accessToken);
            localStorage.setItem('userName', userName || (user.email || ''));
            localStorage.setItem('userEmail', user.email || '');
        }
        const role = await resolveUserRole(user);
        localStorage.setItem('role', role);
        handleAuthSuccess(role === 'admin' ? 'Admin Login Successful! Redirecting...' : 'Login Successful! Redirecting...', role === 'admin' ? '/dashboard' : '/home');

      } catch (err) {
        handleAuthError(err);
      }
    } else {
      const nameRegex = /^[A-Za-z]+$/;
      if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
        setLoading(false);
        return showToast({ title: 'Invalid Name', message: 'Names should only contain letters.', type: 'warning' });
      }
      if (password.length < 6) {
        setLoading(false);
        return showToast({ title: 'Weak Password', message: 'Password must be at least 6 characters.', type: 'warning' });
      }
      const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
      if (!specialCharRegex.test(password)) {
        setLoading(false);
        return showToast({ title: 'Weak Password', message: 'Password must include a special character.', type: 'warning' });
      }

      try {
        const emailInput = email.trim();
        const passwordInput = password;
        // Request immediate session on sign up
        const { data, error } = await supabase.auth.signUp({ email: emailInput, password: passwordInput });
        if (error) throw error;
        let user = data.user;
        let session = data.session;
        // If no session (e.g., email confirmation enabled on project), attempt direct sign-in
        if (!session) {
          const { data: login, error: loginErr } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput });
          if (loginErr) throw loginErr;
          user = login.user;
          session = login.session;
        }
        await supabase.from('users').upsert({
          uid: user.id,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          role: 'user',
          auth_provider: 'email',
          is_active: true,
        });
        const userName = `${firstName} ${lastName}`;
        localStorage.setItem('authToken', session?.access_token || '');
        localStorage.setItem('userName', userName);
        localStorage.setItem('userEmail', user.email || '');
        const role = await resolveUserRole(user);
        localStorage.setItem('role', role);
        handleAuthSuccess(role === 'admin' ? 'Admin Login Successful! Redirecting...' : 'Account Created! Redirecting...', role === 'admin' ? '/dashboard' : '/home');
      } catch (err) {
        handleAuthError(err);
      }
    }
    setLoading(false);
  };

  // Google Sign-In removed

  // Sign out removed per request

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
        return showToast({ title: 'Input Required', message: 'Please enter your email address.', type: 'warning' });
    }
    setLoading(true);
    try {
        await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo: `${window.location.origin}/` });
        showToast({ title: 'Check Your Email', message: 'Password reset link sent to your inbox.', type: 'success' });
        setIsResetModalOpen(false);
        setResetEmail('');
    } catch (err) {
        handleAuthError(err);
    }
    setLoading(false);
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setActiveToast(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
  };

  return (
    <>
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #1f2937 inset !important;
          -webkit-text-fill-color: #e2e8f0 !important;
          caret-color: #e2e8f0 !important;
          border-bottom-color: #3b82f6 !important;
        }
      `}</style>
      <div 
        className="min-h-screen bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="fixed top-5 right-5 z-50 w-full max-w-sm">
            <AnimatePresence>
                {activeToast && (
                    <Toast
                        key={activeToast.id}
                        toast={activeToast}
                        onClose={() => setActiveToast(null)}
                    />
                )}
            </AnimatePresence>
        </div>

        <div className="min-h-screen bg-black/20 flex flex-col justify-center items-center p-4">
            <AnimatePresence>
                {isResetModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black/50 z-40 flex justify-center items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-slate-800 p-8 rounded-lg shadow-xl w-full max-w-md"
                            initial={{ scale: 0.9, y: -20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: -20 }}
                        >
                            <h2 className="text-2xl font-bold text-white mb-4">Reset Password</h2>
                            <p className="text-slate-400 mb-6">Enter your email address and we'll send you a link to reset your password.</p>
                            <form onSubmit={handlePasswordReset}>
                                <label className="text-xs text-slate-400">Email Address</label>
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    required
                                    className="w-full bg-transparent border-b-2 border-slate-600 focus:border-blue-500 text-white placeholder-slate-500 py-2 outline-none transition-colors duration-300"
                                    placeholder="you@example.com"
                                />
                                <div className="flex justify-end gap-4 mt-8">
                                    <button type="button" onClick={() => setIsResetModalOpen(false)} className="px-6 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors">Cancel</button>
                                    <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                        {loading ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-4xl bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2"
            >
            
            {isSuccess && (
                <motion.div 
                className="absolute inset-0 bg-slate-900/90 flex justify-center items-center z-30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                >
                <LoadingSpinner />
                </motion.div>
            )}

            <div className="p-6 md:p-10 flex flex-col justify-center">
                <div className="mb-6">
                    <img 
                        src={logoImage} 
                        alt="Your Company Logo" 
                        className="h-9 w-auto"
                    />
                    <div className="relative h-20 mt-4">
                        <AnimatePresence initial={false}>
                            <motion.div
                                key={isLogin ? 'login-title' : 'signup-title'}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.3 }}
                                className="absolute inset-0"
                            >
                                <h1 className="text-2xl font-bold text-slate-100">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
                                <p className="text-slate-400 text-sm mt-1">{isLogin ? 'Sign in to continue your journey.' : 'Get started with a free account.'}</p>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                <motion.form 
                    layout
                    transition={{ duration: 0.4, type: "spring", bounce: 0.15 }}
                    onSubmit={handleSubmit} 
                    className="space-y-5"
                >
                    <AnimatePresence initial={false}>
                        {!isLogin && (
                        <motion.div
                            key="nameFields"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto', transition: { duration: 0.3 } }}
                            exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required={!isLogin} className="w-full bg-transparent border-b-2 border-slate-600 focus:border-blue-500 text-white placeholder-slate-500 py-2 outline-none transition-colors duration-300" placeholder="First Name" />
                                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required={!isLogin} className="w-full bg-transparent border-b-2 border-slate-600 focus:border-blue-500 text-white placeholder-slate-500 py-2 outline-none transition-colors duration-300" placeholder="Last Name" />
                            </div>
                        </motion.div>
                        )}
                    </AnimatePresence>

                    <div>
                        <label className="text-xs text-slate-400">Email Address</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-transparent border-b-2 border-slate-600 focus:border-blue-500 text-white placeholder-slate-500 py-2 outline-none transition-colors duration-300" placeholder="you@example.com" />
                    </div>
                    <div>
                        <div className="flex justify-between items-center">
                            <label className="text-xs text-slate-400">Password</label>
                            {isLogin && <button type="button" onClick={() => setIsResetModalOpen(true)} className="text-xs font-medium text-blue-500 hover:text-blue-400">Forgot Password?</button>}
                        </div>
                        <div className="relative">
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                className="w-full bg-transparent border-b-2 border-slate-600 focus:border-blue-500 text-white placeholder-slate-500 py-2 pr-10 outline-none transition-colors duration-300" 
                                placeholder="••••••••" 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)} 
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <button type="submit" disabled={loading || isSuccess} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ring-offset-slate-900 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                        </button>
                    </div>
                    {/* Sign out UI removed */}
                </motion.form>
                <div className="text-center mt-6">
                <div className="text-sm text-slate-400">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    <button onClick={toggleAuthMode} className="ml-1 font-medium text-blue-500 hover:text-blue-400 hover:underline">
                    {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                </div>
                </div>
            </div>
            
            <div className="hidden md:block">
                <img 
                    src={authBannerImage} 
                    alt="Promotional Banner" 
                    className="w-full h-full object-cover rounded-r-2xl"
                />
            </div>
            </motion.div>
        </div>
      </div>
    </>
  );
};

export default AuthForm;
