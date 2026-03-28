import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft, Loader2, RefreshCw } from 'lucide-react';

const CURRENCIES = ['USD', 'SAR', 'AED', 'EUR', 'GBP', 'KWD', 'OMR', 'QAR', 'MYR', 'SGD'];

const schema = z.object({
  amount: z.coerce.number().positive('Enter a valid amount'),
});

const CurrencyConverter = () => {
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('BDT');
  const [result, setResult] = useState<number | null>(null);

  const { data: rates, isLoading: ratesLoading, error: ratesError, refetch } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      // Using exchangerate-api.com free endpoint
      const res = await fetch('https://open.er-api.com/v6/latest/BDT');
      if (!res.ok) throw new Error('Failed to fetch rates');
      const data = await res.json();
      return { rates: data.rates as Record<string, number>, timestamp: data.time_last_update_utc as string };
    },
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: 1 },
  });

  const convert = (data: z.infer<typeof schema>) => {
    if (!rates?.rates) return;
    // rates are relative to BDT
    const fromRate = rates.rates[from] || 1;
    const toRate = rates.rates[to] || 1;
    // Convert: amount in FROM -> BDT -> TO
    const inBDT = data.amount / fromRate;
    setResult(inBDT * toRate);
  };

  const swap = () => { setFrom(to); setTo(from); setResult(null); };

  const allCurrencies = ['BDT', ...CURRENCIES];

  return (
    <div className="container py-6">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground mb-6">Currency Converter</h1>
      <Card className="max-w-lg mx-auto card-shadow">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center justify-between">
            Convert Currency
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={ratesLoading}>
              <RefreshCw className={`h-4 w-4 ${ratesLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ratesError && (
            <div className="p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              Failed to load exchange rates. Please try again.
            </div>
          )}
          {ratesLoading && (
            <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading rates...
            </div>
          )}
          <form onSubmit={form.handleSubmit(convert)} className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" step="any" {...form.register('amount')} />
              {form.formState.errors.amount && <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>}
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div className="space-y-2">
                <Label>From</Label>
                <Select value={from} onValueChange={v => { setFrom(v); setResult(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{allCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={swap} className="mb-0.5">
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
              <div className="space-y-2">
                <Label>To</Label>
                <Select value={to} onValueChange={v => { setTo(v); setResult(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{allCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={ratesLoading || !!ratesError}>Convert</Button>
          </form>
          {result !== null && (
            <div className="mt-6 text-center p-4 rounded-lg bg-primary/5">
              <p className="text-sm text-muted-foreground">Converted Amount</p>
              <p className="text-2xl font-bold text-primary">{to} {result.toFixed(4)}</p>
              {rates?.rates && (
                <p className="text-xs text-muted-foreground mt-1">
                  1 {from} = {(rates.rates[to === 'BDT' ? 'BDT' : to]! / rates.rates[from === 'BDT' ? 'BDT' : from]!).toFixed(4)} {to}
                </p>
              )}
            </div>
          )}
          {rates?.timestamp && (
            <p className="text-xs text-muted-foreground mt-4 text-center">Last updated: {rates.timestamp}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CurrencyConverter;
