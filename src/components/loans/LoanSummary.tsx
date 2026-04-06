import { Loan } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';
import { Calendar, CalendarDays } from 'lucide-react';

interface Props {
  loans: Loan[];
  selectedClassifications: string[];
  onClassificationClick?: (cls: string) => void;
  onProposedDateFilter?: (filter: '' | 'today' | '7days') => void;
  activeProposedDateFilter?: string;
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

const LoanSummary = ({ loans, selectedClassifications, onClassificationClick, onProposedDateFilter, activeProposedDateFilter }: Props) => {
  const stats = useMemo(() => {
    const byClass: Record<string, { count: number; outstanding: number }> = {};
    CLASSIFICATIONS.forEach(c => { byClass[c] = { count: 0, outstanding: 0 }; });
    let totalCount = 0;
    let totalOutstanding = 0;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const end7 = new Date(now.getTime() + 7 * 86400000);
    const in7Days = `${end7.getFullYear()}-${pad(end7.getMonth() + 1)}-${pad(end7.getDate())}`;
    let proposedToday = 0;
    let proposed7Days = 0;

    loans.forEach(l => {
      const cls = l.classification || 'STD';
      if (!byClass[cls]) byClass[cls] = { count: 0, outstanding: 0 };
      byClass[cls].count++;
      byClass[cls].outstanding += l.outstanding_amount || 0;
      totalCount++;
      totalOutstanding += l.outstanding_amount || 0;

      if (l.latest_proposed_date) {
        if (l.latest_proposed_date === todayStr) proposedToday++;
        if (l.latest_proposed_date >= todayStr && l.latest_proposed_date <= in7Days) proposed7Days++;
      }
    });

    let selectedCount = 0;
    let selectedOutstanding = 0;
    if (selectedClassifications.length > 0) {
      selectedClassifications.forEach(cls => {
        selectedCount += byClass[cls]?.count || 0;
        selectedOutstanding += byClass[cls]?.outstanding || 0;
      });
    }

    return { byClass, totalCount, totalOutstanding, selectedCount, selectedOutstanding, proposedToday, proposed7Days };
  }, [loans, selectedClassifications]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2">
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
          <Card key={cls} className={`border ${classStyles[cls]} ${onClassificationClick ? 'cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all' : ''} ${selectedClassifications.includes(cls) ? 'ring-2 ring-primary' : ''}`}
            onClick={() => onClassificationClick?.(cls)}>
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Badge variant={classBadgeVariants[cls]} className="text-[10px] h-4 px-1.5">{cls}</Badge>
              </div>
              <p className="text-lg font-bold text-foreground">{stats.byClass[cls]?.count || 0}</p>
              <p className="text-[10px] text-muted-foreground">৳{(stats.byClass[cls]?.outstanding || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}

        {/* Proposed Repayment Date feeds */}
        <Card
          className={`border border-green-300 bg-green-50 dark:bg-green-950/20 cursor-pointer hover:ring-2 hover:ring-green-400/30 transition-all ${activeProposedDateFilter === 'today' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => onProposedDateFilter?.(activeProposedDateFilter === 'today' ? '' : 'today')}
        >
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Calendar className="h-3 w-3 text-green-600" />
              <span className="text-[10px] text-green-700 dark:text-green-400 uppercase font-medium">Today</span>
            </div>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">{stats.proposedToday}</p>
            <p className="text-[10px] text-muted-foreground">repayment</p>
          </CardContent>
        </Card>
        <Card
          className={`border border-amber-300 bg-amber-50 dark:bg-amber-950/20 cursor-pointer hover:ring-2 hover:ring-amber-400/30 transition-all ${activeProposedDateFilter === '7days' ? 'ring-2 ring-amber-500' : ''}`}
          onClick={() => onProposedDateFilter?.(activeProposedDateFilter === '7days' ? '' : '7days')}
        >
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <CalendarDays className="h-3 w-3 text-amber-600" />
              <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-medium">7 Days</span>
            </div>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{stats.proposed7Days}</p>
            <p className="text-[10px] text-muted-foreground">repayment</p>
          </CardContent>
        </Card>
      </div>

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
