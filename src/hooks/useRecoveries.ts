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

export const useAddRecovery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recovery: Partial<LoanRecovery>) => {
      const { error } = await supabase.from('loan_recoveries').insert(recovery);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan-recoveries'] });
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Recovery recorded');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateRecovery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LoanRecovery> & { id: string }) => {
      const { error } = await supabase.from('loan_recoveries').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan-recoveries'] });
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Recovery updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteRecovery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loan_recoveries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan-recoveries'] });
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Recovery deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
