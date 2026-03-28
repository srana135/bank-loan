import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Landmark, Calculator, FileText, Phone, Menu, LogOut, User, ChevronDown, Shield, MapPin,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const emiSubItems = [
  { label: 'EMI Calculator', path: '/emi-calculator' },
  { label: 'DPS Calculator', path: '/emi-calculator/dps' },
  { label: 'FDR Calculator', path: '/emi-calculator/fdr' },
  { label: 'Loan Eligibility', path: '/emi-calculator/eligibility' },
  { label: 'Currency Converter', path: '/emi-calculator/currency' },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, userRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');
  const handleLoanClick = () => { if (!user) navigate('/login'); else navigate('/loan-management'); };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Landmark className="h-6 w-6 text-accent" />
            <span className="font-heading text-lg font-bold text-primary">LoanManager</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={isActive('/loan-management') || isActive('/loan-map') ? 'secondary' : 'ghost'} className="gap-1.5 text-sm h-9">
                  <Landmark className="h-4 w-4" /> Loans <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleLoanClick} className="cursor-pointer">Loan Management</DropdownMenuItem>
                <DropdownMenuItem onClick={() => user ? navigate('/loan-map') : navigate('/login')} className="cursor-pointer">Loan Map</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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

            <Button variant={isActive('/services') ? 'secondary' : 'ghost'} className="gap-1.5 text-sm h-9" asChild>
              <Link to="/services"><FileText className="h-4 w-4" /> Services</Link>
            </Button>
            <Button variant={isActive('/connect') ? 'secondary' : 'ghost'} className="gap-1.5 text-sm h-9" asChild>
              <Link to="/connect"><Phone className="h-4 w-4" /> Connect</Link>
            </Button>
            {userRole === 'admin' && (
              <Button variant={isActive('/admin') ? 'secondary' : 'ghost'} className="gap-1.5 text-sm h-9" asChild>
                <Link to="/admin"><Shield className="h-4 w-4" /> Admin</Link>
              </Button>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8">
                    <User className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">{profile?.full_name || user.email?.split('@')[0]}</span>
                    {userRole && <Badge variant="secondary" className="text-[10px] capitalize hidden sm:inline-flex h-4">{userRole}</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-xs text-muted-foreground" disabled>{user.email}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()} className="gap-2 cursor-pointer"><LogOut className="h-3.5 w-3.5" /> Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="default" size="sm" className="h-8" asChild><Link to="/login">Sign In</Link></Button>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden h-8 w-8"><Menu className="h-5 w-5" /></Button></SheetTrigger>
              <SheetContent side="right" className="w-72">
                <nav className="flex flex-col gap-1 mt-8">
                  <Button variant="ghost" className="justify-start gap-2 h-9" onClick={() => { handleLoanClick(); setMobileOpen(false); }}>
                    <Landmark className="h-4 w-4" /> Loan Management
                  </Button>
                  <Button variant="ghost" className="justify-start gap-2 h-9" onClick={() => { user ? navigate('/loan-map') : navigate('/login'); setMobileOpen(false); }}>
                    <MapPin className="h-4 w-4" /> Loan Map
                  </Button>
                  {emiSubItems.map(sub => (
                    <Button key={sub.path} variant="ghost" className="justify-start gap-2 h-9 pl-6 text-sm" asChild onClick={() => setMobileOpen(false)}>
                      <Link to={sub.path}><Calculator className="h-3.5 w-3.5" /> {sub.label}</Link>
                    </Button>
                  ))}
                  <Button variant="ghost" className="justify-start gap-2 h-9" asChild onClick={() => setMobileOpen(false)}>
                    <Link to="/services"><FileText className="h-4 w-4" /> Services</Link>
                  </Button>
                  <Button variant="ghost" className="justify-start gap-2 h-9" asChild onClick={() => setMobileOpen(false)}>
                    <Link to="/connect"><Phone className="h-4 w-4" /> Connect</Link>
                  </Button>
                  {userRole === 'admin' && (
                    <Button variant="ghost" className="justify-start gap-2 h-9" asChild onClick={() => setMobileOpen(false)}>
                      <Link to="/admin"><Shield className="h-4 w-4" /> Admin</Link>
                    </Button>
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
