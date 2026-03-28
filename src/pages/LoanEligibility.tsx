import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';

const schema = z.object({
  monthlyIncome: z.coerce.number().positive('Enter valid income'),
  existingEMI: z.coerce.number().min(0, 'Cannot be negative'),
  rate: z.coerce.number().positive('Enter valid rate'),
  tenureMonths: z.coerce.number().int().positive('Enter valid tenure'),
});

const LoanEligibility = () => {
  const [result, setResult] = useState<{ eligible: boolean; maxLoan: number; maxEMI: number } | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { monthlyIncome: 0, existingEMI: 0, rate: 0, tenureMonths: 0 },
  });

  const calculate = (data: z.infer<typeof schema>) => {
    const { monthlyIncome, existingEMI, rate, tenureMonths } = data;
    const maxEMI = monthlyIncome * 0.5 - existingEMI;
    const monthlyRate = rate / 12 / 100;
    const maxLoan = maxEMI > 0
      ? (maxEMI * (Math.pow(1 + monthlyRate, tenureMonths) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, tenureMonths))
      : 0;
    setResult({ eligible: maxLoan > 0, maxLoan, maxEMI: Math.max(0, maxEMI) });
  };

  return (
    <div className="container py-8">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-8">Loan Eligibility</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="card-shadow">
          <CardHeader><CardTitle className="font-heading">Check Your Eligibility</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(calculate)} className="space-y-4">
              <div className="space-y-2">
                <Label>Monthly Income (৳)</Label>
                <Input type="number" step="any" {...form.register('monthlyIncome')} />
                {form.formState.errors.monthlyIncome && <p className="text-sm text-destructive">{form.formState.errors.monthlyIncome.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Existing Monthly EMI (৳)</Label>
                <Input type="number" step="any" {...form.register('existingEMI')} />
                {form.formState.errors.existingEMI && <p className="text-sm text-destructive">{form.formState.errors.existingEMI.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Expected Interest Rate (%)</Label>
                <Input type="number" step="any" {...form.register('rate')} />
                {form.formState.errors.rate && <p className="text-sm text-destructive">{form.formState.errors.rate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Desired Tenure (Months)</Label>
                <Input type="number" {...form.register('tenureMonths')} />
                {form.formState.errors.tenureMonths && <p className="text-sm text-destructive">{form.formState.errors.tenureMonths.message}</p>}
              </div>
              <Button type="submit" className="w-full">Check Eligibility</Button>
            </form>
          </CardContent>
        </Card>
        {result && (
          <Card className="card-shadow">
            <CardHeader><CardTitle className="font-heading">Eligibility Result</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                {result.eligible ? <CheckCircle className="h-8 w-8 text-success" /> : <XCircle className="h-8 w-8 text-destructive" />}
                <div>
                  <p className="font-semibold text-foreground">{result.eligible ? 'You are eligible!' : 'Not eligible'}</p>
                  <p className="text-sm text-muted-foreground">{result.eligible ? 'Based on your income and existing obligations' : 'Your existing EMI exceeds 50% of income'}</p>
                </div>
              </div>
              {result.eligible && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-lg bg-primary/5">
                    <p className="text-sm text-muted-foreground">Max Loan Amount</p>
                    <p className="text-xl font-bold text-primary">৳{result.maxLoan.toFixed(0)}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-accent/10">
                    <p className="text-sm text-muted-foreground">Affordable EMI</p>
                    <p className="text-xl font-bold text-accent">৳{result.maxEMI.toFixed(0)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LoanEligibility;
