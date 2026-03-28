import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Landmark, Calculator, FileText, Phone, ArrowRight, Shield, Clock, TrendingUp } from 'lucide-react';

const modules = [
  {
    title: 'Loan Management',
    description: 'Apply, track and manage loans with a complete digital workflow.',
    icon: Landmark,
    path: '/loan-management',
    requiresAuth: true,
  },
  {
    title: 'EMI Calculator',
    description: 'Calculate EMI, DPS, FDR returns and check loan eligibility.',
    icon: Calculator,
    path: '/emi-calculator',
    requiresAuth: false,
  },
  {
    title: 'Service/Product List',
    description: 'Browse our banking services and product documentation.',
    icon: FileText,
    path: '/services',
    requiresAuth: false,
  },
  {
    title: 'Connect Us',
    description: 'Get in touch with our team for any assistance.',
    icon: Phone,
    path: '/connect',
    requiresAuth: false,
  },
];

const features = [
  { icon: Shield, title: 'Secure & Reliable', desc: 'Bank-grade security for all transactions' },
  { icon: Clock, title: 'Real-Time Updates', desc: 'Track your loan status in real time' },
  { icon: TrendingUp, title: 'Smart Analytics', desc: 'Comprehensive financial calculators' },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleModuleClick = (mod: typeof modules[0]) => {
    if (mod.requiresAuth && !user) {
      navigate('/login');
    } else {
      navigate(mod.path);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient text-primary-foreground py-20 md:py-32">
        <div className="container text-center">
          <h1 className="font-heading text-4xl md:text-6xl font-bold tracking-tight animate-fade-in">
            Modern Loan Management
          </h1>
          <p className="mt-4 text-lg md:text-xl opacity-90 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Streamlined banking operations for loan processing, financial calculations, and service management.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button
              size="lg"
              className="accent-gradient text-accent-foreground font-semibold hover:opacity-90 transition-opacity"
              onClick={() => user ? navigate('/loan-management') : navigate('/login')}
            >
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/emi-calculator">Try EMI Calculator</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Module Cards */}
      <section className="py-16 md:py-24">
        <div className="container">
          <h2 className="font-heading text-3xl font-bold text-center text-foreground mb-12">Our Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((mod) => (
              <Card
                key={mod.path}
                className="group cursor-pointer card-shadow hover:elevated-shadow transition-all duration-300 hover:-translate-y-1 border-border"
                onClick={() => handleModuleClick(mod)}
              >
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-accent/20 transition-colors">
                    <mod.icon className="h-7 w-7 text-primary group-hover:text-accent transition-colors" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">{mod.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{mod.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
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
    </div>
  );
};

export default Index;
