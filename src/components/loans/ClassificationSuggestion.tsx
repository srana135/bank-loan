import { Loan } from '@/types';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface Props {
  loan: Loan;
  compact?: boolean;
}

const CLS_ORDER = ['STD', 'SMA', 'SS', 'DF', 'BL'];

function getSuggestedClassification(overdueDays: number, classificationDays: Record<string, number>): string {
  if (overdueDays >= (classificationDays.BL || 360)) return 'BL';
  if (overdueDays >= (classificationDays.DF || 270)) return 'DF';
  if (overdueDays >= (classificationDays.SS || 180)) return 'SS';
  if (overdueDays >= (classificationDays.SMA || 90)) return 'SMA';
  return 'STD';
}

const ClassificationSuggestion = ({ loan, compact = false }: Props) => {
  const { data: settings } = useAppSettings();
  
  if (!settings) return null;

  // Pick threshold set based on loan_category
  const isResch = loan.loan_category === 'rescheduled';
  const split = isResch
    ? (settings.classification_days_resch || { sma_max: 180, ss_max: 270, df_max: 360 })
    : (settings.classification_days_new   || { sma_max: 90,  ss_max: 180, df_max: 270 });

  const classificationDays = {
    STD: 0,
    SMA: split.sma_max,
    SS:  split.ss_max,
    DF:  split.df_max,
    BL:  split.df_max + 90,
  };

  const overdueDays = (loan.overdue_installment_number || 0) * 30;
  const suggested = getSuggestedClassification(overdueDays, classificationDays);
  const current = loan.classification || 'STD';

  // Only show if mismatch
  const currentIdx = CLS_ORDER.indexOf(current);
  const suggestedIdx = CLS_ORDER.indexOf(suggested);
  
  if (suggestedIdx <= currentIdx) return null; // Already correct or higher

  if (compact) {
    return (
      <Badge variant="destructive" className="text-[9px] h-4 gap-0.5 animate-pulse">
        <AlertTriangle className="h-2.5 w-2.5" />→{suggested}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-destructive bg-destructive/10 rounded px-2 py-1">
      <AlertTriangle className="h-3 w-3 shrink-0" />
      <span>
        Overdue {overdueDays}d → Suggested: <strong>{suggested}</strong> (current: {current})
      </span>
    </div>
  );
};

export default ClassificationSuggestion;
