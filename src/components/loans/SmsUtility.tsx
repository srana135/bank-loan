import { useState, useMemo } from 'react';
import { Loan } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Copy, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  loans: Loan[];
}

const SmsUtility = ({ loans }: Props) => {
  const [message, setMessage] = useState('');

  const numbers = useMemo(() => {
    const set = new Set<string>();
    loans.forEach(l => {
      if (l.mobile?.trim()) {
        const clean = l.mobile.trim().replace(/[^0-9+]/g, '');
        if (clean.length >= 10) set.add(clean);
      }
    });
    return Array.from(set);
  }, [loans]);

  const copyAll = () => {
    if (numbers.length === 0) { toast.error('No numbers to copy'); return; }
    navigator.clipboard.writeText(numbers.join(', ')).then(() => toast.success('Numbers copied to clipboard'));
  };

  const openSmsLinks = () => {
    if (!message.trim()) { toast.error('Please enter a message first'); return; }
    if (numbers.length === 0) { toast.error('No numbers available'); return; }
    // Open SMS for first number (browsers limit multi-window opens)
    const encoded = encodeURIComponent(message.trim());
    numbers.slice(0, 10).forEach((num, i) => {
      setTimeout(() => {
        window.open(`sms:${num}?body=${encoded}`, '_blank');
      }, i * 300);
    });
    if (numbers.length > 10) {
      toast.info(`Opened SMS for first 10 numbers. ${numbers.length - 10} remaining — copy numbers for batch SMS.`);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" /> SMS Utility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{numbers.length} valid numbers</Badge>
          <Button variant="outline" size="sm" onClick={copyAll} className="gap-1" disabled={numbers.length === 0}>
            <Copy className="h-3 w-3" /> Copy All
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Message</Label>
          <Textarea
            placeholder="Enter your SMS message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="min-h-[60px] text-sm"
          />
        </div>
        <Button
          onClick={openSmsLinks}
          disabled={numbers.length === 0 || !message.trim()}
          className="w-full gap-2"
          size="sm"
        >
          <Phone className="h-4 w-4" /> Send SMS ({numbers.length})
        </Button>
        {numbers.length > 0 && (
          <div className="max-h-[120px] overflow-y-auto text-xs text-muted-foreground space-y-0.5 border rounded p-2">
            {numbers.map(n => (
              <a key={n} href={`tel:${n}`} className="block hover:text-primary">{n}</a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SmsUtility;
