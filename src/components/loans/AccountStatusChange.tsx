import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { logActivity } from '@/hooks/useActivityLogs';

const STATUSES = ['Regular', 'Irregular', 'Frozen', 'Closed', 'Written Off', 'Rescheduled', 'Settled'];

interface Props {
  loanId: string;
  currentStatus: string | null;
  accountNo: string | null;
}

const AccountStatusChange = ({ loanId, currentStatus, accountNo }: Props) => {
  const { user, profile, userRole } = useAuth();
  const qc = useQueryClient();
  const canChange = userRole === 'admin' || userRole === 'manager';
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus || '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (!canChange) return null;

  const handleSave = async () => {
    if (!newStatus || newStatus === currentStatus) return;
    setSaving(true);
    try {
      // Update loan status
      const { error: updateErr } = await supabase.from('loans')
        .update({ account_status: newStatus, updated_by: user?.id })
        .eq('id', loanId);
      if (updateErr) throw updateErr;

      // Log to audit_logs
      const { error: auditErr } = await supabase.from('audit_logs').insert({
        table_name: 'loans',
        record_id: loanId,
        action: 'status_change',
        old_value: { account_status: currentStatus },
        new_value: { account_status: newStatus, reason },
        performed_by: user?.id,
      });
      if (auditErr) console.warn('Audit log failed:', auditErr.message);

      logActivity(user?.id || null, profile?.full_name || null, 'update', 'loan', loanId, {
        field: 'Account Status',
        old_value: currentStatus || '—',
        new_value: newStatus,
        note: reason || undefined,
      });
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success(`Status changed: ${currentStatus || '-'} → ${newStatus}`);
      setOpen(false);
      setReason('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setNewStatus(currentStatus || ''); setOpen(true); }}>
        <RefreshCw className="h-3 w-3" /> Change Status
      </Button>

      <Dialog open={open} onOpenChange={v => { if (!v) setOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Change Account Status</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Account: {accountNo || loanId}</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Current Status</Label>
              <p className="text-sm font-medium">{currentStatus || '-'}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reason (optional)</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} className="min-h-[60px] text-sm" placeholder="Reason for status change..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !newStatus || newStatus === currentStatus}>
                {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AccountStatusChange;
