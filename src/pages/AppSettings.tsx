import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppSettings, AppSettingsMap } from '@/hooks/useAppSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

/** Upsert a single setting key */
const upsertSetting = async (key: string, value: unknown) => {
  // Try update first
  const { data, error: selErr } = await supabase
    .from('app_settings')
    .select('id')
    .eq('setting_key', key)
    .maybeSingle();
  if (selErr && !selErr.message.includes('PGRST')) throw selErr;
  if (data) {
    const { error } = await supabase.from('app_settings').update({ setting_value: value }).eq('id', data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('app_settings').insert({ setting_key: key, setting_value: value });
    if (error) throw error;
  }
};

const AppSettings = () => {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useAppSettings();
  const [form, setForm] = useState<AppSettingsMap | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm({ ...settings });
  }, [settings]);

  if (isLoading || !form) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const update = <K extends keyof AppSettingsMap>(key: K, val: AppSettingsMap[K]) => {
    setForm(prev => prev ? { ...prev, [key]: val } : prev);
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const entries = Object.entries(form) as [keyof AppSettingsMap, unknown][];
      for (const [key, value] of entries) {
        await upsertSetting(key as string, value);
      }
      qc.invalidateQueries({ queryKey: ['app-settings-all'] });
      qc.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('সেটিংস সংরক্ষিত হয়েছে');
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    }
    setSaving(false);
  };

  // Excise duty slab helpers
  const addSlab = () => {
    const slabs = [...form.excise_duty_slabs];
    const lastMax = slabs.length ? slabs[slabs.length - 1].max : 0;
    slabs.push({ min: lastMax + 1, max: lastMax + 1000000, duty: 0 });
    update('excise_duty_slabs', slabs);
  };
  const removeSlab = (i: number) => {
    update('excise_duty_slabs', form.excise_duty_slabs.filter((_, idx) => idx !== i));
  };
  const updateSlab = (i: number, field: 'min' | 'max' | 'duty', val: number) => {
    const slabs = [...form.excise_duty_slabs];
    slabs[i] = { ...slabs[i], [field]: val };
    update('excise_duty_slabs', slabs);
  };

  // Eligibility helpers
  const updateElig = (type: 'cmsme' | 'personal' | 'home_loan', field: string, val: number) => {
    update('loan_eligibility', {
      ...form.loan_eligibility,
      [type]: { ...form.loan_eligibility[type], [field]: val },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">App Settings</h2>
          <p className="text-sm text-muted-foreground">Banking parameters এবং system configuration</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All
        </Button>
      </div>

      {/* Tax Rates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tax Rates (%)</CardTitle>
          <CardDescription>TIN সহ এবং TIN ছাড়া কর হার</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>TIN সহ কর হার (%)</Label>
            <Input type="number" value={form.tax_rate_with_tin} onChange={e => update('tax_rate_with_tin', +e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>TIN ছাড়া কর হার (%)</Label>
            <Input type="number" value={form.tax_rate_without_tin} onChange={e => update('tax_rate_without_tin', +e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Excise Duty Slabs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Excise Duty Slabs</CardTitle>
          <CardDescription>ব্যালেন্স অনুযায়ী আবগারি শুল্ক স্ল্যাব</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Min (৳)</span><span>Max (৳)</span><span>Duty (৳)</span><span />
          </div>
          {form.excise_duty_slabs.map((slab, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_40px] gap-2 items-center">
              <div className="space-y-1 sm:space-y-0">
                <Label className="sm:hidden text-xs">Min</Label>
                <Input type="number" value={slab.min === Infinity ? '' : slab.min} onChange={e => updateSlab(i, 'min', +e.target.value)} />
              </div>
              <div className="space-y-1 sm:space-y-0">
                <Label className="sm:hidden text-xs">Max</Label>
                <Input type="number" value={slab.max === Infinity ? '' : slab.max} placeholder="Infinity" onChange={e => updateSlab(i, 'max', e.target.value ? +e.target.value : Infinity)} />
              </div>
              <div className="space-y-1 sm:space-y-0">
                <Label className="sm:hidden text-xs">Duty (৳)</Label>
                <Input type="number" value={slab.duty} onChange={e => updateSlab(i, 'duty', +e.target.value)} />
              </div>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeSlab(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addSlab} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add Slab
          </Button>
        </CardContent>
      </Card>

      {/* Simple Interest Engine */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Simple Interest Engine</CardTitle>
          <CardDescription>ঋণের সুদ গণনার নিয়ম</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>EMI Rounding</Label>
            <Input type="number" value={form.emi_rounding} onChange={e => update('emi_rounding', +e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Ceiling Rounding</Label>
            <Input type="number" value={form.simple_interest_ceiling_rounding} onChange={e => update('simple_interest_ceiling_rounding', +e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Grace Period (Months)</Label>
            <Input type="number" value={form.simple_interest_grace_months} onChange={e => update('simple_interest_grace_months', +e.target.value)} />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
            <Switch
              checked={form.simple_interest_grace_accumulates}
              onCheckedChange={v => update('simple_interest_grace_accumulates', v)}
            />
            <Label>Grace period এ সুদ জমা হবে</Label>
          </div>
        </CardContent>
      </Card>

      {/* Premature Encashment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Premature Encashment</CardTitle>
          <CardDescription>মেয়াদপূর্তির আগে ভাঙালে সুদ ছাড়</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-w-xs">
            <Label>Rate Discount (%)</Label>
            <Input type="number" step="0.1" value={form.premature_encashment_rate_discount} onChange={e => update('premature_encashment_rate_discount', +e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Loan Eligibility */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Loan Eligibility Parameters</CardTitle>
          <CardDescription>ঋণের যোগ্যতা মূল্যায়নের প্যারামিটার</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {(['cmsme', 'personal', 'home_loan'] as const).map(type => {
            const config = form.loan_eligibility[type];
            const label = type === 'cmsme' ? 'CMSME' : type === 'personal' ? 'Personal' : 'Home Loan';
            return (
              <div key={type}>
                <h4 className="font-medium text-sm text-foreground mb-2">{label}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">DTI Ratio</Label>
                    <Input type="number" step="0.01" value={config.dti_ratio} onChange={e => updateElig(type, 'dti_ratio', +e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Amount (৳)</Label>
                    <Input type="number" value={config.max_amount} onChange={e => updateElig(type, 'max_amount', +e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Default Rate (%)</Label>
                    <Input type="number" step="0.1" value={config.default_rate} onChange={e => updateElig(type, 'default_rate', +e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Tenure (Months)</Label>
                    <Input type="number" value={config.max_tenure} onChange={e => updateElig(type, 'max_tenure', +e.target.value)} />
                  </div>
                </div>
                {type !== 'home_loan' && <Separator className="mt-4" />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Bottom save */}
      <div className="flex justify-end pb-6">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          সব সেটিংস সংরক্ষণ করুন
        </Button>
      </div>
    </div>
  );
};

export default AppSettings;
