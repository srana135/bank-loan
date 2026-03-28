import { Loan } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { useMemo } from 'react';

interface Props {
  loans: Loan[];
  selectedClassifications: string[];
}

const CLASSIFICATIONS = ['STD', 'SMA', 'SS', 'DF', 'BL'];

const classColors: Record<string, string> = {
  STD: 'bg-primary/10 text-primary border-primary/20',
  SMA: 'bg-accent/10 text-accent-foreground border-accent/20',
  SS: 'bg-orange-100 text-orange-800 border-orange-200',
  DF: 'bg-destructive/10 text-destructive border-destructive/20',
  BL: 'bg-destructive/20 text-destructive border-destructive/30',
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

    // Selected classification summary
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
      {/* Grand totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="border-2 border-primary/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Accounts</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalCount}</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-primary/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Outstanding</p>
            <p className="text-lg font-bold text-foreground">৳{stats.totalOutstanding.toLocaleString()}</p>
          </CardContent>
        </Card>
        {CLASSIFICATIONS.map(cls => (
          <Card key={cls} className={`border ${classColors[cls]}`}>
            <CardContent className="p-3 text-center">
              <p className="text-xs font-medium">{cls}</p>
              <p className="text-lg font-bold">{stats.byClass[cls]?.count || 0}</p>
              <p className="text-xs">৳{(stats.byClass[cls]?.outstanding || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected classification summary */}
      {selectedClassifications.length > 0 && (
        <Card className="border border-accent/40 bg-accent/5">
          <CardContent className="p-3">
            <p className="text-xs font-medium text-accent-foreground mb-2">Selected Classification Summary</p>
            <div className="flex flex-wrap gap-4 items-center">
              {selectedClassifications.map(cls => (
                <div key={cls} className="text-sm">
                  <span className="font-semibold">{cls}:</span>{' '}
                  <span>{stats.byClass[cls]?.count || 0} accounts</span>{' '}
                  <span className="text-muted-foreground">(৳{(stats.byClass[cls]?.outstanding || 0).toLocaleString()})</span>
                </div>
              ))}
              <div className="text-sm font-bold border-l pl-4 border-accent/30">
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
