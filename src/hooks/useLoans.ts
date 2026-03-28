import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loan } from '@/types';
import { toast } from 'sonner';

export const useLoans = (branchId?: string | null) => {
  return useQuery({
    queryKey: ['loans', branchId],
    queryFn: async () => {
      let query = supabase
        .from('loans')
        .select('*')
        .order('updated_at', { ascending: false });
      if (branchId) query = query.eq('branch_id', branchId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Loan[];
    },
  });
};

export const useLoan = (id: string | null) => {
  return useQuery({
    queryKey: ['loan', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('loans').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Loan;
    },
    enabled: !!id,
  });
};

export const useCreateLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loan: Partial<Loan>) => {
      const { data, error } = await supabase.from('loans').insert(loan).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); toast.success('Loan created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Loan> & { id: string }) => {
      const { data, error } = await supabase.from('loans').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); toast.success('Loan updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); toast.success('Loan deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useLoanComments = (loanId: string | null) => {
  return useQuery({
    queryKey: ['loan-comments', loanId],
    queryFn: async () => {
      if (!loanId) return [];
      const { data, error } = await supabase
        .from('loan_comments')
        .select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!loanId,
  });
};

export const useAddComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (comment: { loan_id: string; comment_text: string; author_id: string; author_name: string; author_role: string }) => {
      const { error: commentError } = await supabase.from('loan_comments').insert(comment);
      if (commentError) throw commentError;
      // Also update latest_comment on loan
      await supabase.from('loans').update({ latest_comment: comment.comment_text, updated_by: comment.author_id }).eq('id', comment.loan_id);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['loan-comments', v.loan_id] });
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Comment added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
