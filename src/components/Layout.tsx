import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Landmark,
  Calculator,
  FileText,
  Phone,
  Menu,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react';

const navItems = [
  { label: 'Loan Management', path: '/loan-management', icon: Landmark },
  { label: 'EMI Calculator', path: '/emi-calculator', icon: Calculator, hasSubmenu: true },
  { label: 'Service/Product List', path: '/services', icon: FileText },
  { label: 'Connect Us', path: '/connect', icon: Phone },
];

const emiSubItems = [
  { label: 'EMI Calculator', path: '/emi-calculator' },
  { label: 'DPS Calculator', path: '/emi-calculator/dps' },
  { label: 'FDR Calculator', path: '/emi-calculator/fdr' },
  { label: 'Loan Eligibility', path: '/emi-calculator/eligibility' },
  { label: 'Currency Converter', path: '/emi-calculator/currency' },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLoanClick = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate('/loan-management');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Landmark className="h-7 w-7 text-accent" />
            <span className="font-heading text-xl font-bold text-primary">LoanManager</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              if (item.label === 'Loan Management') {
                return (
                  <Button
                    key={item.path}
                    variant={isActive(item.path) ? 'secondary' : 'ghost'}
                    className="gap-2 font-body text-sm"
                    onClick={handleLoanClick}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              }
              if (item.hasSubmenu) {
                return (
                  <DropdownMenu key={item.path}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={isActive(item.path) ? 'secondary' : 'ghost'}
                        className="gap-2 font-body text-sm"
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {emiSubItems.map((sub) => (
                        <DropdownMenuItem key={sub.path} asChild>
                          <Link to={sub.path} className="w-full cursor-pointer">
                            {sub.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
              return (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? 'secondary' : 'ghost'}
                  className="gap-2 font-body text-sm"
                  asChild
                >
                  <Link to={item.path}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">{user.email?.split('@')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => signOut()} className="gap-2 cursor-pointer">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="default" size="sm" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            )}

            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <nav className="flex flex-col gap-2 mt-8">
                  <Button
                    variant="ghost"
                    className="justify-start gap-2"
                    onClick={() => { handleLoanClick(); setMobileOpen(false); }}
                  >
                    <Landmark className="h-4 w-4" /> Loan Management
                  </Button>
                  {emiSubItems.map((sub) => (
                    <Button
                      key={sub.path}
                      variant="ghost"
                      className="justify-start gap-2 pl-6"
                      asChild
                      onClick={() => setMobileOpen(false)}
                    >
                      <Link to={sub.path}>
                        <Calculator className="h-4 w-4" /> {sub.label}
                      </Link>
                    </Button>
                  ))}
                  <Button variant="ghost" className="justify-start gap-2" asChild onClick={() => setMobileOpen(false)}>
                    <Link to="/services"><FileText className="h-4 w-4" /> Service/Product List</Link>
                  </Button>
                  <Button variant="ghost" className="justify-start gap-2" asChild onClick={() => setMobileOpen(false)}>
                    <Link to="/connect"><Phone className="h-4 w-4" /> Connect Us</Link>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-primary text-primary-foreground py-6">
        <div className="container text-center">
          <p className="text-sm opacity-80">© {new Date().getFullYear()} LoanManager — Bangladesh Development Bank PLC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
