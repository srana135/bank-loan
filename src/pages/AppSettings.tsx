import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppSettings, AppSettingsMap } from '@/hooks/useAppSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, Plus, Trash2, Settings, Calculator, Scale, MapPin, Gavel, MessageSquare, Globe, Shield, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';

const upsertSetting = async (key: string, value: unknown) => {
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
  const [activeTab, setActiveTab] = useState('tax');

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
      toast.success('সেটিংস সফলভাবে সংরক্ষিত হয়েছে');
    } catch (err: any) {
      toast.error(err.message || 'সংরক্ষণ ব্যর্থ');
    }
    setSaving(false);
  };

  // Excise slab helpers
  const addSlab = () => {
    const slabs = [...form.excise_duty_slabs];
    const lastMax = slabs.length ? slabs[slabs.length - 1].max : 0;
    slabs.push({ min: lastMax + 1, max: lastMax + 1000000, duty: 0 });
    update('excise_duty_slabs', slabs);
  };
  const removeSlab = (i: number) => update('excise_duty_slabs', form.excise_duty_slabs.filter((_, idx) => idx !== i));
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

  // Classification helpers
  const updateClassDays = (field: string, val: number) => {
    update('classification_days', { ...form.classification_days, [field]: val });
  };

  // Legal config helpers
  const addCaseType = () => {
    const types = [...form.legal_case_config.case_types, ''];
    update('legal_case_config', { ...form.legal_case_config, case_types: types });
  };
  const removeCaseType = (i: number) => {
    update('legal_case_config', {
      ...form.legal_case_config,
      case_types: form.legal_case_config.case_types.filter((_, idx) => idx !== i),
    });
  };
  const updateCaseType = (i: number, val: string) => {
    const types = [...form.legal_case_config.case_types];
    types[i] = val;
    update('legal_case_config', { ...form.legal_case_config, case_types: types });
  };

  // Currency helpers
  const addCurrency = () => update('default_currencies', [...form.default_currencies, '']);
  const removeCurrency = (i: number) => update('default_currencies', form.default_currencies.filter((_, idx) => idx !== i));
  const updateCurrency = (i: number, val: string) => {
    const c = [...form.default_currencies];
    c[i] = val.toUpperCase();
    update('default_currencies', c);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" /> App Settings
          </h2>
          <p className="text-sm text-muted-foreground">পুরো সিস্টেম এখান থেকে নিয়ন্ত্রণ করুন</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          সব সংরক্ষণ করুন
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-11 h-auto">
          <TabsTrigger value="tax" className="text-xs gap-1"><Calculator className="h-3 w-3" /> কর/শুল্ক</TabsTrigger>
          <TabsTrigger value="interest" className="text-xs gap-1"><Scale className="h-3 w-3" /> সুদ</TabsTrigger>
          <TabsTrigger value="eligibility" className="text-xs gap-1"><Shield className="h-3 w-3" /> যোগ্যতা</TabsTrigger>
          <TabsTrigger value="classification" className="text-xs gap-1"><Badge className="h-3 w-3">CL</Badge> শ্রেণিবিভাগ</TabsTrigger>
          <TabsTrigger value="calculator" className="text-xs gap-1"><Calculator className="h-3 w-3" /> ক্যালকুলেটর</TabsTrigger>
          <TabsTrigger value="legal" className="text-xs gap-1"><Gavel className="h-3 w-3" /> মামলা</TabsTrigger>
          <TabsTrigger value="map" className="text-xs gap-1"><MapPin className="h-3 w-3" /> ম্যাপ</TabsTrigger>
          <TabsTrigger value="connect" className="text-xs gap-1"><MessageSquare className="h-3 w-3" /> Connect</TabsTrigger>
          <TabsTrigger value="timezone" className="text-xs gap-1"><Clock className="h-3 w-3" /> সময়</TabsTrigger>
          <TabsTrigger value="pdf" className="text-xs gap-1"><FileText className="h-3 w-3" /> PDF</TabsTrigger>
          <TabsTrigger value="general" className="text-xs gap-1"><Globe className="h-3 w-3" /> সাধারণ</TabsTrigger>
        </TabsList>

        {/* ============ TAX & DUTY ============ */}
        <TabsContent value="tax" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">কর হার (Tax Rates)</CardTitle>
              <CardDescription>TIN সহ এবং TIN ছাড়া কর হার — FDR/DPS ক্যালকুলেটরে ব্যবহৃত হয়</CardDescription>
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">আবগারি শুল্ক স্ল্যাব (Excise Duty)</CardTitle>
              <CardDescription>ব্যালেন্স অনুযায়ী আবগারি শুল্ক — FDR/DPS ক্যালকুলেটরে প্রযোজ্য</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                    <Input type="number" value={slab.max === Infinity ? '' : slab.max} placeholder="∞" onChange={e => updateSlab(i, 'max', e.target.value ? +e.target.value : Infinity)} />
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
                <Plus className="h-3.5 w-3.5" /> স্ল্যাব যোগ করুন
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">মেয়াদপূর্তির আগে ভাঙানো (Premature Encashment)</CardTitle>
              <CardDescription>FDR/DPS মেয়াদপূর্তির আগে ভাঙালে সুদ হার থেকে কত % কমানো হবে</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-w-xs">
                <Label>Rate Discount (%)</Label>
                <Input type="number" step="0.1" value={form.premature_encashment_rate_discount} onChange={e => update('premature_encashment_rate_discount', +e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ INTEREST ENGINE ============ */}
        <TabsContent value="interest" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">সুদ গণনা ইঞ্জিন (Interest Engine)</CardTitle>
              <CardDescription>EMI ক্যালকুলেটর এবং ঋণ সুদ গণনায় ব্যবহৃত নিয়মাবলী</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>EMI Rounding (৳)</Label>
                <Input type="number" value={form.emi_rounding} onChange={e => update('emi_rounding', +e.target.value)} />
                <p className="text-xs text-muted-foreground">EMI কত টাকার গুণিতকে রাউন্ড হবে</p>
              </div>
              <div className="space-y-1.5">
                <Label>Ceiling Rounding (৳)</Label>
                <Input type="number" value={form.simple_interest_ceiling_rounding} onChange={e => update('simple_interest_ceiling_rounding', +e.target.value)} />
                <p className="text-xs text-muted-foreground">সুদ সিলিং রাউন্ডিং</p>
              </div>
              <div className="space-y-1.5">
                <Label>Grace Period (মাস)</Label>
                <Input type="number" value={form.simple_interest_grace_months} onChange={e => update('simple_interest_grace_months', +e.target.value)} />
                <p className="text-xs text-muted-foreground">কিস্তি শুরুর আগে গ্রেস পিরিয়ড</p>
              </div>
              <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3 p-3 rounded-md bg-muted/30">
                <Switch
                  checked={form.simple_interest_grace_accumulates}
                  onCheckedChange={v => update('simple_interest_grace_accumulates', v)}
                />
                <div>
                  <Label>Grace period এ সুদ জমা হবে</Label>
                  <p className="text-xs text-muted-foreground">বন্ধ থাকলে গ্রেস পিরিয়ডে কোনো সুদ ধার্য হবে না</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ ELIGIBILITY ============ */}
        <TabsContent value="eligibility" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">ঋণ যোগ্যতা প্যারামিটার (Loan Eligibility)</CardTitle>
              <CardDescription>Loan Eligibility Calculator এ ব্যবহৃত DTI অনুপাত, সর্বোচ্চ পরিমাণ ও মেয়াদ</CardDescription>
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
                        <p className="text-xs text-muted-foreground">আয়ের কত % পর্যন্ত</p>
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
                        <Label className="text-xs">Max Tenure (মাস)</Label>
                        <Input type="number" value={config.max_tenure} onChange={e => updateElig(type, 'max_tenure', +e.target.value)} />
                      </div>
                    </div>
                    {type !== 'home_loan' && <Separator className="mt-4" />}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ CLASSIFICATION ============ */}
        <TabsContent value="classification" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">ঋণ শ্রেণিবিভাগ (Loan Classification)</CardTitle>
              <CardDescription>বকেয়া দিনের উপর ভিত্তি করে ঋণ শ্রেণিবিভাগ — STD, SMA, SS, DF, BL</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>STD সর্বোচ্চ দিন</Label>
                <Input type="number" value={form.classification_days.std_max} onChange={e => updateClassDays('std_max', +e.target.value)} />
                <p className="text-xs text-muted-foreground">0 – {form.classification_days.std_max} দিন = STD</p>
              </div>
              <div className="space-y-1.5">
                <Label>SMA সর্বোচ্চ দিন</Label>
                <Input type="number" value={form.classification_days.sma_max} onChange={e => updateClassDays('sma_max', +e.target.value)} />
                <p className="text-xs text-muted-foreground">{form.classification_days.std_max + 1} – {form.classification_days.sma_max} দিন = SMA</p>
              </div>
              <div className="space-y-1.5">
                <Label>SS সর্বোচ্চ দিন</Label>
                <Input type="number" value={form.classification_days.ss_max} onChange={e => updateClassDays('ss_max', +e.target.value)} />
                <p className="text-xs text-muted-foreground">{form.classification_days.sma_max + 1} – {form.classification_days.ss_max} দিন = SS</p>
              </div>
              <div className="space-y-1.5">
                <Label>DF সর্বোচ্চ দিন</Label>
                <Input type="number" value={form.classification_days.df_max} onChange={e => updateClassDays('df_max', +e.target.value)} />
                <p className="text-xs text-muted-foreground">{form.classification_days.ss_max + 1} – {form.classification_days.df_max} দিন = DF<br />{form.classification_days.df_max}+ দিন = BL</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ CALCULATOR DEFAULTS ============ */}
        <TabsContent value="calculator" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">DPS/FDR ডিফল্ট মান</CardTitle>
              <CardDescription>DPS এবং FDR ক্যালকুলেটরের ডিফল্ট সুদ হার ও মেয়াদ</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>DPS ডিফল্ট হার (%)</Label>
                <Input type="number" step="0.1" value={form.dps_default_rate} onChange={e => update('dps_default_rate', +e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>DPS ডিফল্ট মেয়াদ (বছর)</Label>
                <Input type="number" value={form.dps_default_tenure_years} onChange={e => update('dps_default_tenure_years', +e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>FDR ডিফল্ট হার (%)</Label>
                <Input type="number" step="0.1" value={form.fdr_default_rate} onChange={e => update('fdr_default_rate', +e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>FDR ডিফল্ট মেয়াদ (মাস)</Label>
                <Input type="number" value={form.fdr_default_tenure_months} onChange={e => update('fdr_default_tenure_months', +e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">মুদ্রা তালিকা (Currency List)</CardTitle>
              <CardDescription>Currency Converter এ দেখানো হবে এমন মুদ্রা কোড</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {form.default_currencies.map((cur, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Input
                      className="w-20 h-8 text-xs text-center uppercase"
                      value={cur}
                      maxLength={3}
                      onChange={e => updateCurrency(i, e.target.value)}
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeCurrency(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addCurrency} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> মুদ্রা যোগ
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ LEGAL CASE CONFIG ============ */}
        <TabsContent value="legal" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">মামলা কনফিগারেশন (Legal Case)</CardTitle>
              <CardDescription>মামলার ধরণ এবং ডিফল্ট আদালত</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>মামলার ধরণ (Case Types)</Label>
                <div className="flex flex-wrap gap-2">
                  {form.legal_case_config.case_types.map((ct, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <Input
                        className="w-32 h-8 text-xs"
                        value={ct}
                        onChange={e => updateCaseType(i, e.target.value)}
                        placeholder="e.g. NI"
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeCaseType(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={addCaseType} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> ধরণ যোগ
                </Button>
              </div>
              <div className="space-y-1.5 max-w-md">
                <Label>ডিফল্ট আদালত (Default Court)</Label>
                <Input
                  value={form.legal_case_config.default_court}
                  onChange={e => update('legal_case_config', { ...form.legal_case_config, default_court: e.target.value })}
                  placeholder="e.g. অর্থ ঋণ আদালত, ঢাকা"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ MAP ============ */}
        <TabsContent value="map" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">ম্যাপ সেটিংস (Loan Map)</CardTitle>
              <CardDescription>Loan Map পেজের ডিফল্ট কেন্দ্রবিন্দু ও ব্যাসার্ধ</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>ডিফল্ট ব্যাসার্ধ (কি.মি.)</Label>
                <Input type="number" step="0.5" value={form.default_map_radius_km} onChange={e => update('default_map_radius_km', +e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ডিফল্ট Latitude</Label>
                <Input type="number" step="0.0001" value={form.default_map_lat} onChange={e => update('default_map_lat', +e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ডিফল্ট Longitude</Label>
                <Input type="number" step="0.0001" value={form.default_map_lng} onChange={e => update('default_map_lng', +e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ CONNECT PAGE ============ */}
        <TabsContent value="connect" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Connect Us পেজ সেটিংস</CardTitle>
              <CardDescription>Connect Us পেজে দেখানো যোগাযোগের তথ্য পরিবর্তন করুন</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>নাম (Name)</Label>
                <Input value={form.connect_name} onChange={e => update('connect_name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>পদবি (Designation)</Label>
                <Input value={form.connect_designation} onChange={e => update('connect_designation', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>প্রতিষ্ঠান (Organization)</Label>
                <Input value={form.connect_organization} onChange={e => update('connect_organization', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>মোবাইল (Mobile)</Label>
                <Input value={form.connect_mobile} onChange={e => update('connect_mobile', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ইমেইল (Email)</Label>
                <Input value={form.connect_email} onChange={e => update('connect_email', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>অবস্থান (Location)</Label>
                <Input value={form.connect_location} onChange={e => update('connect_location', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ম্যাপ Latitude</Label>
                <Input type="number" step="0.0001" value={form.connect_map_lat} onChange={e => update('connect_map_lat', +e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>ম্যাপ Longitude</Label>
                <Input type="number" step="0.0001" value={form.connect_map_lng} onChange={e => update('connect_map_lng', +e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ TIMEZONE ============ */}
        <TabsContent value="timezone" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">সময় অঞ্চল ও ফরম্যাট (Timezone & Time Format)</CardTitle>
              <CardDescription>অ্যাপে দেখানো সময় ও তারিখের সেটিংস</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>টাইমজোন (Timezone)</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.app_timezone}
                  onChange={e => update('app_timezone', e.target.value)}
                >
                  {[
                    'Asia/Dhaka', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Kuwait',
                    'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Tokyo', 'Asia/Hong_Kong',
                    'Europe/London', 'Europe/Berlin', 'Europe/Paris',
                    'America/New_York', 'America/Chicago', 'America/Los_Angeles',
                    'Australia/Sydney', 'Pacific/Auckland', 'UTC'
                  ].map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>সময় ফরম্যাট (Time Format)</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.app_time_format}
                  onChange={e => update('app_time_format', e.target.value)}
                >
                  <option value="12h">12 ঘণ্টা (AM/PM)</option>
                  <option value="24h">24 ঘণ্টা</option>
                </select>
              </div>
              <div className="col-span-full">
                <p className="text-xs text-muted-foreground">
                  বর্তমান সময় ({form.app_timezone}): {new Date().toLocaleString('bn-BD', { timeZone: form.app_timezone, hour12: form.app_time_format === '12h' })}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ PDF & IMPORT COLUMNS ============ */}
        <TabsContent value="pdf" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">PDF এক্সপোর্ট ও ইমপোর্ট কলাম সিলেকশন</CardTitle>
              <CardDescription>PDF ডাউনলোড ও ইমপোর্ট টেমপ্লেটে কোন কলাম থাকবে তা নির্বাচন করুন</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Import columns config */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">ঋণ ইমপোর্ট কলাম (Import Template)</Label>
                <p className="text-xs text-muted-foreground">ইমপোর্ট টেমপ্লেট ও ইমপোর্ট প্রক্রিয়ায় কোন কলাম ব্যবহার হবে তা নির্বাচন করুন</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {[
                    { key: 'account_no', label: 'হিসাব নং', required: true },
                    { key: 'account_name', label: 'প্রতিষ্ঠান' },
                    { key: 'borrower_name', label: 'ঋণগ্রহীতা', required: true },
                    { key: 'mobile', label: 'মোবাইল' },
                    { key: 'account_type', label: 'হিসাবের ধরণ' },
                    { key: 'account_status', label: 'অবস্থা' },
                    { key: 'address', label: 'ঠিকানা' },
                    { key: 'disbursed_loan_amount', label: 'বিতরণকৃত' },
                    { key: 'disbursement_date', label: 'বিতরণ তারিখ' },
                    { key: 'expiry_date', label: 'মেয়াদ শেষের তারিখ' },
                    { key: 'installment_amount', label: 'কিস্তি' },
                    { key: 'overdue_installment_number', label: 'বকেয়া কিস্তি সংখ্যা' },
                    { key: 'overdue_amount', label: 'মেয়াদোত্তীর্ণ' },
                    { key: 'outstanding_amount', label: 'বকেয়া স্থিতি' },
                    { key: 'classification', label: 'শ্রেণিবিভাগ', required: true },
                    { key: 'guarantor_1_name', label: 'জামিনদার ১ নাম' },
                    { key: 'guarantor_1_mobile', label: 'জামিনদার ১ মোবাইল' },
                    { key: 'guarantor_2_name', label: 'জামিনদার ২ নাম' },
                    { key: 'guarantor_2_mobile', label: 'জামিনদার ২ মোবাইল' },
                    { key: 'branch_code', label: 'শাখা কোড' },
                    { key: 'recovered_amount', label: 'আদায়ের পরিমাণ' },
                    { key: 'recovery_date', label: 'আদায়ের তারিখ' },
                  ].map(col => (
                    <label key={col.key} className={`flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50 ${col.required ? 'font-medium' : ''}`}>
                      <Checkbox
                        checked={form.import_loan_columns.includes(col.key)}
                        disabled={col.required}
                        onCheckedChange={(checked) => {
                          if (col.required) return;
                          if (checked) update('import_loan_columns', [...form.import_loan_columns, col.key]);
                          else update('import_loan_columns', form.import_loan_columns.filter(c => c !== col.key));
                        }}
                      />
                      {col.label}{col.required ? ' *' : ''}
                    </label>
                  ))}
                </div>
              </div>

              <Separator />
              {/* Loan PDF columns */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">ঋণ (Loan) PDF কলাম</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {[
                    { key: 'account_no', label: 'হিসাব নং' },
                    { key: 'borrower_name', label: 'ঋণগ্রহীতা' },
                    { key: 'account_name', label: 'প্রতিষ্ঠান' },
                    { key: 'mobile', label: 'মোবাইল' },
                    { key: 'outstanding_amount', label: 'বকেয়া' },
                    { key: 'overdue_amount', label: 'মেয়াদোত্তীর্ণ' },
                    { key: 'classification', label: 'শ্রেণিবিভাগ' },
                    { key: 'installment_amount', label: 'কিস্তি' },
                    { key: 'overdue_installment_number', label: 'বকেয়া কিস্তি সংখ্যা' },
                    { key: 'disbursed_loan_amount', label: 'বিতরণকৃত' },
                    { key: 'disbursement_date', label: 'বিতরণ তারিখ' },
                    { key: 'address', label: 'ঠিকানা' },
                    { key: 'latest_comment', label: 'সর্বশেষ মন্তব্য' },
                    { key: 'latest_proposed_date', label: 'প্রস্তাবিত তারিখ' },
                  ].map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50">
                      <Checkbox
                        checked={form.pdf_loan_columns.includes(col.key)}
                        onCheckedChange={(checked) => {
                          if (checked) update('pdf_loan_columns', [...form.pdf_loan_columns, col.key]);
                          else update('pdf_loan_columns', form.pdf_loan_columns.filter(c => c !== col.key));
                        }}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Legal PDF columns */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">মামলা (Legal Case) PDF কলাম</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {[
                    { key: 'case_number', label: 'মামলা নং' },
                    { key: 'case_type', label: 'ধরণ' },
                    { key: 'defendant_name', label: 'বিবাদী' },
                    { key: 'plaintiff_name', label: 'বাদী' },
                    { key: 'claim_amount', label: 'দাবি' },
                    { key: 'next_date', label: 'পরবর্তী তারিখ' },
                    { key: 'status', label: 'অবস্থা' },
                    { key: 'court_name', label: 'আদালত' },
                    { key: 'filing_date', label: 'দায়ের তারিখ' },
                    { key: 'remarks', label: 'মন্তব্য' },
                  ].map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50">
                      <Checkbox
                        checked={form.pdf_legal_columns.includes(col.key)}
                        onCheckedChange={(checked) => {
                          if (checked) update('pdf_legal_columns', [...form.pdf_legal_columns, col.key]);
                          else update('pdf_legal_columns', form.pdf_legal_columns.filter(c => c !== col.key));
                        }}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Notice PDF columns */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">নোটিশ (Notice) PDF কলাম</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {[
                    { key: 'borrower_name', label: 'ঋণগ্রহীতা' },
                    { key: 'organization_name', label: 'প্রতিষ্ঠান' },
                    { key: 'account_no', label: 'হিসাব নং' },
                    { key: 'notice_type', label: 'নোটিশের ধরণ' },
                    { key: 'sent_date', label: 'প্রেরণ তারিখ' },
                    { key: 'receipt_status', label: 'প্রাপ্তি অবস্থা' },
                    { key: 'receipt_date', label: 'প্রাপ্তি তারিখ' },
                    { key: 'case_filing_deadline', label: 'মামলা ফাইলের শেষ তারিখ' },
                    { key: 'remarks', label: 'মন্তব্য' },
                  ].map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded hover:bg-muted/50">
                      <Checkbox
                        checked={form.pdf_notice_columns.includes(col.key)}
                        onCheckedChange={(checked) => {
                          if (checked) update('pdf_notice_columns', [...form.pdf_notice_columns, col.key]);
                          else update('pdf_notice_columns', form.pdf_notice_columns.filter(c => c !== col.key));
                        }}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">অ্যাপের নাম ও ব্র্যান্ডিং</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>App Name (English)</Label>
                <Input value={form.app_name} onChange={e => update('app_name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>App Name (বাংলা)</Label>
                <Input value={form.app_name_bn} onChange={e => update('app_name_bn', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">SMS টেমপ্লেট</CardTitle>
              <CardDescription>SMS Utility তে ব্যবহৃত ডিফল্ট বার্তা। প্লেসহোল্ডার: {'{{borrower}}'}, {'{{account}}'}, {'{{outstanding}}'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[80px]"
                value={form.sms_template}
                onChange={e => update('sms_template', e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">নিবন্ধন ও অনুমোদন</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
                <Switch
                  checked={form.require_admin_approval}
                  onCheckedChange={v => update('require_admin_approval', v)}
                />
                <div>
                  <Label>নতুন ব্যবহারকারী রেজিস্ট্রেশনে অ্যাডমিন অনুমোদন প্রয়োজন</Label>
                  <p className="text-xs text-muted-foreground">বন্ধ করলে নতুন ইউজার সরাসরি লগইন করতে পারবে</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
