import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLoans } from '@/hooks/useLoans';
import { useBranches } from '@/hooks/useBranches';
import { useRegistrationRequests, useProfiles } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Landmark, Calculator, FileText, Phone, ArrowRight, Shield, Clock, TrendingUp,
  Users, Building2, ClipboardList, AlertTriangle,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

const modules = [
  { title: 'Loan Management', description: 'Apply, track and manage loans.', icon: Landmark, path: '/loan-management', requiresAuth: true },
  { title: 'EMI Calculator', description: 'Calculate EMI, DPS, FDR and more.', icon: Calculator, path: '/emi-calculator', requiresAuth: false },
  { title: 'Services', description: 'Browse banking services and documents.', icon: FileText, path: '/services', requiresAuth: false },
  { title: 'Connect Us', description: 'Get in touch with our team.', icon: Phone, path: '/connect', requiresAuth: false },
];

const features = [
  { icon: Shield, title: 'Secure & Reliable', desc: 'Bank-grade security for all transactions' },
  { icon: Clock, title: 'Real-Time Updates', desc: 'Track your loan status in real time' },
  { icon: TrendingUp, title: 'Smart Analytics', desc: 'Comprehensive financial calculators' },
];

const Index = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const branchFilter = userRole === 'manager' ? profile?.branch_id : undefined;
  const { data: loans, isLoading: loansLoading } = useLoans(user ? branchFilter : null);
  const { data: branches } = useBranches();
  const { data: requests } = useRegistrationRequests();
  const { data: profiles } = useProfiles();

  const handleModuleClick = (mod: typeof modules[0]) => {
    if (mod.requiresAuth && !user) navigate('/login');
    else navigate(mod.path);
  };

  const branchName = branches?.find(b => b.id === profile?.branch_id)?.branch_name;
  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;
  const totalUsers = profiles?.length || 0;
  const activeUsers = profiles?.filter(p => p.is_active).length || 0;
  const totalBranches = branches?.length || 0;

  // Loan stats
  const visibleLoans = loans || [];
  const totalOutstanding = visibleLoans.reduce((s, l) => s + (l.outstanding_amount || 0), 0);
  const classificationCounts: Record<string, number> = {};
  const classificationOutstanding: Record<string, number> = {};
  visibleLoans.forEach(l => {
    const cls = l.classification || 'Unknown';
    classificationCounts[cls] = (classificationCounts[cls] || 0) + 1;
    classificationOutstanding[cls] = (classificationOutstanding[cls] || 0) + (l.outstanding_amount || 0);
  });

  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient text-primary-foreground py-16 md:py-24">
        <div className="container text-center">
          <h1 className="font-heading text-3xl md:text-5xl font-bold tracking-tight animate-fade-in">
            Modern Loan Management
          </h1>
          <p className="mt-3 text-base md:text-lg opacity-90 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Streamlined banking operations for loan processing, financial calculations, and service management.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button size="lg" className="accent-gradient text-accent-foreground font-semibold hover:opacity-90 transition-opacity"
              onClick={() => user ? navigate('/loan-management') : navigate('/login')}>
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/emi-calculator">Try EMI Calculator</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Dashboard widgets (logged-in only) */}
      {user && (
        <section className="py-8">
          <div className="container space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-heading text-xl font-bold text-foreground">Dashboard</h2>
              <Badge variant="secondary" className="capitalize">{userRole}</Badge>
              {branchName && <Badge variant="outline" className="gap-1"><Building2 className="h-3 w-3" />{branchName}</Badge>}
            </div>

            {loansLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Total Loans */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/loan-management')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Landmark className="h-4 w-4 text-primary" />
                      <p className="text-xs text-muted-foreground">Total Loans</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{visibleLoans.length}</p>
                  </CardContent>
                </Card>

                {/* Total Outstanding */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-accent" />
                      <p className="text-xs text-muted-foreground">Outstanding</p>
                    </div>
                    <p className="text-lg font-bold text-foreground">৳{totalOutstanding.toLocaleString()}</p>
                  </CardContent>
                </Card>

                {/* Classification breakdown */}
                {['STD', 'SMA', 'SS', 'DF', 'BL'].map(cls => {
                  const count = classificationCounts[cls] || 0;
                  if (count === 0 && !['STD', 'BL'].includes(cls)) return null;
                  return (
                    <Card key={cls}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={['DF', 'BL'].includes(cls) ? 'destructive' : cls === 'SMA' ? 'secondary' : 'default'} className="text-[10px] h-4">{cls}</Badge>
                          <p className="text-xs text-muted-foreground">{count} loan{count !== 1 ? 's' : ''}</p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">৳{(classificationOutstanding[cls] || 0).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Admin-only widgets */}
                {userRole === 'admin' && (
                  <>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin')}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <ClipboardList className="h-4 w-4 text-destructive" />
                          <p className="text-xs text-muted-foreground">Pending Requests</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="h-4 w-4 text-primary" />
                          <p className="text-xs text-muted-foreground">Users</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{activeUsers}<span className="text-sm text-muted-foreground font-normal">/{totalUsers}</span></p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-primary" />
                          <p className="text-xs text-muted-foreground">Branches</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{totalBranches}</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Module Cards */}
      <section className={user ? 'py-8' : 'py-16 md:py-24'}>
        <div className="container">
          <h2 className="font-heading text-2xl font-bold text-center text-foreground mb-8">Our Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {modules.map((mod) => (
              <Card key={mod.path} className="group cursor-pointer card-shadow hover:elevated-shadow transition-all duration-300 hover:-translate-y-1 border-border"
                onClick={() => handleModuleClick(mod)}>
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-accent/20 transition-colors">
                    <mod.icon className="h-6 w-6 text-primary group-hover:text-accent transition-colors" />
                  </div>
                  <h3 className="font-heading text-base font-semibold text-foreground">{mod.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      {!user && (
        <section className="py-12 bg-muted/50">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                    <f.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
