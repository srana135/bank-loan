import { useState, useEffect } from 'react';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RemittanceProfile, RemittanceChannel } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateRemittance, useUpdateRemittance } from '@/hooks/useRemittance';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ALL_CHANNELS: RemittanceChannel[] = ['Bank Transfer', 'bKash', 'Nagad', 'Rocket', 'Exchange House', 'Hand Carry'];

const schema = z.object({
  account_holder_name: z.string().trim().min(1, 'Required').max(120),
  account_number: z.string().trim().max(40).optional().or(z.literal('')),
  mobile_number: z.string().trim().min(6, 'Min 6 digits').max(20),
  expat_name: z.string().trim().max(120).optional().or(z.literal('')),
  expat_mobile: z.string().trim().max(20).optional().or(z.literal('')),
  country: z.string().trim().max(60).optional().or(z.literal('')),
  city: z.string().trim().max(60).optional().or(z.literal('')),
  receiver_name: z.string().trim().max(120).optional().or(z.literal('')),
  receiver_mobile: z.string().trim().max(20).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: RemittanceProfile | null;
  loanId?: string | null;
}

const empty = {
  account_holder_name: '', account_number: '', mobile_number: '',
  expat_name: '', expat_mobile: '', expat_relation: '' as any, country: '', city: '', years_abroad: '' as any,
  sends_money: true, frequency: '' as any, average_amount: '' as any,
  channels: [] as RemittanceChannel[],
  receiver_name: '', receiver_mobile: '', receiver_method: '',
  stability: '' as any, notes: '',
};

const RemittanceForm = ({ open, onClose, initial, loanId }: Props) => {
  const { user, profile } = useAuth();
  const create = useCreateRemittance();
  const update = useUpdateRemittance();
  const [form, setForm] = useState<any>(empty);

  useEffect(() => {
    if (initial) {
      setForm({
        ...initial,
        account_number: initial.account_number || '',
        expat_name: initial.expat_name || '',
        expat_mobile: initial.expat_mobile || '',
        expat_relation: initial.expat_relation || '',
        country: initial.country || '',
        city: initial.city || '',
        years_abroad: initial.years_abroad ?? '',
        frequency: initial.frequency || '',
        average_amount: initial.average_amount ?? '',
        channels: initial.channels || [],
        receiver_name: initial.receiver_name || '',
        receiver_mobile: initial.receiver_mobile || '',
        receiver_method: initial.receiver_method || '',
        stability: initial.stability || '',
        notes: initial.notes || '',
      });
    } else {
      setForm(empty);
    }
  }, [initial, open]);

  const setField = (k: string, v: any) => setForm((s: any) => ({ ...s, [k]: v }));

  const toggleChannel = (c: RemittanceChannel) => {
    setForm((s: any) => ({
      ...s,
      channels: s.channels.includes(c) ? s.channels.filter((x: string) => x !== c) : [...s.channels, c],
    }));
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Invalid data');
      return;
    }
    const payload: any = {
      loan_id: initial?.loan_id ?? loanId ?? null,
      branch_id: initial?.branch_id ?? profile?.branch_id ?? null,
      account_holder_name: form.account_holder_name.trim(),
      account_number: form.account_number?.trim() || null,
      mobile_number: form.mobile_number.trim(),
      expat_name: form.expat_name?.trim() || null,
      expat_mobile: form.expat_mobile?.trim() || null,
      expat_relation: form.expat_relation || null,
      country: form.country?.trim() || null,
      city: form.city?.trim() || null,
      years_abroad: form.years_abroad === '' ? null : Number(form.years_abroad),
      sends_money: !!form.sends_money,
      frequency: form.frequency || null,
      average_amount: form.average_amount === '' ? null : Number(form.average_amount),
      channels: form.channels,
      receiver_name: form.receiver_name?.trim() || null,
      receiver_mobile: form.receiver_mobile?.trim() || null,
      receiver_method: form.receiver_method?.trim() || null,
      stability: form.stability || null,
      notes: form.notes?.trim() || null,
      collected_by: user?.id || null,
      collected_by_name: profile?.full_name || user?.email || null,
      _userId: user?.id || null,
      _userName: profile?.full_name || user?.email || null,
    };

    if (initial) {
      await update.mutateAsync({ id: initial.id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    onClose();
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Remittance Profile' : 'New Remittance Profile'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Client info */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client Info</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Account Holder Name *</Label><Input value={form.account_holder_name} onChange={e => setField('account_holder_name', e.target.value)} /></div>
              <div><Label>Account Number</Label><Input value={form.account_number} onChange={e => setField('account_number', e.target.value)} /></div>
              <div><Label>Mobile Number *</Label><Input value={form.mobile_number} onChange={e => setField('mobile_number', e.target.value)} placeholder="01XXXXXXXXX" /></div>
            </div>
          </section>

          <Separator />

          {/* Expat info */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expat Family Info</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Expat Name</Label><Input value={form.expat_name} onChange={e => setField('expat_name', e.target.value)} /></div>
              <div><Label>Expat Mobile</Label><Input value={form.expat_mobile} onChange={e => setField('expat_mobile', e.target.value)} placeholder="+966 ..." /></div>
              <div>
                <Label>Relation</Label>
                <Select value={form.expat_relation || undefined} onValueChange={v => setField('expat_relation', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['Father', 'Son', 'Brother', 'Husband', 'Other'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Country</Label><Input value={form.country} onChange={e => setField('country', e.target.value)} /></div>
              <div><Label>City</Label><Input value={form.city} onChange={e => setField('city', e.target.value)} /></div>
              <div><Label>Since When Abroad (years)</Label><Input type="number" step="0.5" value={form.years_abroad} onChange={e => setField('years_abroad', e.target.value)} /></div>
            </div>
          </section>

          <Separator />

          {/* Remittance details */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Remittance Details</h4>
            <div className="grid sm:grid-cols-3 gap-3 items-end">
              <div className="flex items-center gap-3 pt-5">
                <Switch checked={form.sends_money} onCheckedChange={v => setField('sends_money', v)} />
                <Label>Sends Money</Label>
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={form.frequency || undefined} onValueChange={v => setField('frequency', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Irregular">Irregular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Average Amount (BDT)</Label><Input type="number" value={form.average_amount} onChange={e => setField('average_amount', e.target.value)} /></div>
            </div>

            <div className="pt-2">
              <Label className="mb-2 block">Channels (multi-select)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_CHANNELS.map(c => (
                  <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.channels.includes(c)} onCheckedChange={() => toggleChannel(c)} />
                    {c}
                  </label>
                ))}
              </div>
            </div>
          </section>

          <Separator />

          {/* Receiver */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Receiver Info (optional)</h4>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label>Receiver Name</Label><Input value={form.receiver_name} onChange={e => setField('receiver_name', e.target.value)} /></div>
              <div><Label>Receiver Mobile</Label><Input value={form.receiver_mobile} onChange={e => setField('receiver_mobile', e.target.value)} /></div>
              <div><Label>Method Used</Label><Input value={form.receiver_method} onChange={e => setField('receiver_method', e.target.value)} placeholder="e.g. bKash" /></div>
            </div>
          </section>

          <Separator />

          {/* Analysis + notes */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Analysis</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Stability</Label>
                <Select value={form.stability || undefined} onValueChange={v => setField('stability', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Stable">Stable</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Uncertain">Uncertain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={e => setField('notes', e.target.value)} maxLength={1000} />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initial ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RemittanceForm;
