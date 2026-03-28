import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useRegistrationRequests } from '@/hooks/useUsers';
import RegistrationRequests from './RegistrationRequests';
import UserManagement from './UserManagement';
import BranchManagement from './BranchManagement';
import AppSettings from './AppSettings';

const AdminDashboard = () => {
  const { profile, userRole } = useAuth();
  const { data: requests } = useRegistrationRequests();
  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage users, branches, and system settings
          <Badge variant="secondary" className="ml-2 capitalize">{userRole}</Badge>
        </p>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requests" className="gap-2">
            Requests
            {pendingCount > 0 && <Badge variant="destructive" className="h-5 min-w-5 text-xs">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
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
