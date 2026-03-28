import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRegistrationRequests, useApproveRequest, useRejectRequest } from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Check, X } from 'lucide-react';
import { RegistrationRequest } from '@/types';

const RegistrationRequests = () => {
  const { user } = useAuth();
  const { data: requests, isLoading } = useRegistrationRequests();
  const { data: branches } = useBranches();
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<RegistrationRequest | null>(null);
  const [assignRole, setAssignRole] = useState('employee');
  const [assignBranch, setAssignBranch] = useState<string>('');
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const openApprove = (req: RegistrationRequest) => {
    setSelectedReq(req);
    setAssignRole(req.requested_role || 'employee');
    setAssignBranch('');
    setApproveDialogOpen(true);
  };

  const openReject = (req: RegistrationRequest) => {
    setSelectedReq(req);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedReq || !user) return;
    await approveRequest.mutateAsync({
      requestId: selectedReq.id,
      reviewerId: user.id,
      role: assignRole,
      branchId: assignBranch || null,
    });
    setApproveDialogOpen(false);
  };

  const handleReject = async () => {
    if (!selectedReq || !user || !rejectReason.trim()) return;
    await rejectRequest.mutateAsync({
      requestId: selectedReq.id,
      reviewerId: user.id,
      reason: rejectReason.trim(),
    });
    setRejectDialogOpen(false);
  };

  const filtered = requests?.filter(r => statusFilter === 'all' || r.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">Registration Requests</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !filtered?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No registration requests.</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Requested Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(req => (
                  <TableRow key={req.id}>
                    <TableCell className="font-mono text-xs">{req.requested_user_id}</TableCell>
                    <TableCell className="font-medium">{req.full_name}</TableCell>
                    <TableCell>{req.email}</TableCell>
                    <TableCell>{req.mobile}</TableCell>
                    <TableCell className="capitalize">{req.requested_role}</TableCell>
                    <TableCell>{req.branch_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'default' : 'destructive'} className="capitalize">
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(req.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {req.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="default" onClick={() => openApprove(req)} className="gap-1">
                            <Check className="h-3 w-3" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => openReject(req)} className="gap-1">
                            <X className="h-3 w-3" /> Reject
                          </Button>
                        </div>
                      )}
                      {req.status === 'rejected' && req.rejection_reason && (
                        <span className="text-xs text-destructive">{req.rejection_reason}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Registration</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Approving: <strong>{selectedReq?.full_name}</strong> ({selectedReq?.email})</p>
            <div className="space-y-2">
              <Label>Assign Role</Label>
              <Select value={assignRole} onValueChange={setAssignRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign Branch</Label>
              <Select value={assignBranch} onValueChange={setAssignBranch}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Branch</SelectItem>
                  {branches?.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleApprove} disabled={approveRequest.isPending}>
                {approveRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Registration</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Rejecting: <strong>{selectedReq?.full_name}</strong></p>
            <div className="space-y-2">
              <Label>Rejection Reason *</Label>
              <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={rejectRequest.isPending || !rejectReason.trim()}>
                {rejectRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistrationRequests;
