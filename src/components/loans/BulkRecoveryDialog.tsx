import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBulkAddRecovery } from '@/hooks/useRecoveries';
import { Loan } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const RECOVERY_TYPES = ['Cash', 'Bank Transfer', 'Cheque', 'Court Recovery', 'Asset Sale', 'Other'];

interface Props {
  open: boolean;
  onClose: () => void;
  loans: Loan[];
  target: 'selected' | 'filtered';
  selectedIds: Set<string>;
}

const BulkRecoveryDialog = ({ open, onClose, loans, target, selectedIds }: Props) => {
  const { user } = useAuth();
  const bulkAdd = useBulkAddRecovery();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('Cash');
  const [note, setNote] = useState('');

  const targetLoans = target === 'selected' ? loans.filter(l => selectedIds.has(l.id)) : loans;

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0 || targetLoans.length === 0) return;
    const entries = targetLoans.map(loan => ({
      loan_id: loan.id,
      recovery_date: date,
      recovered_amount: Number(amount),
      recovery_type: type,
      note: note.trim() || null,
      created_by: user?.id || '',
    }));
    await bulkAdd.mutateAsync(entries);
    setAmount('');
    setNote('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Recovery — {targetLoans.length} Loan(s)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            একই তারিখে পূর্বে রিকভারি থাকলে শুধুমাত্র পরিমাণ আপডেট হবে। নতুন তারিখ হলে নতুন এন্ট্রি যুক্ত হবে।
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">তারিখ</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">পরিমাণ (৳)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-9 text-sm" placeholder="0" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ধরণ</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECOVERY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Textarea value={note} onChange={e => setNote(e.target.value)} className="min-h-[50px] text-sm" placeholder="নোট (ঐচ্ছিক)" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={bulkAdd.isPending || !amount || Number(amount) <= 0}>
              {bulkAdd.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Recovery
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkRecoveryDialog;
