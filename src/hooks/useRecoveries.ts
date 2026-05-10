import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LoanRecovery } from '@/types';
import { toast } from 'sonner';
import { logActivity } from './useActivityLogs';

interface LogMeta { _userId?: string | null; _userName?: string | null }

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

async function adjustLoanAfterRecovery(loanId: string, amountDelta: number) {
  const { data: loan } = await supabase
    .from('loans')
    .select('outstanding_amount, installment_amount, overdue_installment_number, overdue_amount, disbursed_loan_amount, account_status')
    .eq('id', loanId).single();
  if (!loan) return;

  const installment = loan.installment_amount || 1;
  const principal = loan.disbursed_loan_amount || (loan.outstanding_amount || 0) + amountDelta;
  const totalInstallments = installment > 0 ? Math.ceil((principal || 0) / installment) : 0;

  let newOutstanding = (loan.outstanding_amount || 0) - amountDelta;
  if (amountDelta < 0 && principal > 0) {
    newOutstanding = Math.min(principal, newOutstanding);
  }
  newOutstanding = Math.max(0, newOutstanding);

  let newOverdue = (loan.overdue_installment_number || 0) - (amountDelta / installment);
  if (totalInstallments > 0) newOverdue = Math.min(totalInstallments, newOverdue);
  newOverdue = Math.max(0, newOverdue);
  newOverdue = Math.round(newOverdue * 100) / 100;

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const updates: Record<string, unknown> = {
    outstanding_amount: round2(newOutstanding),
    overdue_installment_number: newOverdue,
    overdue_amount: round2(newOutstanding),
  };

  if (newOutstanding <= 0) {
    updates.outstanding_amount = 0;
    updates.overdue_installment_number = 0;
    updates.overdue_amount = 0;
    updates.account_status = 'Closed';
  } else if ((loan.account_status || '').toLowerCase() === 'closed') {
    updates.account_status = 'Active';
  }

  await supabase.from('loans').update(updates).eq('id', loanId);
}

export const useAddRecovery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recovery: Partial<LoanRecovery> & LogMeta) => {
      const { _userId, _userName, ...recoveryData } = recovery;
      const amt = Number(recoveryData.recovered_amount || 0);
      if (!amt || amt <= 0) {
        throw new Error('অর্থ গ্রহণের পরিমাণ অবৈধ');
      }
      let effective = amt;
      if (recoveryData.loan_id) {
        const { data: l } = await supabase.from('loans').select('outstanding_amount').eq('id', recoveryData.loan_id).single();
        const out = l?.outstanding_amount || 0;
        if (amt > out && out > 0) {
          toast.warning('রিকভারি পরিমাণ বকেয়া ছাড়িয়ে যাচ্ছে');
          effective = out;
          recoveryData.recovered_amount = effective;
        }
      }
      const { error } = await supabase.from('loan_recoveries').insert(recoveryData);
      if (error) throw error;
      if (recoveryData.loan_id && recoveryData.recovered_amount) {
        await adjustLoanAfterRecovery(recoveryData.loan_id, recoveryData.recovered_amount);
      }
      logActivity(_userId || null, _userName || null, 'create', 'recovery', recoveryData.loan_id || null, {
        field: 'Recovery Added',
        new_value: `৳${recoveryData.recovered_amount || 0}`,
        note: `Date: ${recoveryData.recovery_date || '-'}, Type: ${recoveryData.recovery_type || '-'}`,
      });
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
    mutationFn: async ({ id, oldAmount, loanId, _userId, _userName, ...updates }: Partial<LoanRecovery> & { id: string; oldAmount?: number; loanId?: string } & LogMeta) => {
      const { error } = await supabase.from('loan_recoveries').update(updates).eq('id', id);
      if (error) throw error;
      if (loanId && oldAmount !== undefined && updates.recovered_amount !== undefined) {
        const diff = updates.recovered_amount - oldAmount;
        if (diff !== 0) await adjustLoanAfterRecovery(loanId, diff);
      }
      logActivity(_userId || null, _userName || null, 'update', 'recovery', loanId || null, {
        field: 'Recovery Amount',
        old_value: oldAmount !== undefined ? `৳${oldAmount}` : '—',
        new_value: updates.recovered_amount !== undefined ? `৳${updates.recovered_amount}` : '—',
        note: `Date: ${updates.recovery_date || '-'}`,
      });
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
    mutationFn: async ({ id, loanId, amount, _userId, _userName }: { id: string; loanId?: string; amount?: number } & LogMeta) => {
      const { error } = await supabase.from('loan_recoveries').delete().eq('id', id);
      if (error) throw error;
      if (loanId && amount) {
        await adjustLoanAfterRecovery(loanId, -amount);
      }
      logActivity(_userId || null, _userName || null, 'delete', 'recovery', loanId || null, {
        field: 'Recovery Deleted',
        old_value: amount ? `৳${amount}` : '—',
        note: 'Recovery removed, outstanding restored',
      });
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

export const useBulkAddRecovery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entries, _userId, _userName }: { entries: { loan_id: string; recovery_date: string; recovered_amount: number; recovery_type: string; note?: string | null; created_by?: string }[] } & LogMeta) => {
      for (const entry of entries) {
        const { data: existing } = await supabase
          .from('loan_recoveries')
          .select('id, recovered_amount')
          .eq('loan_id', entry.loan_id)
          .eq('recovery_date', entry.recovery_date)
          .maybeSingle();

        if (existing) {
          const diff = entry.recovered_amount - existing.recovered_amount;
          await supabase.from('loan_recoveries').update({
            recovered_amount: entry.recovered_amount,
            recovery_type: entry.recovery_type,
            note: entry.note || null,
          }).eq('id', existing.id);
          if (diff !== 0) await adjustLoanAfterRecovery(entry.loan_id, diff);
          logActivity(_userId || null, _userName || null, 'update', 'recovery', entry.loan_id, {
            field: 'Bulk Recovery Updated',
            old_value: `৳${existing.recovered_amount}`,
            new_value: `৳${entry.recovered_amount}`,
            note: `Date: ${entry.recovery_date}`,
          });
        } else {
          await supabase.from('loan_recoveries').insert(entry);
          await adjustLoanAfterRecovery(entry.loan_id, entry.recovered_amount);
          logActivity(_userId || null, _userName || null, 'create', 'recovery', entry.loan_id, {
            field: 'Bulk Recovery Added',
            new_value: `৳${entry.recovered_amount}`,
            note: `Date: ${entry.recovery_date}`,
          });
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
