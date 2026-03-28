import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loan, LoanComment } from '@/types';
import { toast } from 'sonner';

export const useLoans = (branchId?: string | null) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['loans', branchId],
    queryFn: async () => {
      let q = supabase.from('loans').select('*').order('updated_at', { ascending: false });
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Loan[];
    },
  });

  // Realtime subscription for loans
  useEffect(() => {
    const channel = supabase
      .channel('loans-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => {
        qc.invalidateQueries({ queryKey: ['loans'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return query;
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

export const useBulkDeleteLoans = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('loans').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_d, ids) => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success(`${ids.length} loan(s) deleted`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useLoanComments = (loanId: string | null) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['loan-comments', loanId],
    queryFn: async () => {
      if (!loanId) return [];
      const { data, error } = await supabase
        .from('loan_comments').select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LoanComment[];
    },
    enabled: !!loanId,
  });

  useEffect(() => {
    if (!loanId) return;
    const channel = supabase
      .channel(`comments-${loanId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loan_comments', filter: `loan_id=eq.${loanId}` }, () => {
        qc.invalidateQueries({ queryKey: ['loan-comments', loanId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loanId, qc]);

  return query;
};

export const useAddComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (comment: { loan_id: string; comment_text: string; author_id: string; author_name: string; author_role: string }) => {
      const { error } = await supabase.from('loan_comments').insert(comment);
      if (error) throw error;
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

export const useBulkAddComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ loanIds, comment_text, author_id, author_name, author_role }: {
      loanIds: string[]; comment_text: string; author_id: string; author_name: string; author_role: string;
    }) => {
      const comments = loanIds.map(loan_id => ({ loan_id, comment_text, author_id, author_name, author_role }));
      const { error } = await supabase.from('loan_comments').insert(comments);
      if (error) throw error;
      // Update latest_comment on all affected loans
      for (const lid of loanIds) {
        await supabase.from('loans').update({ latest_comment: comment_text, updated_by: author_id }).eq('id', lid);
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['loan-comments'] });
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success(`Comment added to ${v.loanIds.length} loan(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// Filter types
export interface LoanFilters {
  accountName: string;
  borrowerName: string;
  accountType: string;
  accountStatus: string;
  address: string;
  classifications: string[];
}

export const defaultFilters: LoanFilters = {
  accountName: '',
  borrowerName: '',
  accountType: '',
  accountStatus: '',
  address: '',
  classifications: [],
};

export function applyFilters(loans: Loan[], filters: LoanFilters, search: string): Loan[] {
  return loans.filter(l => {
    if (search) {
      const s = search.toLowerCase();
      const match = l.borrower_name?.toLowerCase().includes(s) ||
        l.account_no?.toLowerCase().includes(s) ||
        l.account_name?.toLowerCase().includes(s) ||
        l.mobile?.includes(s);
      if (!match) return false;
    }
    if (filters.accountName && !l.account_name?.toLowerCase().includes(filters.accountName.toLowerCase())) return false;
    if (filters.borrowerName && !l.borrower_name?.toLowerCase().includes(filters.borrowerName.toLowerCase())) return false;
    if (filters.accountType && l.account_type !== filters.accountType) return false;
    if (filters.accountStatus && l.account_status !== filters.accountStatus) return false;
    if (filters.address && !l.address?.toLowerCase().includes(filters.address.toLowerCase())) return false;
    if (filters.classifications.length > 0 && !filters.classifications.includes(l.classification || '')) return false;
    return true;
  });
}
