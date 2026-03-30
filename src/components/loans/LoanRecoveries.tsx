import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoanRecoveries, useAddRecovery } from '@/hooks/useRecoveries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Banknote } from 'lucide-react';

const RECOVERY_TYPES = ['Cash', 'Bank Transfer', 'Cheque', 'Court Recovery', 'Asset Sale', 'Other'];

interface Props {
  loanId: string;
}

const LoanRecoveries = ({ loanId }: Props) => {
  const { user, userRole } = useAuth();
  const { data: recoveries, isLoading } = useLoanRecoveries(loanId);
  const addRecovery = useAddRecovery();
  const canAdd = userRole === 'admin' || userRole === 'manager';

  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('Cash');
  const [note, setNote] = useState('');

  const handleAdd = async () => {
    if (!amount || Number(amount) <= 0) return;
    await addRecovery.mutateAsync({
      loan_id: loanId,
      recovery_date: date,
      recovered_amount: Number(amount),
      recovery_type: type,
      note: note.trim() || null,
      created_by: user?.id,
    });
    setAmount(''); setNote(''); setShowForm(false);
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
              <CardContent className="p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-xs font-medium">৳{r.recovered_amount.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{r.recovery_date} · {r.recovery_type}</p>
                  </div>
                </div>
                {r.note && <p className="text-[10px] text-muted-foreground max-w-[40%] truncate">{r.note}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No recoveries recorded.</p>
      )}
    </div>
  );
};

export default LoanRecoveries;
