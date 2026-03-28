import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark, FileText, Clock, CheckCircle } from 'lucide-react';

const LoanManagement = () => {
  const { user, userRole } = useAuth();

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">Loan Management</h1>
        <p className="text-muted-foreground mt-1">
          Welcome, {user?.user_metadata?.full_name || user?.email}
          {userRole && <span className="ml-2 text-xs bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full capitalize">{userRole}</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Apply for Loan', desc: 'Submit a new loan application', icon: Landmark, color: 'text-primary' },
          { title: 'My Applications', desc: 'View your loan applications', icon: FileText, color: 'text-accent' },
          { title: 'Pending Reviews', desc: 'Applications awaiting review', icon: Clock, color: 'text-muted-foreground' },
          { title: 'Approved Loans', desc: 'View approved & disbursed loans', icon: CheckCircle, color: 'text-success' },
        ].map((item) => (
          <Card key={item.title} className="card-shadow hover:elevated-shadow transition-all cursor-pointer">
            <CardHeader className="pb-2">
              <item.icon className={`h-8 w-8 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg font-heading">{item.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Connect your Supabase project to enable full loan management features including application submission, tracking, and approval workflows.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoanManagement;
