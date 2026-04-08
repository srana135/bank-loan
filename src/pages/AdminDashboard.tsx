import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useRegistrationRequests, useProfiles } from '@/hooks/useUsers';
import { useLoans } from '@/hooks/useLoans';
import { useBranches } from '@/hooks/useBranches';
import { useActivityLogs, ActivityLog } from '@/hooks/useActivityLogs';
import { Users, Building2, Landmark, ClipboardList, FileText, Settings, Activity, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import RegistrationRequests from './RegistrationRequests';
import UserManagement from './UserManagement';
import BranchManagement from './BranchManagement';
import AppSettings from './AppSettings';

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400',
  create: 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400',
  update: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400',
  comment: 'bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400',
  recovery: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400',
};

const ActivityLogTab = () => {
  const { data: logs, isLoading } = useActivityLogs(200);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter(l => {
      const matchSearch = !search || 
        l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.entity_type.toLowerCase().includes(search.toLowerCase());
      const matchEntity = entityFilter === 'all' || l.entity_type === entityFilter;
      return matchSearch && matchEntity;
    });
  }, [logs, search, entityFilter]);

  const entityTypes = useMemo(() => {
    if (!logs) return [];
    return [...new Set(logs.map(l => l.entity_type))];
  }, [logs]);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs w-48" />
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {entityTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-[10px] h-6">{filtered.length} logs</Badge>
      </div>

      <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Time</TableHead>
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs">Action</TableHead>
              <TableHead className="text-xs">Entity</TableHead>
              <TableHead className="text-xs">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No activity logs found. Logs will appear after actions are performed.</TableCell></TableRow>
            ) : filtered.map(log => (
              <TableRow key={log.id}>
                <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </TableCell>
                <TableCell className="text-xs font-medium">{log.user_name || 'System'}</TableCell>
                <TableCell>
                  <Badge className={`text-[9px] border-0 ${ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground'}`}>{log.action}</Badge>
                </TableCell>
                <TableCell className="text-xs">{log.entity_type}</TableCell>
                <TableCell className="text-[10px] text-muted-foreground max-w-[200px] truncate">
                  {log.entity_id ? `ID: ${log.entity_id.slice(0, 8)}...` : ''}
                  {log.details && Object.keys(log.details).length > 0 ? ` ${JSON.stringify(log.details).slice(0, 60)}` : ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

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

  // Recently active users
  const recentUsers = useMemo(() => {
    if (!profiles) return [];
    return [...profiles]
      .filter(p => (p as any).last_login_at)
      .sort((a, b) => new Date((b as any).last_login_at).getTime() - new Date((a as any).last_login_at).getTime())
      .slice(0, 5);
  }, [profiles]);

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

      {/* Recently active users */}
      {recentUsers.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Recently Active Users
            </h3>
            <div className="flex flex-wrap gap-3">
              {recentUsers.map(u => (
                <div key={u.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-medium">{u.full_name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date((u as any).last_login_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
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
          <TabsTrigger value="activity" className="gap-1.5 text-xs sm:text-sm">
            <Activity className="h-3.5 w-3.5 hidden sm:inline" /> Activity
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm">
            <Settings className="h-3.5 w-3.5 hidden sm:inline" /> Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="requests"><RegistrationRequests /></TabsContent>
        <TabsContent value="users"><UserManagement /></TabsContent>
        <TabsContent value="branches"><BranchManagement /></TabsContent>
        <TabsContent value="activity"><ActivityLogTab /></TabsContent>
        <TabsContent value="settings"><AppSettings /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
