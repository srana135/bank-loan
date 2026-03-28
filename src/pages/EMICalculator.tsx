import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const emiSchema = z.object({
  principal: z.coerce.number().positive('Enter a valid amount'),
  rate: z.coerce.number().positive('Enter a valid rate'),
  tenure: z.coerce.number().int().positive('Enter valid tenure in months'),
});

type EMIResult = {
  emi: number;
  totalPayment: number;
  totalInterest: number;
};

const COLORS = ['hsl(215,70%,22%)', 'hsl(42,85%,52%)'];

const EMICalculator = () => {
  const [result, setResult] = useState<EMIResult | null>(null);

  const form = useForm<z.infer<typeof emiSchema>>({
    resolver: zodResolver(emiSchema),
    defaultValues: { principal: 0, rate: 0, tenure: 0 },
  });

  const calculate = (data: z.infer<typeof emiSchema>) => {
    const { principal, rate, tenure } = data;
    const monthlyRate = rate / 12 / 100;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1);
    const totalPayment = emi * tenure;
    const totalInterest = totalPayment - principal;
    setResult({ emi, totalPayment, totalInterest });
  };

  const chartData = result ? [
    { name: 'Principal', value: Math.round(form.getValues('principal')) },
    { name: 'Interest', value: Math.round(result.totalInterest) },
  ] : [];

  return (
    <div className="container py-8">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-8">EMI Calculator</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="font-heading">Calculate Your EMI</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(calculate)} className="space-y-4">
              <div className="space-y-2">
                <Label>Loan Amount (৳)</Label>
                <Input type="number" step="any" {...form.register('principal')} />
                {form.formState.errors.principal && <p className="text-sm text-destructive">{form.formState.errors.principal.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Annual Interest Rate (%)</Label>
                <Input type="number" step="any" {...form.register('rate')} />
                {form.formState.errors.rate && <p className="text-sm text-destructive">{form.formState.errors.rate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Tenure (Months)</Label>
                <Input type="number" {...form.register('tenure')} />
                {form.formState.errors.tenure && <p className="text-sm text-destructive">{form.formState.errors.tenure.message}</p>}
              </div>
              <Button type="submit" className="w-full">Calculate EMI</Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="font-heading">EMI Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-primary/5">
                    <p className="text-sm text-muted-foreground">Monthly EMI</p>
                    <p className="text-2xl font-bold text-primary">৳{result.emi.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-accent/10">
                    <p className="text-sm text-muted-foreground">Total Interest</p>
                    <p className="text-2xl font-bold text-accent">৳{result.totalInterest.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Total Payment</p>
                    <p className="text-2xl font-bold text-foreground">৳{result.totalPayment.toFixed(2)}</p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => `৳${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 text-sm">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary inline-block" /> Principal</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-accent inline-block" /> Interest</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EMICalculator;
