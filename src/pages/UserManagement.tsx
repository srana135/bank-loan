import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfiles, useUpdateProfile } from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Pencil, UserPlus, Upload, Search, UserX, UserCheck, KeyRound, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useIsMobile } from '@/hooks/use-mobile';

const UserManagement = () => {
  const { user, userRole } = useAuth();
  const { data: profiles, isLoading } = useProfiles();
  const { data: branches } = useBranches();
  const updateProfile = useUpdateProfile();
  const isMobile = useIsMobile();
  const isAdmin = userRole === 'admin';

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // Edit form
  const [editFullName, setEditFullName] = useState('');
  const [editUserId, setEditUserId] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editRole, setEditRole] = useState('employee');
  const [editBranch, setEditBranch] = useState('');

  // Create form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newRole, setNewRole] = useState('employee');
  const [newBranch, setNewBranch] = useState('');
  const [creating, setCreating] = useState(false);

  const openEdit = (p: Profile) => {
    setSelectedProfile(p);
    setEditFullName(p.full_name || '');
    setEditUserId(p.user_id || '');
    setEditMobile(p.mobile || '');
    setEditRole(p.role);
    setEditBranch(p.branch_id || '');
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedProfile) return;
    await updateProfile.mutateAsync({
      id: selectedProfile.id,
      full_name: editFullName,
      user_id: editUserId || null,
      mobile: editMobile || null,
      role: editRole as any,
      branch_id: editBranch && editBranch !== 'none' ? editBranch : null,
    });
    setEditDialogOpen(false);
  };

  const handleToggleActive = async (p: Profile) => {
    await updateProfile.mutateAsync({ id: p.id, is_active: !p.is_active });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const handleCreate = async () => {
    if (!newEmail || !newPassword || !newFullName) {
      toast.error('Email, password, and name are required');
      return;
    }
    setCreating(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: { data: { full_name: newFullName } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      await new Promise(resolve => setTimeout(resolve, 1000));
      await supabase.from('profiles').update({
        user_id: newUserId || null,
        mobile: newMobile || null,
        role: newRole,
        branch_id: newBranch && newBranch !== 'none' ? newBranch : null,
        is_active: true,
      }).eq('id', authData.user.id);

      toast.success('User created successfully');
      setCreateDialogOpen(false);
      setNewEmail(''); setNewPassword(''); setNewFullName(''); setNewUserId('');
      setNewMobile(''); setNewRole('employee'); setNewBranch('');
    } catch (err: any) {
      toast.error(err.message);
    }
    setCreating(false);
  };

  const handleResetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success('Password reset email sent');
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        let success = 0, failed = 0;
        const errors: any[] = [];
        for (const row of rows) {
          try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
              email: String(row['Email'] || row['email']),
              password: String(row['Password'] || row['password'] || 'Default@123'),
              options: { data: { full_name: String(row['Full Name'] || row['full_name'] || '') } },
            });
            if (authError) throw authError;
            if (authData.user) {
              await new Promise(resolve => setTimeout(resolve, 500));
              await supabase.from('profiles').update({
                user_id: String(row['User ID'] || row['user_id'] || ''),
                mobile: String(row['Mobile'] || row['mobile'] || ''),
                role: String(row['Role'] || row['role'] || 'employee'),
                branch_id: row['Branch ID'] || row['branch_id'] || null,
                is_active: true,
              }).eq('id', authData.user.id);
            }
            success++;
          } catch (err: any) {
            failed++;
            errors.push({ email: row['Email'], error: err.message });
          }
        }
        await supabase.from('user_import_logs').insert({
          file_name: file.name,
          total_rows: rows.length,
          success_rows: success,
          failed_rows: failed,
          error_summary: errors.length > 0 ? errors : null,
          imported_by: user?.id,
        });
        toast.success(`Import: ${success} success, ${failed} failed`);
      } catch (err: any) {
        toast.error('Import failed: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Filter: hide admin profiles from non-admin users
  const filtered = profiles?.filter(p => {
    // Non-admins cannot see admin profiles
    if (!isAdmin && p.role === 'admin') return false;
    const matchSearch = !search ||
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.user_id?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || p.role === roleFilter;
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? p.is_active : !p.is_active);
    const matchBranch = branchFilter === 'all' || p.branch_id === branchFilter;
    return matchSearch && matchRole && matchStatus && matchBranch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="font-heading text-2xl font-bold">User Management</h2>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2"><UserPlus className="h-4 w-4" /> Create User</Button>
            <label>
              <Button variant="outline" className="gap-2 cursor-pointer" asChild>
                <span><Upload className="h-4 w-4" /> Bulk Import</span>
              </Button>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBulkImport} />
            </label>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, or user ID..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Branch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches?.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !filtered?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No users found.</CardContent></Card>
      ) : isMobile ? (
        /* Mobile: Card layout */
        <div className="space-y-3">
          {filtered.map(p => (
            <Card key={p.id} className="card-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {(p.full_name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{p.full_name || '-'}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </div>
                  </div>
                  <Badge variant={p.is_active ? 'default' : 'destructive'} className="text-[10px]">{p.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono">{p.user_id || '-'}</span></div>
                  <div><span className="text-muted-foreground">Role:</span> <Badge variant="secondary" className="capitalize text-[10px] h-4 ml-1">{p.role}</Badge></div>
                  <div><span className="text-muted-foreground">Mobile:</span> <span>{p.mobile || '-'}</span></div>
                  <div><span className="text-muted-foreground">Branch:</span> <span>{branches?.find(b => b.id === p.branch_id)?.branch_name || '-'}</span></div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 pt-1 border-t border-border/50">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1" onClick={() => openEdit(p)}>
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleToggleActive(p)}>
                      {p.is_active ? <UserX className="h-3 w-3 text-destructive" /> : <UserCheck className="h-3 w-3" />}
                    </Button>
                    {p.email && (
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleResetPassword(p.email!)}>
                        <KeyRound className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8 text-xs text-destructive" onClick={() => { setDeleteTarget(p); setDeleteDialogOpen(true); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Desktop: Table layout */
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.user_id || '-'}</TableCell>
                    <TableCell className="font-medium">{p.full_name || '-'}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>{p.mobile || '-'}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{p.role}</Badge></TableCell>
                    <TableCell>{branches?.find(b => b.id === p.branch_id)?.branch_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? 'default' : 'destructive'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(p)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleToggleActive(p)} title={p.is_active ? 'Deactivate' : 'Activate'}>
                            {p.is_active ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-success" />}
                          </Button>
                          {p.email && (
                            <Button size="icon" variant="ghost" onClick={() => handleResetPassword(p.email!)} title="Reset Password">
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => { setDeleteTarget(p); setDeleteDialogOpen(true); }} title="Delete User">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Full Name</Label><Input value={editFullName} onChange={e => setEditFullName(e.target.value)} /></div>
            <div className="space-y-2"><Label>User ID</Label><Input value={editUserId} onChange={e => setEditUserId(e.target.value)} /></div>
            <div className="space-y-2"><Label>Mobile</Label><Input value={editMobile} onChange={e => setEditMobile(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={editBranch} onValueChange={setEditBranch}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Branch</SelectItem>
                  {branches?.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Password *</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
            <div className="space-y-2"><Label>Full Name *</Label><Input value={newFullName} onChange={e => setNewFullName(e.target.value)} /></div>
            <div className="space-y-2"><Label>User ID</Label><Input value={newUserId} onChange={e => setNewUserId(e.target.value)} /></div>
            <div className="space-y-2"><Label>Mobile</Label><Input value={newMobile} onChange={e => setNewMobile(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={newBranch} onValueChange={setNewBranch}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Branch</SelectItem>
                  {branches?.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
