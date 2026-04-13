import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LoanRecovery } from '@/types';

export const useAllRecoveries = (branchId?: string | null) => {
  return useQuery({
    queryKey: ['all-recoveries', branchId],
    queryFn: async () => {
      let q = supabase
        .from('loan_recoveries')
        .select('*, loans!inner(branch_id, account_no, borrower_name)')
        .order('recovery_date', { ascending: false });
      if (branchId) q = q.eq('loans.branch_id', branchId);
      const { data, error } = await q;
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('Could not find')) return [];
        throw error;
      }
      return (data || []) as (LoanRecovery & { loans: { branch_id: string; account_no: string; borrower_name: string } })[];
    },
    retry: (count, error) => {
      if (typeof (error as any)?.message === 'string' && (error as any).message.includes('PGRST205')) return false;
      return count < 3;
    },
  });
};
