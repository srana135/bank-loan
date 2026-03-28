import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft } from 'lucide-react';

const rates: Record<string, number> = {
  BDT: 1,
  USD: 0.0091,
  EUR: 0.0084,
  GBP: 0.0072,
  INR: 0.76,
  JPY: 1.37,
  SAR: 0.034,
  AED: 0.033,
  MYR: 0.043,
  SGD: 0.012,
};

const schema = z.object({
  amount: z.coerce.number().positive('Enter a valid amount'),
});

const CurrencyConverter = () => {
  const [from, setFrom] = useState('BDT');
  const [to, setTo] = useState('USD');
  const [result, setResult] = useState<number | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 0 },
  });

  const convert = (data: z.infer<typeof schema>) => {
    const inBDT = data.amount / rates[from];
    setResult(inBDT * rates[to]);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setResult(null);
  };

  const currencies = Object.keys(rates);

  return (
    <div className="container py-8">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-8">Currency Converter</h1>
      <Card className="max-w-lg mx-auto card-shadow">
        <CardHeader><CardTitle className="font-heading">Convert Currency</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(convert)} className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" step="any" {...form.register('amount')} />
              {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div className="space-y-2">
                <Label>From</Label>
                <Select value={from} onValueChange={setFrom}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={swap} className="mb-0.5">
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
              <div className="space-y-2">
                <Label>To</Label>
                <Select value={to} onValueChange={setTo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full">Convert</Button>
          </form>
          {result !== null && (
            <div className="mt-6 text-center p-4 rounded-lg bg-primary/5">
              <p className="text-sm text-muted-foreground">Converted Amount</p>
              <p className="text-2xl font-bold text-primary">{to} {result.toFixed(2)}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4 text-center">Rates are approximate and for reference only.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CurrencyConverter;
