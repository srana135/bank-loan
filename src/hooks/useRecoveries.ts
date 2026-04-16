import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LoanRecovery } from '@/types';
import { toast } from 'sonner';

export const useLoanRecoveries = (loanId: string | null) => {
  return useQuery({
    queryKey: ['loan-recoveries', loanId],
    queryFn: async () => {
      if (!loanId) return [];
      const { data, error } = await supabase.from('loan_recoveries').select('*').eq('loan_id', loanId).order('recovery_date', { ascending: false });
      if (error) {
        if (error.code === 'PGRST205') return [];
        throw error;
      }
      return (data || []) as LoanRecovery[];
    },
    enabled: !!loanId,
  });
};

// Helper: adjust loan outstanding_amount and overdue_installment_number after recovery change
async function adjustLoanAfterRecovery(loanId: string, amountDelta: number) {
  // amountDelta: positive = recovery added (reduce outstanding), negative = recovery removed (increase outstanding)
  const { data: loan } = await supabase.from('loans').select('outstanding_amount, installment_amount, overdue_installment_number').eq('id', loanId).single();
  if (!loan) return;
  const newOutstanding = Math.max(0, (loan.outstanding_amount || 0) - amountDelta);
  const installment = loan.installment_amount || 1;
  // Reduce overdue installment by how many installments worth of recovery
  const installmentsDelta = Math.floor(Math.abs(amountDelta) / installment) * Math.sign(amountDelta);
  const newOverdue = Math.max(0, (loan.overdue_installment_number || 0) - installmentsDelta);
  await supabase.from('loans').update({
    outstanding_amount: newOutstanding,
    overdue_installment_number: newOverdue,
  }).eq('id', loanId);
}

export const useAddRecovery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recovery: Partial<LoanRecovery>) => {
      const { error } = await supabase.from('loan_recoveries').insert(recovery);
      if (error) throw error;
      // Adjust loan outstanding
      if (recovery.loan_id && recovery.recovered_amount) {
        await adjustLoanAfterRecovery(recovery.loan_id, recovery.recovered_amount);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan-recoveries'] });
      qc.invalidateQueries({ queryKey: ['all-recoveries'] });
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Recovery recorded');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateRecovery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, oldAmount, loanId, ...updates }: Partial<LoanRecovery> & { id: string; oldAmount?: number; loanId?: string }) => {
      const { error } = await supabase.from('loan_recoveries').update(updates).eq('id', id);
      if (error) throw error;
      // Adjust difference
      if (loanId && oldAmount !== undefined && updates.recovered_amount !== undefined) {
        const diff = updates.recovered_amount - oldAmount;
        if (diff !== 0) await adjustLoanAfterRecovery(loanId, diff);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan-recoveries'] });
      qc.invalidateQueries({ queryKey: ['all-recoveries'] });
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Recovery updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteRecovery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, loanId, amount }: { id: string; loanId?: string; amount?: number }) => {
      const { error } = await supabase.from('loan_recoveries').delete().eq('id', id);
      if (error) throw error;
      // Restore outstanding
      if (loanId && amount) {
        await adjustLoanAfterRecovery(loanId, -amount);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan-recoveries'] });
      qc.invalidateQueries({ queryKey: ['all-recoveries'] });
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Recovery deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// Bulk recovery: upsert by date - same date updates amount, new date inserts
export const useBulkAddRecovery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entries: { loan_id: string; recovery_date: string; recovered_amount: number; recovery_type: string; note?: string | null; created_by?: string }[]) => {
      for (const entry of entries) {
        // Check if recovery exists for this loan_id + recovery_date
        const { data: existing } = await supabase
          .from('loan_recoveries')
          .select('id, recovered_amount')
          .eq('loan_id', entry.loan_id)
          .eq('recovery_date', entry.recovery_date)
          .maybeSingle();
        
        if (existing) {
          // Update existing - adjust the difference
          const diff = entry.recovered_amount - existing.recovered_amount;
          await supabase.from('loan_recoveries').update({
            recovered_amount: entry.recovered_amount,
            recovery_type: entry.recovery_type,
            note: entry.note || null,
          }).eq('id', existing.id);
          if (diff !== 0) await adjustLoanAfterRecovery(entry.loan_id, diff);
        } else {
          // Insert new
          await supabase.from('loan_recoveries').insert(entry);
          await adjustLoanAfterRecovery(entry.loan_id, entry.recovered_amount);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan-recoveries'] });
      qc.invalidateQueries({ queryKey: ['all-recoveries'] });
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Bulk recovery updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
