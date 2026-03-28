import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  principal: z.coerce.number().positive('Enter a valid amount'),
  rate: z.coerce.number().positive('Enter a valid rate'),
  tenureMonths: z.coerce.number().int().positive('Enter valid tenure'),
});

const FDRCalculator = () => {
  const [result, setResult] = useState<{ maturity: number; interest: number } | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { principal: 0, rate: 0, tenureMonths: 0 },
  });

  const calculate = (data: z.infer<typeof schema>) => {
    const { principal, rate, tenureMonths } = data;
    const years = tenureMonths / 12;
    const maturity = principal * Math.pow(1 + rate / 100, years);
    setResult({ maturity, interest: maturity - principal });
  };

  return (
    <div className="container py-8">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-8">FDR Calculator</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="card-shadow">
          <CardHeader><CardTitle className="font-heading">Fixed Deposit Receipt</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(calculate)} className="space-y-4">
              <div className="space-y-2">
                <Label>Deposit Amount (৳)</Label>
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
                <Input type="number" {...form.register('tenureMonths')} />
                {form.formState.errors.tenureMonths && <p className="text-sm text-destructive">{form.formState.errors.tenureMonths.message}</p>}
              </div>
              <Button type="submit" className="w-full">Calculate</Button>
            </form>
          </CardContent>
        </Card>
        {result && (
          <Card className="card-shadow">
            <CardHeader><CardTitle className="font-heading">FDR Result</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-accent/10">
                  <p className="text-sm text-muted-foreground">Interest Earned</p>
                  <p className="text-xl font-bold text-accent">৳{result.interest.toFixed(2)}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-primary/5">
                  <p className="text-sm text-muted-foreground">Maturity Value</p>
                  <p className="text-xl font-bold text-primary">৳{result.maturity.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FDRCalculator;
