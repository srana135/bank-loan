import { useMemo } from 'react';
import { useLoanComments } from '@/hooks/useLoans';
import { useLoanRecoveries } from '@/hooks/useRecoveries';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Banknote, Calendar, Clock } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface Props { loanId: string; createdAt?: string; }

interface TimelineEvent {
  id: string;
  type: 'comment' | 'recovery' | 'created';
  date: string;
  title: string;
  description: string;
  meta?: string;
}

const LoanTimeline = ({ loanId, createdAt }: Props) => {
  const { data: comments, isLoading: commentsLoading } = useLoanComments(loanId);
  const { data: recoveries, isLoading: recoveriesLoading } = useLoanRecoveries(loanId);

  const events = useMemo(() => {
    const items: TimelineEvent[] = [];

    if (createdAt) {
      items.push({
        id: 'created',
        type: 'created',
        date: createdAt,
        title: 'Loan Created',
        description: 'Loan account was created in the system',
      });
    }

    comments?.forEach(c => {
      items.push({
        id: `c-${c.id}`,
        type: 'comment',
        date: c.created_at,
        title: `Comment by ${c.author_name || 'Unknown'}`,
        description: c.comment_text,
        meta: c.proposed_repayment_date ? `Proposed: ${c.proposed_repayment_date}` : undefined,
      });
    });

    recoveries?.forEach(r => {
      items.push({
        id: `r-${r.id}`,
        type: 'recovery',
        date: r.created_at,
        title: `Recovery: ৳${r.recovered_amount.toLocaleString()}`,
        description: `${r.recovery_type}${r.note ? ' — ' + r.note : ''}`,
        meta: r.recovery_date,
      });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [comments, recoveries, createdAt]);

  if (commentsLoading || recoveriesLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>;
  }

  const iconMap = {
    comment: <MessageSquare className="h-3.5 w-3.5 text-blue-500" />,
    recovery: <Banknote className="h-3.5 w-3.5 text-green-500" />,
    created: <Calendar className="h-3.5 w-3.5 text-primary" />,
  };

  const colorMap = {
    comment: 'border-blue-300 bg-blue-50 dark:bg-blue-950/20',
    recovery: 'border-green-300 bg-green-50 dark:bg-green-950/20',
    created: 'border-primary/30 bg-primary/5',
  };

  return (
    <div className="space-y-0">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" /> Timeline ({events.length})
      </h4>
      <div className="relative pl-4 border-l-2 border-muted space-y-3">
        {events.map(ev => (
          <div key={ev.id} className="relative">
            <div className="absolute -left-[1.35rem] top-1.5 h-4 w-4 rounded-full bg-card border-2 border-muted flex items-center justify-center">
              {iconMap[ev.type]}
            </div>
            <div className={`ml-2 p-2.5 rounded-lg border text-xs ${colorMap[ev.type]}`}>
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-semibold text-foreground">{ev.title}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(ev.date).toLocaleDateString('en-GB')}
                </span>
              </div>
              <p className="text-muted-foreground line-clamp-2">{ev.description}</p>
              {ev.meta && (
                <Badge variant="outline" className="text-[9px] h-4 mt-1">{ev.meta}</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoanTimeline;
