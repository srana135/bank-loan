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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';

const schema = z.object({
  monthlyDeposit: z.coerce.number().positive('Required'),
  rate: z.coerce.number().positive('Required'),
  tenureValue: z.coerce.number().positive('Required'),
  tenureUnit: z.enum(['months', 'years']),
  startDate: z.string().min(1, 'Required'),
  hasTin: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface DPSResult {
  totalDeposit: number;
  grossMaturity: number;
  totalProfit: number;
  taxRate: number;
  taxAmount: number;
  exciseDuty: number;
  netPayable: number;
  maturityDate: string;
  monthlyBreakdown: { month: number; deposit: number; cumDeposit: number; interest: number; balance: number }[];
}

const DPSCalculator = () => {
  const { data: settings } = useAppSettings();
  const [result, setResult] = useState<DPSResult | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { monthlyDeposit: 5000, rate: 8, tenureValue: 5, tenureUnit: 'years', startDate: new Date().toISOString().split('T')[0], hasTin: true },
  });

  const calculate = (data: FormData) => {
    const { monthlyDeposit, rate, tenureValue, tenureUnit, startDate, hasTin } = data;
    const months = tenureUnit === 'years' ? tenureValue * 12 : tenureValue;
    const monthlyRate = rate / 12 / 100;
    const totalDeposit = monthlyDeposit * months;

    const breakdown: DPSResult['monthlyBreakdown'] = [];
    let balance = 0;
    for (let m = 1; m <= months; m++) {
      balance += monthlyDeposit;
      const interest = balance * monthlyRate;
      balance += interest;
      breakdown.push({ month: m, deposit: monthlyDeposit, cumDeposit: monthlyDeposit * m, interest: Math.round(interest * 100) / 100, balance: Math.round(balance * 100) / 100 });
    }

    const grossMaturity = balance;
    const totalProfit = grossMaturity - totalDeposit;
    const taxRate = hasTin ? (settings?.tax_rate_with_tin || 10) : (settings?.tax_rate_without_tin || 15);
    const taxAmount = totalProfit * taxRate / 100;

    // Excise duty
    const slabs = settings?.excise_duty_slabs || [];
    let exciseDuty = 0;
    for (const slab of slabs) {
      if (grossMaturity >= slab.min && grossMaturity <= (slab.max === null ? Infinity : slab.max)) {
        exciseDuty = slab.duty;
        break;
      }
    }

    const netPayable = grossMaturity - taxAmount - exciseDuty;

    const start = new Date(startDate);
    const matDate = new Date(start);
    matDate.setMonth(matDate.getMonth() + months);

    setResult({
      totalDeposit, grossMaturity: Math.round(grossMaturity * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      taxRate, taxAmount: Math.round(taxAmount * 100) / 100,
      exciseDuty, netPayable: Math.round(netPayable * 100) / 100,
      maturityDate: matDate.toLocaleDateString(),
      monthlyBreakdown: breakdown,
    });
  };

  const exportPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('DPS Report', 14, 15);
    doc.setFontSize(10);
    const lines = [
      `Monthly Deposit: ৳${form.getValues('monthlyDeposit').toLocaleString()}`,
      `Rate: ${form.getValues('rate')}%`,
      `Tenure: ${form.getValues('tenureValue')} ${form.getValues('tenureUnit')}`,
      `Total Deposited: ৳${result.totalDeposit.toLocaleString()}`,
      `Gross Maturity: ৳${result.grossMaturity.toLocaleString()}`,
      `Total Profit: ৳${result.totalProfit.toLocaleString()}`,
      `Tax (${result.taxRate}%): ৳${result.taxAmount.toLocaleString()}`,
      `Excise Duty: ৳${result.exciseDuty.toLocaleString()}`,
      `Net Payable: ৳${result.netPayable.toLocaleString()}`,
      `Maturity Date: ${result.maturityDate}`,
    ];
    lines.forEach((l, i) => doc.text(l, 14, 25 + i * 7));
    doc.save('dps_report.pdf');
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">DPS Calculator</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-shadow">
          <CardHeader><CardTitle className="font-heading text-lg">Deposit Pension Scheme</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(calculate)} className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Monthly Deposit (৳)</Label>
                <Input type="number" step="any" {...form.register('monthlyDeposit')} className="h-9" />
                {form.formState.errors.monthlyDeposit && <p className="text-xs text-destructive">{form.formState.errors.monthlyDeposit.message}</p>}
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Annual Interest Rate (%)</Label>
                <Input type="number" step="any" {...form.register('rate')} className="h-9" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label className="text-xs">Tenure</Label>
                  <Input type="number" {...form.register('tenureValue')} className="h-9" />
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Unit</Label>
                  <Select value={form.watch('tenureUnit')} onValueChange={v => form.setValue('tenureUnit', v as any)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="months">Months</SelectItem><SelectItem value="years">Years</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Start Date</Label>
                <Input type="date" {...form.register('startDate')} className="h-9" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">TIN Available?</Label>
                <Switch checked={form.watch('hasTin')} onCheckedChange={v => form.setValue('hasTin', v)} />
              </div>
              <Button type="submit" className="w-full">Calculate</Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Card className="bg-primary/5"><CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Deposited</p>
                <p className="text-lg font-bold text-primary">৳{result.totalDeposit.toLocaleString()}</p>
              </CardContent></Card>
              <Card className="bg-accent/10"><CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Profit</p>
                <p className="text-lg font-bold text-accent-foreground">৳{result.totalProfit.toLocaleString()}</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Gross Maturity</p>
                <p className="text-lg font-bold">৳{result.grossMaturity.toLocaleString()}</p>
              </CardContent></Card>
              <Card className="bg-destructive/5"><CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Tax ({result.taxRate}%)</p>
                <p className="text-lg font-bold text-destructive">-৳{result.taxAmount.toLocaleString()}</p>
              </CardContent></Card>
              <Card className="bg-destructive/5"><CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Excise Duty</p>
                <p className="text-lg font-bold text-destructive">-৳{result.exciseDuty.toLocaleString()}</p>
              </CardContent></Card>
              <Card className="border-2 border-primary/30"><CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Net Payable</p>
                <p className="text-lg font-bold text-primary">৳{result.netPayable.toLocaleString()}</p>
              </CardContent></Card>
            </div>
            <p className="text-sm text-muted-foreground text-center">Maturity Date: {result.maturityDate}</p>
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1"><Download className="h-3 w-3" /> PDF</Button>
            <Card><div className="overflow-auto max-h-[300px]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Month</TableHead><TableHead className="text-right">Deposit</TableHead>
                  <TableHead className="text-right">Cum. Deposit</TableHead><TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {result.monthlyBreakdown.map(r => (
                    <TableRow key={r.month}>
                      <TableCell>{r.month}</TableCell>
                      <TableCell className="text-right">৳{r.deposit.toLocaleString()}</TableCell>
                      <TableCell className="text-right">৳{r.cumDeposit.toLocaleString()}</TableCell>
                      <TableCell className="text-right">৳{r.interest.toLocaleString()}</TableCell>
                      <TableCell className="text-right">৳{r.balance.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div></Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default DPSCalculator;
