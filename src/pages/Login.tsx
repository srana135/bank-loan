import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateRegistrationRequest } from '@/hooks/useUsers';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Landmark, Loader2, Building2, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or User ID is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const forgotSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});

const registrationSchema = z.object({
  requestedUserId: z.string().trim().min(2, 'User ID is required'),
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Invalid email'),
  mobile: z.string().trim().min(5, 'Mobile is required'),
  requestedRole: z.string().min(1, 'Select a role'),
  branchName: z.string().optional(),
  note: z.string().optional(),
});

type Mode = 'login' | 'signup' | 'forgot' | 'register-request';

const Login = () => {
  const [mode, setMode] = useState<Mode>('login');
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const createRequest = useCreateRegistrationRequest();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const forgotForm = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const regForm = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { requestedUserId: '', fullName: '', email: '', mobile: '', requestedRole: 'employee', branchName: '', note: '' },
  });

  const onLogin = async (data: z.infer<typeof loginSchema>) => {
    setLoading(true);
    let email = data.identifier;

    // Check if identifier looks like an email
    const isEmail = email.includes('@');

    if (!isEmail) {
      // Look up email from profiles table using user_id
      const { data: profileData, error: lookupError } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', data.identifier)
        .single();

      if (lookupError || !profileData?.email) {
        setLoading(false);
        toast.error('User ID not found. Please check and try again.');
        return;
      }
      email = profileData.email;
    }

    const { error } = await signIn(email, data.password);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Signed in successfully');
      navigate('/loan-management');
    }
  };

  const onSignup = async (data: z.infer<typeof signupSchema>) => {
    setLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Please check your email for verification.');
      setMode('login');
    }
  };

  const onForgot = async (data: z.infer<typeof forgotSchema>) => {
    setLoading(true);
    const { error } = await resetPassword(data.email);
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success('Password reset link sent to your email.');
      setMode('login');
    }
  };

  const onRegRequest = async (data: z.infer<typeof registrationSchema>) => {
    setLoading(true);
    try {
      await createRequest.mutateAsync({
        requested_user_id: data.requestedUserId,
        full_name: data.fullName,
        email: data.email,
        mobile: data.mobile,
        requested_role: data.requestedRole,
        branch_name: data.branchName || null,
        note: data.note || null,
      });
      regForm.reset();
      setMode('login');
    } catch {
      // error handled by mutation
    }
    setLoading(false);
  };

  const features = [
    { icon: Building2, title: 'Branch Management', desc: 'Multi-branch loan tracking & oversight' },
    { icon: TrendingUp, title: 'Loan Analytics', desc: 'Real-time eligibility & EMI calculations' },
    { icon: Users, title: 'Role-Based Access', desc: 'Admin, Manager & Employee controls' },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-0 rounded-2xl overflow-hidden shadow-xl border border-border/50">
        {/* Left: Branded Hero Panel */}
        <div className="hidden lg:flex flex-col justify-center p-10 hero-gradient text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, hsl(42 85% 52% / 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(210 40% 98% / 0.15) 0%, transparent 50%)' }} />
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Landmark className="h-7 w-7" />
              </div>
              <div>
                <h1 className="font-heading text-2xl font-bold">Steady Loan Aid</h1>
                <p className="text-sm text-primary-foreground/70">Bangladesh Development Bank PLC</p>
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="font-heading text-3xl font-bold leading-tight">Empowering Financial<br />Growth & Recovery</h2>
              <p className="text-sm text-primary-foreground/70 max-w-sm">Streamlined loan management system for efficient tracking, recovery, and branch oversight.</p>
            </div>
            <div className="space-y-4 pt-2">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <f.icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{f.title}</p>
                    <p className="text-xs text-primary-foreground/60">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Form Panel */}
        <div className="bg-card p-6 sm:p-10 flex flex-col justify-center">
          {/* Mobile-only branding */}
          <div className="lg:hidden text-center mb-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full hero-gradient">
              <Landmark className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="font-heading text-xl font-bold text-foreground">Steady Loan Aid</h1>
            <p className="text-xs text-muted-foreground">Bangladesh Development Bank PLC</p>
          </div>

          <div className="space-y-1 mb-6">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
              {mode === 'register-request' && 'Registration Request'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'login' && 'Sign in with your email or User ID'}
              {mode === 'signup' && 'Register for a new account'}
              {mode === 'forgot' && 'Enter your email to receive a reset link'}
              {mode === 'register-request' && 'Submit a request for account access'}
            </p>
          </div>

          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or User ID</Label>
                <Input id="identifier" placeholder="you@example.com or your User ID" {...loginForm.register('identifier')} />
                {loginForm.formState.errors.identifier && <p className="text-sm text-destructive">{loginForm.formState.errors.identifier.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••" {...loginForm.register('password')} />
                {loginForm.formState.errors.password && <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
              </Button>
              <div className="flex flex-col gap-2 text-center text-sm pt-2">
                <button type="button" onClick={() => setMode('forgot')} className="text-primary hover:underline">Forgot Password?</button>
                <button type="button" onClick={() => setMode('signup')} className="text-primary hover:underline">Create New Account</button>
                <button type="button" onClick={() => setMode('register-request')} className="text-primary hover:underline">New User? Request Registration</button>
              </div>
            </form>
          )}

          {/* SIGNUP */}
          {mode === 'signup' && (
            <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="Your full name" {...signupForm.register('fullName')} />
                {signupForm.formState.errors.fullName && <p className="text-sm text-destructive">{signupForm.formState.errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="you@example.com" {...signupForm.register('email')} />
                {signupForm.formState.errors.email && <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" placeholder="••••••" {...signupForm.register('password')} />
                {signupForm.formState.errors.password && <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" placeholder="••••••" {...signupForm.register('confirmPassword')} />
                {signupForm.formState.errors.confirmPassword && <p className="text-sm text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>}
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register'}
              </Button>
              <div className="text-center text-sm">
                <button type="button" onClick={() => setMode('login')} className="text-primary hover:underline">Already have an account? Sign In</button>
              </div>
            </form>
          )}

          {/* FORGOT */}
          {mode === 'forgot' && (
            <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="you@example.com" {...forgotForm.register('email')} />
                {forgotForm.formState.errors.email && <p className="text-sm text-destructive">{forgotForm.formState.errors.email.message}</p>}
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
              </Button>
              <div className="text-center text-sm">
                <button type="button" onClick={() => setMode('login')} className="text-primary hover:underline">Back to Sign In</button>
              </div>
            </form>
          )}

          {/* REGISTRATION REQUEST */}
          {mode === 'register-request' && (
            <form onSubmit={regForm.handleSubmit(onRegRequest)} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Preferred User ID</Label>
                <Input placeholder="e.g. srana001" {...regForm.register('requestedUserId')} className="h-9" />
                {regForm.formState.errors.requestedUserId && <p className="text-xs text-destructive">{regForm.formState.errors.requestedUserId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input placeholder="Your full name" {...regForm.register('fullName')} className="h-9" />
                {regForm.formState.errors.fullName && <p className="text-xs text-destructive">{regForm.formState.errors.fullName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="you@example.com" {...regForm.register('email')} className="h-9" />
                {regForm.formState.errors.email && <p className="text-xs text-destructive">{regForm.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mobile</Label>
                <Input placeholder="01XXXXXXXXX" {...regForm.register('mobile')} className="h-9" />
                {regForm.formState.errors.mobile && <p className="text-xs text-destructive">{regForm.formState.errors.mobile.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Requested Role</Label>
                <select {...regForm.register('requestedRole')} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Branch Name (Optional)</Label>
                <Input placeholder="Branch name" {...regForm.register('branchName')} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Note (Optional)</Label>
                <Textarea placeholder="Any additional notes..." {...regForm.register('note')} className="min-h-[60px]" />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Request'}
              </Button>
              <div className="text-center text-sm">
                <button type="button" onClick={() => setMode('login')} className="text-primary hover:underline">Back to Sign In</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;