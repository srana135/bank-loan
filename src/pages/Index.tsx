import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLoans } from '@/hooks/useLoans';
import { useBranches } from '@/hooks/useBranches';
import { useRegistrationRequests, useProfiles } from '@/hooks/useUsers';
import { useLegalCases } from '@/hooks/useLegal';
import { useLegalNotices } from '@/hooks/useLegalNotices';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Landmark, Calculator, FileText, Phone, ArrowRight, Shield, Clock, TrendingUp,
  Users, Building2, ClipboardList, Gavel, Calendar, CalendarDays, FileWarning,
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

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const Index = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const branchFilter = userRole === 'manager' ? profile?.branch_id : undefined;
  const { data: loans, isLoading: loansLoading } = useLoans(user ? branchFilter : null);
  const { data: branches } = useBranches();
  const { data: requests } = useRegistrationRequests();
  const { data: profiles } = useProfiles();
  const { data: legalCases } = useLegalCases(user ? branchFilter : null);
  const { data: notices } = useLegalNotices(user ? branchFilter : null);

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

  // Proposed repayment stats
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const todayStr = now.toISOString().split('T')[0];
  const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
  const proposedToday = visibleLoans.filter(l => l.latest_proposed_date === todayStr).length;
  const proposed7Days = visibleLoans.filter(l => l.latest_proposed_date && l.latest_proposed_date >= todayStr && l.latest_proposed_date <= in7Days).length;

  // Legal stats
  const activeCases = (legalCases || []).filter(c => c.status === 'active');
  const legalByType: Record<string, { count: number; claim: number }> = {};
  activeCases.forEach(c => {
    if (!legalByType[c.case_type]) legalByType[c.case_type] = { count: 0, claim: 0 };
    legalByType[c.case_type].count++;
    legalByType[c.case_type].claim += c.claim_amount || 0;
  });
  const totalClaim = activeCases.reduce((s, c) => s + (c.claim_amount || 0), 0);
  const legalDue7 = activeCases.filter(c => { const d = daysUntil(c.next_date); return d !== null && d > 0 && d <= 7; }).length;
  const legalToday = activeCases.filter(c => { const d = daysUntil(c.next_date); return d !== null && d <= 0; }).length;

  // Notice stats
  const noticeDue7 = (notices || []).filter(n => n.case_filing_deadline && n.case_filing_deadline >= todayStr && n.case_filing_deadline <= in7Days).length;

  // Classification cards - always show all 5 in consistent order
  const CLS_ORDER = ['STD', 'SMA', 'SS', 'DF', 'BL'];
  const clsBadgeVariant = (cls: string) => ['DF', 'BL'].includes(cls) ? 'destructive' as const : cls === 'SMA' ? 'secondary' as const : 'default' as const;

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
            <Button size="lg" className="bg-accent" asChild>
              <Link to="/emi-calculator">Try EMI Calculator</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Dashboard widgets (logged-in only) */}
      {user && (
        <section className="py-8">
          <div className="container space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-heading text-xl font-bold text-foreground">Dashboard</h2>
              <Badge variant="secondary" className="capitalize">{userRole}</Badge>
              {branchName && <Badge variant="outline" className="gap-1"><Building2 className="h-3 w-3" />{branchName}</Badge>}
            </div>

            {loansLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <>
                {/* Row 1: Total Loans + Outstanding + 5 Classifications = 7 cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/loan-management')}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Landmark className="h-4 w-4 text-primary" />
                        <p className="text-xs text-muted-foreground">Total Loans</p>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{visibleLoans.length}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-accent" />
                        <p className="text-xs text-muted-foreground">Outstanding</p>
                      </div>
                      <p className="text-lg font-bold text-foreground">৳{totalOutstanding.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  {CLS_ORDER.map(cls => (
                    <Card key={cls} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/loan-management')}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={clsBadgeVariant(cls)} className="text-[10px] h-4">{cls}</Badge>
                          <p className="text-xs text-muted-foreground">{classificationCounts[cls] || 0} loans</p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">৳{(classificationOutstanding[cls] || 0).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Row 2: Repayment + Legal Stats = consistent 6-col grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <Card className="cursor-pointer hover:shadow-md border-green-200 bg-green-50 dark:bg-green-950/20" onClick={() => navigate('/loan-management')}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-muted-foreground">Repayment Today</p>
                      </div>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400">{proposedToday}</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:shadow-md border-amber-200 bg-amber-50 dark:bg-amber-950/20" onClick={() => navigate('/loan-management')}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <CalendarDays className="h-4 w-4 text-amber-600" />
                        <p className="text-xs text-muted-foreground">Repayment 7d</p>
                      </div>
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{proposed7Days}</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/legal')}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Gavel className="h-4 w-4 text-primary" />
                        <p className="text-xs text-muted-foreground">Active Cases</p>
                      </div>
                      <p className="text-2xl font-bold text-foreground">{activeCases.length}</p>
                      <p className="text-[10px] text-muted-foreground">৳{totalClaim.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  {Object.entries(legalByType).slice(0, 2).map(([type, { count, claim }]) => (
                    <Card key={type} className="cursor-pointer hover:shadow-md" onClick={() => navigate('/legal')}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Gavel className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{type}</p>
                        </div>
                        <p className="text-xl font-bold text-foreground">{count}</p>
                        <p className="text-[10px] text-muted-foreground">৳{claim.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  ))}
                  <Card className="cursor-pointer hover:shadow-md border-destructive/20" onClick={() => navigate('/legal')}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Gavel className="h-4 w-4 text-destructive" />
                        <p className="text-xs text-muted-foreground">Court Due 7d</p>
                      </div>
                      <p className="text-xl font-bold text-destructive">{legalDue7}</p>
                      <p className="text-[10px] text-muted-foreground">Today: {legalToday}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Row 3: Admin-only widgets = consistent 4-col grid */}
                {userRole === 'admin' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                    <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/legal')}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <FileWarning className="h-4 w-4 text-amber-600" />
                          <p className="text-xs text-muted-foreground">Notice Due 7d</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{noticeDue7}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
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
