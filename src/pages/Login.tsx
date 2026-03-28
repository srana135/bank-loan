import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateRegistrationRequest } from '@/hooks/useUsers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Landmark, Loader2, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
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
    defaultValues: { email: '', password: '' },
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
    const { error } = await signIn(data.email, data.password);
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

  const fillCredentials = (email: string, password: string) => {
    loginForm.setValue('email', email);
    loginForm.setValue('password', password);
    setMode('login');
  };

  const testAccounts = [
    { role: 'Admin', email: 'admin@loanmanager.test', password: 'Admin@123456', scope: 'All Branches', badge: 'destructive' as const },
    { role: 'Manager', email: 'manager@loanmanager.test', password: 'Manager@123456', scope: 'Own Branch Only', badge: 'default' as const },
    { role: 'Employee', email: 'employee@loanmanager.test', password: 'Employee@123456', scope: 'Own Branch (View & Comment)', badge: 'secondary' as const },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-4">
      <Card className="card-shadow">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Landmark className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">
            {mode === 'login' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'register-request' && 'Registration Request'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' && 'Access your loan management dashboard'}
            {mode === 'signup' && 'Register for a new account'}
            {mode === 'forgot' && 'Enter your email to receive a reset link'}
            {mode === 'register-request' && 'Submit a request for account access'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" {...loginForm.register('email')} />
                {loginForm.formState.errors.email && <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••" {...loginForm.register('password')} />
                {loginForm.formState.errors.password && <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
              </Button>
              <div className="flex flex-col gap-2 text-center text-sm">
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
              <Button type="submit" className="w-full" disabled={loading}>
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
              </Button>
              <div className="text-center text-sm">
                <button type="button" onClick={() => setMode('login')} className="text-primary hover:underline">Back to Sign In</button>
              </div>
            </form>
          )}

          {/* REGISTRATION REQUEST */}
          {mode === 'register-request' && (
            <form onSubmit={regForm.handleSubmit(onRegRequest)} className="space-y-4">
              <div className="space-y-2">
                <Label>Preferred User ID</Label>
                <Input placeholder="e.g. srana001" {...regForm.register('requestedUserId')} />
                {regForm.formState.errors.requestedUserId && <p className="text-sm text-destructive">{regForm.formState.errors.requestedUserId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="Your full name" {...regForm.register('fullName')} />
                {regForm.formState.errors.fullName && <p className="text-sm text-destructive">{regForm.formState.errors.fullName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="you@example.com" {...regForm.register('email')} />
                {regForm.formState.errors.email && <p className="text-sm text-destructive">{regForm.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input placeholder="01XXXXXXXXX" {...regForm.register('mobile')} />
                {regForm.formState.errors.mobile && <p className="text-sm text-destructive">{regForm.formState.errors.mobile.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Requested Role</Label>
                <select {...regForm.register('requestedRole')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Branch Name (Optional)</Label>
                <Input placeholder="Branch name" {...regForm.register('branchName')} />
              </div>
              <div className="space-y-2">
                <Label>Note (Optional)</Label>
                <Textarea placeholder="Any additional notes..." {...regForm.register('note')} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Request'}
              </Button>
              <div className="text-center text-sm">
                <button type="button" onClick={() => setMode('login')} className="text-primary hover:underline">Back to Sign In</button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Dev Test Credentials Panel */}
      {mode === 'login' && (
        <Card className="border-2 border-accent/40 bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent" />
              Development Test Accounts
            </CardTitle>
            <CardDescription className="text-xs">Click any account to auto-fill the login form</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {testAccounts.map(acc => (
              <button
                key={acc.role}
                type="button"
                onClick={() => fillCredentials(acc.email, acc.password)}
                className="w-full text-left p-3 rounded-lg border border-border/60 hover:bg-muted/60 transition-colors space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">{acc.role}</span>
                  <Badge variant={acc.badge} className="text-[10px] capitalize h-4">{acc.role}</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{acc.email}</p>
                <p className="text-xs text-muted-foreground">Password: <span className="font-mono">{acc.password}</span></p>
                <p className="text-xs text-muted-foreground">Scope: {acc.scope}</p>
              </button>
            ))}
            <div className="mt-3 p-2.5 rounded bg-muted/50 border border-border/40">
              <p className="text-xs font-semibold text-foreground mb-1">⚠️ Setup Required (one-time)</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Sign up each account above via "Create New Account"</li>
                <li>Confirm emails (or disable email confirmation in Supabase Auth settings)</li>
                <li>Run this SQL in your Supabase SQL Editor:</li>
              </ol>
              <pre className="mt-1.5 text-[10px] bg-background p-2 rounded overflow-x-auto text-muted-foreground leading-relaxed">
{`UPDATE public.profiles SET role='admin', is_active=true,
  full_name='Admin User', user_id='ADM001'
WHERE email='admin@loanmanager.test';

UPDATE public.profiles SET role='manager', is_active=true,
  full_name='Manager User', user_id='MGR001'
WHERE email='manager@loanmanager.test';

UPDATE public.profiles SET role='employee', is_active=true,
  full_name='Employee User', user_id='EMP001'
WHERE email='employee@loanmanager.test';`}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};

export default Login;
