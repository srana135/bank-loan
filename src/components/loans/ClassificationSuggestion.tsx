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

  const classificationDays = settings.loan_classification_days || {
    STD: 0, SMA: 90, SS: 180, DF: 270, BL: 360,
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
