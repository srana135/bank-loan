import { Loan } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

interface Props {
  loans: Loan[];
  selectedClassifications: string[];
}

const CLASSIFICATIONS = ['STD', 'SMA', 'SS', 'DF', 'BL'];

const classStyles: Record<string, string> = {
  STD: 'border-primary/20 bg-primary/5',
  SMA: 'border-blue-300 bg-blue-50 dark:bg-blue-950/20',
  SS: 'border-orange-300 bg-orange-50 dark:bg-orange-950/20',
  DF: 'border-purple-300 bg-purple-50 dark:bg-purple-950/20',
  BL: 'border-destructive/30 bg-destructive/5',
};

const classBadgeVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  STD: 'default', SMA: 'secondary', SS: 'secondary', DF: 'destructive', BL: 'destructive',
};

const LoanSummary = ({ loans, selectedClassifications }: Props) => {
  const stats = useMemo(() => {
    const byClass: Record<string, { count: number; outstanding: number }> = {};
    CLASSIFICATIONS.forEach(c => { byClass[c] = { count: 0, outstanding: 0 }; });
    let totalCount = 0;
    let totalOutstanding = 0;

    loans.forEach(l => {
      const cls = l.classification || 'STD';
      if (!byClass[cls]) byClass[cls] = { count: 0, outstanding: 0 };
      byClass[cls].count++;
      byClass[cls].outstanding += l.outstanding_amount || 0;
      totalCount++;
      totalOutstanding += l.outstanding_amount || 0;
    });

    let selectedCount = 0;
    let selectedOutstanding = 0;
    if (selectedClassifications.length > 0) {
      selectedClassifications.forEach(cls => {
        selectedCount += byClass[cls]?.count || 0;
        selectedOutstanding += byClass[cls]?.outstanding || 0;
      });
    }

    return { byClass, totalCount, totalOutstanding, selectedCount, selectedOutstanding };
  }, [loans, selectedClassifications]);

  return (
    <div className="space-y-3">
      {/* Grand totals + per-classification */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <Card className="border-2 border-primary/30">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Accounts</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalCount}</p>
            <p className="text-[10px] text-muted-foreground">filtered</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-primary/30">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Outstanding</p>
            <p className="text-base font-bold text-foreground">৳{stats.totalOutstanding.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">filtered</p>
          </CardContent>
        </Card>
        {CLASSIFICATIONS.map(cls => (
          <Card key={cls} className={`border ${classStyles[cls]}`}>
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Badge variant={classBadgeVariants[cls]} className="text-[10px] h-4 px-1.5">{cls}</Badge>
              </div>
              <p className="text-lg font-bold text-foreground">{stats.byClass[cls]?.count || 0}</p>
              <p className="text-[10px] text-muted-foreground">৳{(stats.byClass[cls]?.outstanding || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected classification summary */}
      {selectedClassifications.length > 0 && (
        <Card className="border border-accent/40 bg-accent/5">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-accent-foreground mb-2">Selected Classification Summary</p>
            <div className="flex flex-wrap gap-4 items-center">
              {selectedClassifications.map(cls => (
                <div key={cls} className="text-sm">
                  <Badge variant={classBadgeVariants[cls]} className="text-[10px] h-4 mr-1">{cls}</Badge>
                  <span className="font-medium">{stats.byClass[cls]?.count || 0}</span>
                  <span className="text-muted-foreground ml-1">(৳{(stats.byClass[cls]?.outstanding || 0).toLocaleString()})</span>
                </div>
              ))}
              <div className="text-sm font-bold border-l pl-3 border-accent/30">
                Combined: {stats.selectedCount} accounts — ৳{stats.selectedOutstanding.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LoanSummary;
