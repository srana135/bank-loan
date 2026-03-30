import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches } from '@/hooks/useBranches';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Landmark, Calculator, FileText, Phone, Menu, LogOut, User, ChevronDown, Shield, MapPin,
  Building2, Users, ClipboardList, Settings, Upload, Gavel, Type,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const emiSubItems = [
  { label: 'EMI Calculator', path: '/emi-calculator' },
  { label: 'DPS Calculator', path: '/emi-calculator/dps' },
  { label: 'FDR Calculator', path: '/emi-calculator/fdr' },
  { label: 'Loan Eligibility', path: '/emi-calculator/eligibility' },
  { label: 'Currency Converter', path: '/emi-calculator/currency' },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, userRole, signOut } = useAuth();
  const { data: branches } = useBranches();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const requireAuth = (path: string) => { if (!user) navigate('/login'); else navigate(path); };

  const branchName = branches?.find(b => b.id === profile?.branch_id)?.branch_name;

  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const canUploadService = isAdmin || isManager;

  const navMobile = (path: string) => { requireAuth(path); setMobileOpen(false); };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Landmark className="h-6 w-6 text-accent" />
            <span className="font-heading text-lg font-bold text-primary">LoanManager</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {/* Loans */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={isActive('/loan-management') || isActive('/loan-map') ? 'secondary' : 'ghost'} className="gap-1.5 text-sm h-9">
                  <Landmark className="h-4 w-4" /> Loans <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => requireAuth('/loan-management')} className="cursor-pointer">Loan Management</DropdownMenuItem>
                <DropdownMenuItem onClick={() => requireAuth('/loan-map')} className="cursor-pointer">Loan Map</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Calculators */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={isActive('/emi-calculator') ? 'secondary' : 'ghost'} className="gap-1.5 text-sm h-9">
                  <Calculator className="h-4 w-4" /> Calculators <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {emiSubItems.map(sub => (
                  <DropdownMenuItem key={sub.path} asChild><Link to={sub.path} className="cursor-pointer">{sub.label}</Link></DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Legal/Mamla */}
            {user && (
              <Button variant={isActive('/legal') ? 'secondary' : 'ghost'} className="gap-1.5 text-sm h-9" onClick={() => requireAuth('/legal')}>
                <Gavel className="h-4 w-4" /> Mamla
              </Button>
            )}

            {/* Services */}
            <Button variant={isActive('/services') ? 'secondary' : 'ghost'} className="gap-1.5 text-sm h-9" asChild>
              <Link to="/services"><FileText className="h-4 w-4" /> Services</Link>
            </Button>

            {/* Converter */}
            <Button variant={isActive('/converter') ? 'secondary' : 'ghost'} className="gap-1.5 text-sm h-9" asChild>
              <Link to="/converter"><Type className="h-4 w-4" /> Converter</Link>
            </Button>

            {/* Connect */}
            <Button variant={isActive('/connect') ? 'secondary' : 'ghost'} className="gap-1.5 text-sm h-9" asChild>
              <Link to="/connect"><Phone className="h-4 w-4" /> Connect</Link>
            </Button>

            {/* Admin */}
            {isAdmin && (
              <Button variant={isActive('/admin') ? 'secondary' : 'ghost'} className="gap-1.5 text-sm h-9" asChild>
                <Link to="/admin"><Shield className="h-4 w-4" /> Admin</Link>
              </Button>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-9 max-w-[260px]">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline text-xs truncate">{profile?.full_name || user.email?.split('@')[0]}</span>
                    {userRole && <Badge variant="secondary" className="text-[10px] capitalize hidden sm:inline-flex h-4 shrink-0">{userRole}</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {profile?.user_id && <p className="text-xs text-muted-foreground">ID: {profile.user_id}</p>}
                      <div className="flex items-center gap-1.5 pt-1">
                        <Badge variant="secondary" className="text-[10px] capitalize h-4">{userRole || 'user'}</Badge>
                        {branchName && (
                          <Badge variant="outline" className="text-[10px] h-4 gap-1">
                            <Building2 className="h-2.5 w-2.5" />{branchName}
                          </Badge>
                        )}
                        <Badge variant={profile?.is_active ? 'default' : 'destructive'} className="text-[10px] h-4">
                          {profile?.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                    <Link to="/profile"><User className="h-3.5 w-3.5" /> My Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()} className="gap-2 cursor-pointer text-destructive">
                    <LogOut className="h-3.5 w-3.5" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="default" size="sm" className="h-8" asChild><Link to="/login">Sign In</Link></Button>
            )}

            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden h-8 w-8"><Menu className="h-5 w-5" /></Button></SheetTrigger>
              <SheetContent side="right" className="w-72">
                {/* Mobile user identity block */}
                {user && (
                  <div className="mt-6 mb-4 p-3 rounded-lg bg-muted/50 space-y-1">
                    <p className="text-sm font-semibold">{profile?.full_name || user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    {profile?.user_id && <p className="text-xs text-muted-foreground">ID: {profile.user_id}</p>}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <Badge variant="secondary" className="text-[10px] capitalize h-4">{userRole}</Badge>
                      {branchName && <Badge variant="outline" className="text-[10px] h-4">{branchName}</Badge>}
                    </div>
                  </div>
                )}
                <nav className="flex flex-col gap-1">
                  <Button variant="ghost" className="justify-start gap-2 h-9" onClick={() => navMobile('/loan-management')}>
                    <Landmark className="h-4 w-4" /> Loan Management
                  </Button>
                  <Button variant="ghost" className="justify-start gap-2 h-9" onClick={() => navMobile('/loan-map')}>
                    <MapPin className="h-4 w-4" /> Loan Map
                  </Button>
                  <Separator className="my-1" />
                  {emiSubItems.map(sub => (
                    <Button key={sub.path} variant="ghost" className="justify-start gap-2 h-9 pl-6 text-sm" asChild onClick={() => setMobileOpen(false)}>
                      <Link to={sub.path}><Calculator className="h-3.5 w-3.5" /> {sub.label}</Link>
                    </Button>
                  ))}
                  {user && (
                    <>
                      <Separator className="my-1" />
                      <Button variant="ghost" className="justify-start gap-2 h-9" onClick={() => navMobile('/legal')}>
                        <Gavel className="h-4 w-4" /> Mamla / Legal
                      </Button>
                    </>
                  )}
                  <Separator className="my-1" />
                  <Button variant="ghost" className="justify-start gap-2 h-9" asChild onClick={() => setMobileOpen(false)}>
                    <Link to="/services"><FileText className="h-4 w-4" /> {canUploadService ? 'Service Upload' : 'Service List'}</Link>
                  </Button>
                  <Button variant="ghost" className="justify-start gap-2 h-9" asChild onClick={() => setMobileOpen(false)}>
                    <Link to="/converter"><Type className="h-4 w-4" /> Converter</Link>
                  </Button>
                  <Button variant="ghost" className="justify-start gap-2 h-9" asChild onClick={() => setMobileOpen(false)}>
                    <Link to="/connect"><Phone className="h-4 w-4" /> Connect Us</Link>
                  </Button>
                  {isAdmin && (
                    <>
                      <Separator className="my-1" />
                      <p className="text-xs text-muted-foreground px-3 py-1 font-semibold uppercase tracking-wide">Admin</p>
                      <Button variant="ghost" className="justify-start gap-2 h-9" onClick={() => navMobile('/admin')}>
                        <Shield className="h-4 w-4" /> Admin Dashboard
                      </Button>
                    </>
                  )}
                  {user && (
                    <>
                      <Separator className="my-1" />
                      <Button variant="ghost" className="justify-start gap-2 h-9" asChild onClick={() => setMobileOpen(false)}>
                        <Link to="/profile"><User className="h-4 w-4" /> My Profile</Link>
                      </Button>
                      <Button variant="ghost" className="justify-start gap-2 h-9 text-destructive" onClick={() => { signOut(); setMobileOpen(false); }}>
                        <LogOut className="h-4 w-4" /> Sign Out
                      </Button>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-primary text-primary-foreground py-4">
        <div className="container text-center">
          <p className="text-xs opacity-80">© {new Date().getFullYear()} LoanManager — Bangladesh Development Bank PLC</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
