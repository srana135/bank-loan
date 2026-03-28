import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useRegistrationRequests, useProfiles } from '@/hooks/useUsers';
import { useLoans } from '@/hooks/useLoans';
import { useBranches } from '@/hooks/useBranches';
import { Users, Building2, Landmark, ClipboardList, FileText, Settings } from 'lucide-react';
import RegistrationRequests from './RegistrationRequests';
import UserManagement from './UserManagement';
import BranchManagement from './BranchManagement';
import AppSettings from './AppSettings';

const AdminDashboard = () => {
  const { profile, userRole } = useAuth();
  const { data: requests } = useRegistrationRequests();
  const { data: profiles } = useProfiles();
  const { data: loans } = useLoans();
  const { data: branches } = useBranches();

  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;
  const totalUsers = profiles?.length || 0;
  const activeUsers = profiles?.filter(p => p.is_active).length || 0;
  const totalLoans = loans?.length || 0;
  const totalBranches = branches?.length || 0;

  const widgets = [
    { label: 'Total Users', value: totalUsers, sub: `${activeUsers} active`, icon: Users, color: 'text-primary' },
    { label: 'Pending Requests', value: pendingCount, icon: ClipboardList, color: pendingCount > 0 ? 'text-destructive' : 'text-muted-foreground' },
    { label: 'Branches', value: totalBranches, icon: Building2, color: 'text-primary' },
    { label: 'Total Loans', value: totalLoans, icon: Landmark, color: 'text-accent' },
  ];

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage users, branches, and system settings
          <Badge variant="secondary" className="ml-2 capitalize">{userRole}</Badge>
        </p>
      </div>

      {/* Summary widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {widgets.map(w => (
          <Card key={w.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <w.icon className={`h-5 w-5 ${w.color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{w.label}</p>
                <p className="text-xl font-bold text-foreground">{w.value}</p>
                {w.sub && <p className="text-xs text-muted-foreground">{w.sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requests" className="gap-1.5 text-xs sm:text-sm">
            <ClipboardList className="h-3.5 w-3.5 hidden sm:inline" />
            Requests
            {pendingCount > 0 && <Badge variant="destructive" className="h-4 min-w-4 text-[10px] ml-0.5">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5 hidden sm:inline" /> Users
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-1.5 text-xs sm:text-sm">
            <Building2 className="h-3.5 w-3.5 hidden sm:inline" /> Branches
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm">
            <Settings className="h-3.5 w-3.5 hidden sm:inline" /> Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="requests"><RegistrationRequests /></TabsContent>
        <TabsContent value="users"><UserManagement /></TabsContent>
        <TabsContent value="branches"><BranchManagement /></TabsContent>
        <TabsContent value="settings"><AppSettings /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
