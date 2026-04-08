import { useMemo } from 'react';
import { Loan } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock } from 'lucide-react';

interface Props {
  loans: Loan[];
}

const AGING_BUCKETS = [
  { label: '0-30 দিন', min: 0, max: 30, color: 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400' },
  { label: '31-60 দিন', min: 31, max: 60, color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400' },
  { label: '61-90 দিন', min: 61, max: 90, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400' },
  { label: '91-180 দিন', min: 91, max: 180, color: 'bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400' },
  { label: '181-365 দিন', min: 181, max: 365, color: 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400' },
  { label: '365+ দিন', min: 366, max: Infinity, color: 'bg-destructive/10 text-destructive' },
];

function getOverdueDays(loan: Loan): number {
  if (!loan.disbursement_date || loan.overdue_installment_number <= 0) return 0;
  // Approximate: overdue_installment_number * 30 days
  return loan.overdue_installment_number * 30;
}

const LoanAgingAnalysis = ({ loans }: Props) => {
  const analysis = useMemo(() => {
    const buckets = AGING_BUCKETS.map(b => ({
      ...b,
      count: 0,
      outstanding: 0,
      overdue: 0,
    }));

    const overdueLoans = loans.filter(l => l.overdue_amount > 0 || l.overdue_installment_number > 0);

    overdueLoans.forEach(loan => {
      const days = getOverdueDays(loan);
      const bucket = buckets.find(b => days >= b.min && days <= b.max);
      if (bucket) {
        bucket.count++;
        bucket.outstanding += loan.outstanding_amount || 0;
        bucket.overdue += loan.overdue_amount || 0;
      }
    });

    const totalOverdue = overdueLoans.length;
    const totalOverdueAmt = overdueLoans.reduce((s, l) => s + (l.overdue_amount || 0), 0);
    const totalOutstanding = overdueLoans.reduce((s, l) => s + (l.outstanding_amount || 0), 0);

    return { buckets, totalOverdue, totalOverdueAmt, totalOutstanding };
  }, [loans]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        Loan Aging Analysis
        <Badge variant="outline" className="text-[10px]">{analysis.totalOverdue} overdue</Badge>
      </h3>

      {/* Summary cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {analysis.buckets.map(b => (
          <Card key={b.label} className="border">
            <CardContent className="p-2.5 text-center">
              <Badge className={`text-[9px] h-4 mb-1 ${b.color} border-0`}>{b.label}</Badge>
              <p className="text-lg font-bold text-foreground">{b.count}</p>
              <p className="text-[9px] text-muted-foreground">৳{b.overdue.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Aging Bucket</TableHead>
              <TableHead className="text-xs text-center">Accounts</TableHead>
              <TableHead className="text-xs text-right">Overdue</TableHead>
              <TableHead className="text-xs text-right">Outstanding</TableHead>
              <TableHead className="text-xs text-right">% Share</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analysis.buckets.map(b => (
              <TableRow key={b.label}>
                <TableCell className="text-xs"><Badge className={`text-[9px] ${b.color} border-0`}>{b.label}</Badge></TableCell>
                <TableCell className="text-xs text-center font-medium">{b.count}</TableCell>
                <TableCell className="text-xs text-right">৳{b.overdue.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right">৳{b.outstanding.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right">
                  {analysis.totalOverdue > 0 ? ((b.count / analysis.totalOverdue) * 100).toFixed(1) : '0'}%
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/30">
              <TableCell className="text-xs">Total</TableCell>
              <TableCell className="text-xs text-center">{analysis.totalOverdue}</TableCell>
              <TableCell className="text-xs text-right">৳{analysis.totalOverdueAmt.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right">৳{analysis.totalOutstanding.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right">100%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LoanAgingAnalysis;
