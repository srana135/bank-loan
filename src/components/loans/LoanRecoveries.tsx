import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoanRecoveries, useAddRecovery, useUpdateRecovery, useDeleteRecovery } from '@/hooks/useRecoveries';
import { LoanRecovery } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Plus, Banknote, Pencil, Trash2, X, Check } from 'lucide-react';

const RECOVERY_TYPES = ['Cash', 'Bank Transfer', 'Cheque', 'Court Recovery', 'Asset Sale', 'Other'];

interface Props {
  loanId: string;
  asOfDate?: string | null;
}

const LoanRecoveries = ({ loanId, asOfDate }: Props) => {
  const { user, profile, userRole } = useAuth();
  const { data: recoveries, isLoading } = useLoanRecoveries(loanId);
  const addRecovery = useAddRecovery();
  const updateRecovery = useUpdateRecovery();
  const deleteRecovery = useDeleteRecovery();
  const canAdd = userRole === 'admin' || userRole === 'manager';
  const canManage = userRole === 'admin' || userRole === 'manager';

  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('Cash');
  const [note, setNote] = useState('');

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState('');
  const [editNote, setEditNote] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!amount || Number(amount) <= 0) return;
    await addRecovery.mutateAsync({
      loan_id: loanId,
      recovery_date: date,
      recovered_amount: Number(amount),
      recovery_type: type,
      note: note.trim() || null,
      created_by: user?.id,
      _userId: user?.id,
      _userName: profile?.full_name,
    });
    setAmount(''); setNote(''); setShowForm(false);
  };

  const openEdit = (r: LoanRecovery) => {
    setEditId(r.id);
    setEditDate(r.recovery_date);
    setEditAmount(String(r.recovered_amount));
    setEditType(r.recovery_type);
    setEditNote(r.note || '');
  };

  const handleSaveEdit = async () => {
    if (!editId || !editAmount || Number(editAmount) <= 0) return;
    const oldRecovery = recoveries?.find(r => r.id === editId);
    await updateRecovery.mutateAsync({
      id: editId,
      loanId: loanId,
      oldAmount: oldRecovery?.recovered_amount || 0,
      recovery_date: editDate,
      recovered_amount: Number(editAmount),
      recovery_type: editType,
      note: editNote.trim() || null,
      _userId: user?.id,
      _userName: profile?.full_name,
    });
    setEditId(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const rec = recoveries?.find(r => r.id === deleteId);
    await deleteRecovery.mutateAsync({ id: deleteId, loanId: loanId, amount: rec?.recovered_amount || 0, _userId: user?.id, _userName: profile?.full_name });
    setDeleteId(null);
  };

  const totalRecovered = recoveries?.reduce((s, r) => s + r.recovered_amount, 0) || 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Recoveries
          {totalRecovered > 0 && (
            <Badge variant="outline" className="ml-2 text-[10px]">৳{totalRecovered.toLocaleString()}</Badge>
          )}
        </h4>
        {canAdd && !showForm && (
          <Button size="sm" variant="ghost" onClick={() => setShowForm(true)} className="h-6 text-xs gap-1">
            <Plus className="h-3 w-3" /> Add
          </Button>
        )}
      </div>

      {showForm && (
        <div className="space-y-2 p-3 rounded-lg border border-dashed border-border">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-[10px]">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-7 text-xs" /></div>
            <div className="space-y-1"><Label className="text-[10px]">Amount (৳)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-7 text-xs" /></div>
          </div>
          <div className="space-y-1"><Label className="text-[10px]">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{RECOVERY_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
            </Select></div>
          <Textarea value={note} onChange={e => setNote(e.target.value)} className="min-h-[40px] text-xs" placeholder="Note (optional)" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={addRecovery.isPending || !amount} className="h-7 text-xs flex-1">
              {addRecovery.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-7 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
      ) : recoveries && recoveries.length > 0 ? (
        <div className="space-y-1.5">
          {recoveries.map(r => (
            <Card key={r.id} className="bg-muted/30">
              <CardContent className="p-2">
                {editId === r.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="h-7 text-xs" />
                      <Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="h-7 text-xs" />
                    </div>
                    <Select value={editType} onValueChange={setEditType}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{RECOVERY_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input value={editNote} onChange={e => setEditNote(e.target.value)} className="h-7 text-xs" placeholder="Note" />
                    <div className="flex gap-1">
                      <Button size="sm" className="h-6 text-xs gap-0.5" onClick={handleSaveEdit} disabled={updateRecovery.isPending}>
                        <Check className="h-3 w-3" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-xs gap-0.5" onClick={() => setEditId(null)}>
                        <X className="h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-3.5 w-3.5 text-primary" />
                      <div>
                        <p className="text-xs font-medium">৳{r.recovered_amount.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {r.recovery_date} · {r.recovery_type}
                          {asOfDate && (
                            <Badge
                              variant={r.recovery_date > asOfDate ? 'default' : 'outline'}
                              className="ml-1.5 text-[8px] h-3.5 px-1"
                              title={r.recovery_date > asOfDate ? 'Adjusted from imported balance' : 'Informational — pre-cutoff'}
                            >
                              {r.recovery_date > asOfDate ? 'Post-cutoff' : 'Pre-cutoff'}
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {r.note && <p className="text-[10px] text-muted-foreground max-w-[100px] truncate">{r.note}</p>}
                      {canManage && (
                        <div className="flex gap-0.5 ml-1">
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => openEdit(r)}>
                            <Pencil className="h-2.5 w-2.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => setDeleteId(r.id)}>
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No recoveries recorded.</p>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recovery</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this recovery entry.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LoanRecoveries;
