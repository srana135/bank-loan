import { Loan } from '@/types';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface Props {
  loan: Loan;
  compact?: boolean;
}

const CLS_ORDER = ['STD', 'SMA', 'SS', 'DF', 'BL'];

function classifyByInstallments(overdueInst: number, t: { sma_max: number; ss_max: number; df_max: number }): string {
  if (overdueInst > t.df_max) return 'BL';
  if (overdueInst > t.ss_max) return 'DF';
  if (overdueInst > t.sma_max) return 'SS';
  if (overdueInst > 0) return 'SMA';
  return 'STD';
}

const ClassificationSuggestion = ({ loan, compact = false }: Props) => {
  const { data: settings } = useAppSettings();

  if (!settings) return null;

  const isResch = loan.loan_category === 'rescheduled';
  const thresholds = isResch
    ? (settings.classification_installments_resch || { sma_max: 6, ss_max: 9, df_max: 12 })
    : (settings.classification_installments_new   || { sma_max: 3, ss_max: 6, df_max: 9 });

  const overdueInst = loan.overdue_installment_number || 0;
  const suggested = classifyByInstallments(overdueInst, thresholds);
  const current = loan.classification || 'STD';

  const currentIdx = CLS_ORDER.indexOf(current);
  const suggestedIdx = CLS_ORDER.indexOf(suggested);

  if (suggestedIdx <= currentIdx) return null;

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
        বকেয়া {overdueInst} কিস্তি → প্রস্তাবিত: <strong>{suggested}</strong> (বর্তমান: {current})
      </span>
    </div>
  );
};

export default ClassificationSuggestion;
