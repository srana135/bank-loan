import { useState, useRef } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import { format, lastDayOfMonth, addMonths, addWeeks, getDate } from 'date-fns';

const COLORS = ['hsl(215,70%,22%)', 'hsl(42,85%,52%)'];

const FREQUENCIES: Record<string, number> = {
  weekly: 52, 'semi-monthly': 24, monthly: 12, quarterly: 4, 'half-yearly': 2, yearly: 1,
};

const FREQUENCY_MONTHS: Record<string, number> = {
  weekly: 0, 'semi-monthly': 0, monthly: 1, quarterly: 3, 'half-yearly': 6, yearly: 12,
};

const schema = z.object({
  principal: z.coerce.number().positive('Required'),
  rate: z.coerce.number().positive('Required'),
  tenureValue: z.coerce.number().positive('Required'),
  tenureUnit: z.enum(['months', 'years']),
  frequency: z.string(),
  interestMethod: z.enum(['reducing', 'simple']),
  gracePeriod: z.coerce.number().min(0).default(0),
  graceType: z.enum(['in-period', 'ex-period']),
  disbursementDate: z.string().min(1, 'Required'),
});

type FormData = z.infer<typeof schema>;

interface ScheduleRow {
  period: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

/** Get the installment date for a given period offset from disbursement */
function getInstallmentDate(disbursement: Date, periodOffset: number, frequency: string, isLastDayDisbursement: boolean): Date {
  if (frequency === 'weekly') {
    return addWeeks(disbursement, periodOffset);
  }
  const monthsToAdd = periodOffset * (FREQUENCY_MONTHS[frequency] || 1);
  const target = addMonths(disbursement, monthsToAdd);
  if (isLastDayDisbursement) {
    return lastDayOfMonth(target);
  }
  // Clamp day to last day of target month (e.g. Jan 31 → Feb 28)
  const lastDay = lastDayOfMonth(target);
  if (target > lastDay) return lastDay;
  return target;
}

const EMICalculator = () => {
  const { data: settings } = useAppSettings();
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [summary, setSummary] = useState<{ emi: number; totalPayment: number; totalInterest: number } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      principal: 100000, rate: 10, tenureValue: 12, tenureUnit: 'months',
      frequency: 'monthly', interestMethod: 'reducing', gracePeriod: 0, graceType: 'in-period',
      disbursementDate: today,
    },
  });

  const calculate = (data: FormData) => {
    const { principal, rate, tenureValue, tenureUnit, frequency, interestMethod, gracePeriod, graceType, disbursementDate } = data;
    const totalMonths = tenureUnit === 'years' ? tenureValue * 12 : tenureValue;
    const periodsPerYear = FREQUENCIES[frequency] || 12;
    const totalPeriods = Math.round(totalMonths * periodsPerYear / 12);
    const periodicRate = rate / 100 / periodsPerYear;

    const effectivePeriods = graceType === 'in-period' ? totalPeriods : totalPeriods + gracePeriod;
    const paymentPeriods = graceType === 'in-period' ? totalPeriods - gracePeriod : totalPeriods;

    // Round up to next 10 (দশক)
    const rounding = 10;

    let emi: number;
    if (interestMethod === 'reducing') {
      if (periodicRate === 0) {
        emi = principal / paymentPeriods;
      } else {
        emi = (principal * periodicRate * Math.pow(1 + periodicRate, paymentPeriods)) /
          (Math.pow(1 + periodicRate, paymentPeriods) - 1);
      }
    } else {
      const totalInterest = principal * (rate / 100) * (totalMonths / 12);
      emi = (principal + totalInterest) / paymentPeriods;
    }

    emi = Math.ceil(emi / rounding) * rounding;

    // Date logic
    const disbursement = new Date(disbursementDate + 'T00:00:00');
    const disbDay = getDate(disbursement);
    const lastDayOfDisbMonth = getDate(lastDayOfMonth(disbursement));
    const isLastDayDisbursement = disbDay === lastDayOfDisbMonth;

    const rows: ScheduleRow[] = [];
    let balance = principal;
    let totalPayment = 0;
    let totalInterest = 0;

    for (let i = 1; i <= effectivePeriods; i++) {
      const isGrace = i <= gracePeriod;
      const interest = interestMethod === 'reducing'
        ? balance * periodicRate
        : (principal * (rate / 100)) / periodsPerYear;

      let payment: number;
      let principalPart: number;

      if (isGrace) {
        payment = graceType === 'in-period' ? interest : 0;
        principalPart = 0;
        if (graceType === 'ex-period') balance += interest;
      } else {
        payment = Math.min(emi, balance + interest);
        principalPart = payment - interest;
        balance = Math.max(0, balance - principalPart);
      }

      totalPayment += payment;
      totalInterest += interest;

      const installmentDate = getInstallmentDate(disbursement, i, frequency, isLastDayDisbursement);

      rows.push({
        period: i,
        date: format(installmentDate, 'dd-MM-yyyy'),
        payment: Math.round(payment * 100) / 100,
        principal: Math.round(principalPart * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        balance: Math.round(balance * 100) / 100,
      });
    }

    setSchedule(rows);
    setSummary({ emi, totalPayment, totalInterest });
  };

  const chartData = schedule.map(r => ({ period: r.period, balance: r.balance }));
  const pieData = summary ? [
    { name: 'Principal', value: Math.round(form.getValues('principal')) },
    { name: 'Interest', value: Math.round(summary.totalInterest) },
  ] : [];

  const exportPDF = () => {
    if (!schedule.length || !summary) return;
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('EMI Amortization Schedule', 14, 15);
    doc.setFontSize(9);
    doc.text(`Principal: ৳${form.getValues('principal').toLocaleString()} | Rate: ${form.getValues('rate')}% | EMI: ৳${summary.emi.toFixed(2)}`, 14, 23);
    doc.text(`Disbursement: ${form.getValues('disbursementDate')} | Total Payment: ৳${summary.totalPayment.toFixed(2)} | Total Interest: ৳${summary.totalInterest.toFixed(2)}`, 14, 29);

    let y = 38;
    const cols = ['#', 'Date', 'Payment', 'Principal', 'Interest', 'Balance'];
    const cw = [10, 24, 28, 28, 28, 28];
    doc.setFont('helvetica', 'bold');
    cols.forEach((c, i) => doc.text(c, 14 + cw.slice(0, i).reduce((a, b) => a + b, 0), y));
    y += 5;
    doc.setFont('helvetica', 'normal');
    schedule.forEach(r => {
      if (y > 280) { doc.addPage(); y = 15; }
      const vals = [String(r.period), r.date, r.payment.toFixed(2), r.principal.toFixed(2), r.interest.toFixed(2), r.balance.toFixed(2)];
      vals.forEach((v, i) => doc.text(v, 14 + cw.slice(0, i).reduce((a, b) => a + b, 0), y));
      y += 4.5;
    });
    doc.save('emi_schedule.pdf');
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground no-print">EMI Calculator</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 card-shadow no-print">
          <CardHeader><CardTitle className="font-heading text-lg">Loan Parameters</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(calculate)} className="space-y-3">
              <div className="space-y-1.5"><Label className="text-xs">Principal Amount (৳)</Label>
                <Input type="number" step="any" {...form.register('principal')} className="h-9" />
                {form.formState.errors.principal && <p className="text-xs text-destructive">{form.formState.errors.principal.message}</p>}
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
              <div className="space-y-1.5"><Label className="text-xs">Disbursement Date</Label>
                <Input type="date" {...form.register('disbursementDate')} className="h-9" />
                {form.formState.errors.disbursementDate && <p className="text-xs text-destructive">{form.formState.errors.disbursementDate.message}</p>}
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Installment Frequency</Label>
                <Select value={form.watch('frequency')} onValueChange={v => form.setValue('frequency', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(FREQUENCIES).map(f => <SelectItem key={f} value={f} className="capitalize">{f.replace('-', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Interest Method</Label>
                <Select value={form.watch('interestMethod')} onValueChange={v => form.setValue('interestMethod', v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="reducing">Reducing Balance</SelectItem><SelectItem value="simple">Simple Interest</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label className="text-xs">Grace Period</Label>
                  <Input type="number" min={0} {...form.register('gracePeriod')} className="h-9" />
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Grace Type</Label>
                  <Select value={form.watch('graceType')} onValueChange={v => form.setValue('graceType', v as any)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="in-period">In-Period</SelectItem><SelectItem value="ex-period">Ex-Period</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">Calculate EMI</Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6 print-area" ref={printRef}>
          {summary && (
            <>
              {/* Print-only header with loan parameters */}
              <div className="print-only hidden">
                <h2 className="text-xl font-bold mb-2">EMI Amortization Schedule</h2>
                <div className="text-sm mb-4 space-y-1">
                  <p><strong>Principal:</strong> ৳{form.getValues('principal').toLocaleString()} | <strong>Rate:</strong> {form.getValues('rate')}% | <strong>Tenure:</strong> {form.getValues('tenureValue')} {form.getValues('tenureUnit')}</p>
                  <p><strong>Disbursement:</strong> {form.getValues('disbursementDate')} | <strong>Method:</strong> {form.getValues('interestMethod')} | <strong>Frequency:</strong> {form.getValues('frequency')}</p>
                  {form.getValues('gracePeriod') > 0 && <p><strong>Grace Period:</strong> {form.getValues('gracePeriod')} ({form.getValues('graceType')})</p>}
                  <p><strong>EMI:</strong> ৳{summary.emi.toFixed(2)} | <strong>Total Interest:</strong> ৳{summary.totalInterest.toFixed(2)} | <strong>Total Payment:</strong> ৳{summary.totalPayment.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/20"><CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">Installment (EMI)</p>
                  <p className="text-2xl font-bold text-primary">৳{summary.emi.toFixed(2)}</p>
                </CardContent></Card>
                <Card className="bg-accent/10 border-accent/20"><CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">Total Interest</p>
                  <p className="text-2xl font-bold text-accent-foreground">৳{summary.totalInterest.toFixed(2)}</p>
                </CardContent></Card>
                <Card className="border"><CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">Total Payment</p>
                  <p className="text-2xl font-bold text-foreground">৳{summary.totalPayment.toFixed(2)}</p>
                </CardContent></Card>
              </div>

              <div className="flex gap-2 justify-end no-print">
                <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1"><Download className="h-3 w-3" /> PDF</Button>
                <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1"><Printer className="h-3 w-3" /> Print</Button>
              </div>

              <Tabs defaultValue="schedule">
                <TabsList><TabsTrigger value="schedule">Schedule</TabsTrigger><TabsTrigger value="charts">Charts</TabsTrigger></TabsList>
                <TabsContent value="schedule">
                  <Card><div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>#</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Payment</TableHead>
                        <TableHead className="text-right">Principal</TableHead><TableHead className="text-right">Interest</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {schedule.map(r => (
                          <TableRow key={r.period}>
                            <TableCell>{r.period}</TableCell>
                            <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                            <TableCell className="text-right">৳{r.payment.toLocaleString()}</TableCell>
                            <TableCell className="text-right">৳{r.principal.toLocaleString()}</TableCell>
                            <TableCell className="text-right">৳{r.interest.toLocaleString()}</TableCell>
                            <TableCell className="text-right">৳{r.balance.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div></Card>
                </TabsContent>
                <TabsContent value="charts">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card><CardContent className="p-4">
                      <p className="text-sm font-medium mb-2 text-center">Principal vs Interest</p>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                          </Pie><Tooltip formatter={(v: number) => `৳${v.toLocaleString()}`} /></PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 text-xs">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Principal</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-accent" /> Interest</span>
                        </div>
                      </div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                      <p className="text-sm font-medium mb-2 text-center">Balance Reduction</p>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(v: number) => `৳${v.toLocaleString()}`} />
                            <Line type="monotone" dataKey="balance" stroke="hsl(215,70%,22%)" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent></Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EMICalculator;
