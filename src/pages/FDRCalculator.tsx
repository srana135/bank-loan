import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';

const schema = z.object({
  principal: z.coerce.number().positive('Required'),
  rate: z.coerce.number().positive('Required'),
  tenureMonths: z.coerce.number().positive('Required'),
  payoutMode: z.enum(['maturity', 'periodic']),
  periodicType: z.string().optional(),
  interestType: z.enum(['simple', 'compound']),
  hasTin: z.boolean(),
  prematureMonths: z.coerce.number().min(0).optional(),
});

type FormData = z.infer<typeof schema>;

interface FDRResult {
  principal: number;
  grossMaturity: number;
  totalInterest: number;
  taxRate: number;
  taxAmount: number;
  exciseDuty: number;
  netPayable: number;
  premature?: { adjustedRate: number; interest: number; tax: number; net: number };
  periodicPayments?: { period: string; interest: number }[];
}

const FDRCalculator = () => {
  const { data: settings } = useAppSettings();
  const [result, setResult] = useState<FDRResult | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { principal: 500000, rate: 9, tenureMonths: 12, payoutMode: 'maturity', periodicType: 'quarterly', interestType: 'compound', hasTin: true, prematureMonths: 0 },
  });

  const calculate = (data: FormData) => {
    const { principal, rate, tenureMonths, payoutMode, periodicType, interestType, hasTin, prematureMonths } = data;
    const years = tenureMonths / 12;

    let grossMaturity: number;
    let totalInterest: number;

    if (interestType === 'compound') {
      grossMaturity = principal * Math.pow(1 + rate / 100, years);
    } else {
      grossMaturity = principal + (principal * rate * years / 100);
    }
    totalInterest = grossMaturity - principal;

    const taxRate = hasTin ? (settings?.tax_rate_with_tin || 10) : (settings?.tax_rate_without_tin || 15);
    const taxAmount = totalInterest * taxRate / 100;

    const slabs = settings?.excise_duty_slabs || [];
    let exciseDuty = 0;
    for (const slab of slabs) {
      if (grossMaturity >= slab.min && grossMaturity <= (slab.max === null ? Infinity : slab.max)) {
        exciseDuty = slab.duty; break;
      }
    }

    const netPayable = grossMaturity - taxAmount - exciseDuty;

    // Periodic payments
    let periodicPayments: FDRResult['periodicPayments'];
    if (payoutMode === 'periodic') {
      const periods = periodicType === 'monthly' ? tenureMonths : periodicType === 'quarterly' ? Math.floor(tenureMonths / 3) : periodicType === 'half-yearly' ? Math.floor(tenureMonths / 6) : 1;
      const periodInterest = totalInterest / periods;
      periodicPayments = Array.from({ length: periods }, (_, i) => ({
        period: `Period ${i + 1}`,
        interest: Math.round(periodInterest * 100) / 100,
      }));
    }

    // Premature
    let premature: FDRResult['premature'];
    if (prematureMonths && prematureMonths > 0 && prematureMonths < tenureMonths) {
      const discount = settings?.premature_encashment_rate_discount || 2;
      const adjRate = Math.max(0, rate - discount);
      const premYears = prematureMonths / 12;
      const premInterest = interestType === 'compound'
        ? principal * Math.pow(1 + adjRate / 100, premYears) - principal
        : principal * adjRate * premYears / 100;
      const premTax = premInterest * taxRate / 100;
      premature = { adjustedRate: adjRate, interest: Math.round(premInterest * 100) / 100, tax: Math.round(premTax * 100) / 100, net: Math.round((principal + premInterest - premTax) * 100) / 100 };
    }

    setResult({
      principal, grossMaturity: Math.round(grossMaturity * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      taxRate, taxAmount: Math.round(taxAmount * 100) / 100,
      exciseDuty, netPayable: Math.round(netPayable * 100) / 100,
      premature, periodicPayments,
    });
  };

  const exportPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('FDR Report', 14, 15);
    doc.setFontSize(10);
    const lines = [
      `Principal: ৳${result.principal.toLocaleString()}`, `Rate: ${form.getValues('rate')}%`,
      `Tenure: ${form.getValues('tenureMonths')} months`, `Gross Maturity: ৳${result.grossMaturity.toLocaleString()}`,
      `Interest: ৳${result.totalInterest.toLocaleString()}`, `Tax (${result.taxRate}%): ৳${result.taxAmount.toLocaleString()}`,
      `Excise Duty: ৳${result.exciseDuty.toLocaleString()}`, `Net Payable: ৳${result.netPayable.toLocaleString()}`,
    ];
    if (result.premature) {
      lines.push('', '--- Premature Encashment ---',
        `Adjusted Rate: ${result.premature.adjustedRate}%`, `Interest: ৳${result.premature.interest.toLocaleString()}`,
        `Net: ৳${result.premature.net.toLocaleString()}`);
    }
    lines.forEach((l, i) => doc.text(l, 14, 25 + i * 7));
    doc.save('fdr_report.pdf');
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">FDR Calculator</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-shadow">
          <CardHeader><CardTitle className="font-heading text-lg">Fixed Deposit Receipt</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(calculate)} className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Deposit Amount (৳)</Label>
                <Input type="number" step="any" {...form.register('principal')} className="h-9" />
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Annual Interest Rate (%)</Label>
                <Input type="number" step="any" {...form.register('rate')} className="h-9" />
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Tenure (Months)</Label>
                <Input type="number" {...form.register('tenureMonths')} className="h-9" />
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Interest Type</Label>
                <Select value={form.watch('interestType')} onValueChange={v => form.setValue('interestType', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="compound">Compound</SelectItem><SelectItem value="simple">Simple</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Payout Mode</Label>
                <Select value={form.watch('payoutMode')} onValueChange={v => form.setValue('payoutMode', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="maturity">At Maturity</SelectItem><SelectItem value="periodic">Periodic</SelectItem></SelectContent>
                </Select>
              </div>
              {form.watch('payoutMode') === 'periodic' && (
                <div className="space-y-1.5"><Label className="text-xs">Periodic Type</Label>
                  <Select value={form.watch('periodicType') || 'quarterly'} onValueChange={v => form.setValue('periodicType', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="half-yearly">Half-Yearly</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label className="text-xs">TIN Available?</Label>
                <Switch checked={form.watch('hasTin')} onCheckedChange={v => form.setValue('hasTin', v)} />
              </div>
              <Separator />
              <div className="space-y-1.5"><Label className="text-xs">Premature Encashment (months, 0 = none)</Label>
                <Input type="number" min={0} {...form.register('prematureMonths')} className="h-9" />
              </div>
              <Button type="submit" className="w-full">Calculate</Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Card className="bg-primary/5"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Principal</p><p className="text-lg font-bold text-primary">৳{result.principal.toLocaleString()}</p></CardContent></Card>
              <Card className="bg-accent/10"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Interest</p><p className="text-lg font-bold">৳{result.totalInterest.toLocaleString()}</p></CardContent></Card>
              <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Gross Maturity</p><p className="text-lg font-bold">৳{result.grossMaturity.toLocaleString()}</p></CardContent></Card>
              <Card className="bg-destructive/5"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Tax ({result.taxRate}%)</p><p className="text-lg font-bold text-destructive">-৳{result.taxAmount.toLocaleString()}</p></CardContent></Card>
              <Card className="bg-destructive/5"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Excise</p><p className="text-lg font-bold text-destructive">-৳{result.exciseDuty.toLocaleString()}</p></CardContent></Card>
              <Card className="border-2 border-primary/30"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Net Payable</p><p className="text-lg font-bold text-primary">৳{result.netPayable.toLocaleString()}</p></CardContent></Card>
            </div>
            {result.periodicPayments && (
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Periodic Payouts</CardTitle></CardHeader><CardContent>
                <Table><TableHeader><TableRow><TableHead>Period</TableHead><TableHead className="text-right">Interest</TableHead></TableRow></TableHeader>
                  <TableBody>{result.periodicPayments.map(p => (<TableRow key={p.period}><TableCell>{p.period}</TableCell><TableCell className="text-right">৳{p.interest.toLocaleString()}</TableCell></TableRow>))}</TableBody>
                </Table>
              </CardContent></Card>
            )}
            {result.premature && (
              <Card className="border-accent/40"><CardHeader className="pb-2"><CardTitle className="text-sm">Premature Encashment</CardTitle></CardHeader><CardContent className="space-y-1">
                <p className="text-sm">Adjusted Rate: <strong>{result.premature.adjustedRate}%</strong></p>
                <p className="text-sm">Interest Earned: <strong>৳{result.premature.interest.toLocaleString()}</strong></p>
                <p className="text-sm">Tax Deducted: <strong>৳{result.premature.tax.toLocaleString()}</strong></p>
                <p className="text-sm font-bold">Net Amount: ৳{result.premature.net.toLocaleString()}</p>
              </CardContent></Card>
            )}
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1"><Download className="h-3 w-3" /> PDF</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FDRCalculator;
