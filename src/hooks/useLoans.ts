import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loan, LoanComment } from '@/types';
import { toast } from 'sonner';
import { logActivity, logFieldChanges } from './useActivityLogs';

const isPGRST205 = (err: unknown) =>
  typeof (err as any)?.message === 'string' && ((err as any).message.includes('PGRST205') || (err as any).message.includes('Could not find the table'));

// Meta type for passing user info into mutations
interface LogMeta { _userId?: string | null; _userName?: string | null }

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
    enabled: branchId !== null,
    retry: (count, error) => isPGRST205(error) ? false : count < 3,
  });

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
    mutationFn: async (loan: Partial<Loan> & LogMeta) => {
      const { _userId, _userName, ...loanData } = loan;
      const { data, error } = await supabase.from('loans').insert(loanData).select().single();
      if (error) throw error;
      logActivity(_userId || null, _userName || null, 'create', 'loan', data.id, {
        field: 'Loan Created',
        new_value: data.account_no || data.borrower_name || 'New Loan',
        note: `Account: ${data.account_no || '-'}, Borrower: ${data.borrower_name || '-'}`,
      });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); toast.success('Loan created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, _userId, _userName, ...updates }: Partial<Loan> & { id: string } & LogMeta) => {
      // Fetch old data for comparison
      const { data: oldLoan } = await supabase.from('loans').select('*').eq('id', id).single();
      const { data, error } = await supabase.from('loans').update(updates).eq('id', id).select().single();
      if (error) throw error;
      // Log field-level changes
      if (oldLoan) {
        logFieldChanges(_userId || null, _userName || null, 'update', 'loan', id, oldLoan, updates, `Account: ${oldLoan.account_no || id}`);
      }
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); toast.success('Loan updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, _userId, _userName, _accountNo }: { id: string } & LogMeta & { _accountNo?: string }) => {
      const { error } = await supabase.from('loans').delete().eq('id', id);
      if (error) throw error;
      logActivity(_userId || null, _userName || null, 'delete', 'loan', id, {
        field: 'Loan Deleted',
        old_value: _accountNo || id,
        note: 'Loan permanently deleted',
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); toast.success('Loan deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useBulkDeleteLoans = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, _userId, _userName }: { ids: string[] } & LogMeta) => {
      const { error } = await supabase.from('loans').delete().in('id', ids);
      if (error) throw error;
      logActivity(_userId || null, _userName || null, 'delete', 'loan', null, {
        field: 'Bulk Delete',
        new_value: `${ids.length} loan(s) deleted`,
        note: `IDs: ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? '...' : ''}`,
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success(`${v.ids.length} loan(s) deleted`);
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
    retry: (count, error) => isPGRST205(error) ? false : count < 3,
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
    mutationFn: async (comment: { loan_id: string; comment_text: string; author_id: string; author_name: string; author_role: string; proposed_repayment_date?: string | null }) => {
      const { error } = await supabase.from('loan_comments').insert(comment);
      if (error) throw error;
      const updatePayload: Record<string, any> = { latest_comment: comment.comment_text, updated_by: comment.author_id };
      if (comment.proposed_repayment_date) {
        updatePayload.latest_proposed_date = comment.proposed_repayment_date;
      }
      await supabase.from('loans').update(updatePayload).eq('id', comment.loan_id);
      logActivity(comment.author_id, comment.author_name, 'create', 'comment', comment.loan_id, {
        field: 'Comment Added',
        new_value: comment.comment_text.slice(0, 100),
        note: comment.proposed_repayment_date ? `Proposed date: ${comment.proposed_repayment_date}` : undefined,
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['loan-comments', v.loan_id] });
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Comment added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// Helper: recalculate latest_proposed_date from all comments of a loan
async function syncLatestProposedDate(loanId: string) {
  const { data: comments } = await supabase
    .from('loan_comments').select('proposed_repayment_date')
    .eq('loan_id', loanId)
    .not('proposed_repayment_date', 'is', null)
    .order('proposed_repayment_date', { ascending: false })
    .limit(1);
  const latestDate = comments?.[0]?.proposed_repayment_date || null;
  await supabase.from('loans').update({ latest_proposed_date: latestDate }).eq('id', loanId);
}

export const useUpdateComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, loan_id, comment_text, proposed_repayment_date, _userId, _userName }: { id: string; loan_id: string; comment_text: string; proposed_repayment_date?: string | null } & LogMeta) => {
      // Fetch old comment
      const { data: oldComment } = await supabase.from('loan_comments').select('comment_text, proposed_repayment_date').eq('id', id).single();
      const updates: Record<string, any> = { comment_text };
      if (proposed_repayment_date !== undefined) updates.proposed_repayment_date = proposed_repayment_date || null;
      const { error } = await supabase.from('loan_comments').update(updates).eq('id', id);
      if (error) throw error;
      await syncLatestProposedDate(loan_id);
      if (oldComment) {
        if (oldComment.comment_text !== comment_text) {
          logActivity(_userId || null, _userName || null, 'update', 'comment', loan_id, {
            field: 'Comment Text',
            old_value: oldComment.comment_text?.slice(0, 100),
            new_value: comment_text.slice(0, 100),
          });
        }
        if (String(oldComment.proposed_repayment_date || '') !== String(proposed_repayment_date || '')) {
          logActivity(_userId || null, _userName || null, 'update', 'comment', loan_id, {
            field: 'Proposed Repayment Date',
            old_value: oldComment.proposed_repayment_date || '—',
            new_value: proposed_repayment_date || '—',
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan-comments'] });
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Comment updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, loan_id, _userId, _userName }: { id: string; loan_id: string } & LogMeta) => {
      const { data: oldComment } = await supabase.from('loan_comments').select('comment_text').eq('id', id).single();
      const { error } = await supabase.from('loan_comments').delete().eq('id', id);
      if (error) throw error;
      await syncLatestProposedDate(loan_id);
      logActivity(_userId || null, _userName || null, 'delete', 'comment', loan_id, {
        field: 'Comment Deleted',
        old_value: oldComment?.comment_text?.slice(0, 100) || '—',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan-comments'] });
      qc.invalidateQueries({ queryKey: ['loans'] });
      toast.success('Comment deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useBulkAddComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ loanIds, comment_text, author_id, author_name, author_role, proposed_repayment_date }: {
      loanIds: string[]; comment_text: string; author_id: string; author_name: string; author_role: string; proposed_repayment_date?: string | null;
    }) => {
      const comments = loanIds.map(loan_id => ({ loan_id, comment_text, author_id, author_name, author_role, proposed_repayment_date: proposed_repayment_date || null }));
      const { error } = await supabase.from('loan_comments').insert(comments);
      if (error) throw error;
      const updatePayload: Record<string, any> = { latest_comment: comment_text, updated_by: author_id };
      if (proposed_repayment_date) updatePayload.latest_proposed_date = proposed_repayment_date;
      for (const lid of loanIds) {
        await supabase.from('loans').update(updatePayload).eq('id', lid);
      }
      logActivity(author_id, author_name, 'create', 'comment', null, {
        field: 'Bulk Comment',
        new_value: comment_text.slice(0, 80),
        note: `Applied to ${loanIds.length} loan(s)`,
      });
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
  proposedDateFilter: '' | 'today' | '7days';
  expiredOnly: boolean;
  pendingOnly: boolean;
  recoveredOnly: boolean;
  dueOnly: boolean;
}

export const defaultFilters: LoanFilters = {
  accountName: '',
  borrowerName: '',
  accountType: '',
  accountStatus: '',
  address: '',
  classifications: [],
  proposedDateFilter: '',
  expiredOnly: false,
  pendingOnly: false,
  recoveredOnly: false,
  dueOnly: false,
};

export function applyFilters(loans: Loan[], filters: LoanFilters, search: string, loanRecoveryMap?: Map<string, string>): Loan[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayStr = now.toISOString().split('T')[0];
  const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];

  let result = loans.filter(l => {
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

    if (filters.proposedDateFilter === 'today') {
      if (!l.latest_proposed_date || l.latest_proposed_date !== todayStr) return false;
    } else if (filters.proposedDateFilter === '7days') {
      if (!l.latest_proposed_date || l.latest_proposed_date < todayStr || l.latest_proposed_date > in7Days) return false;
    }

    if (filters.expiredOnly) {
      if (!l.expiry_date || l.expiry_date >= todayStr) return false;
    }

    // Proposed-date based status filters — mirror badge logic in LoanManagement.
    // Recovered → has latest_proposed_date AND a recovery on/after that date
    // Pending   → latest_proposed_date > today AND not recovered
    // Overdue   → latest_proposed_date <= today AND not recovered
    if (filters.pendingOnly || filters.recoveredOnly || filters.dueOnly) {
      if (!l.latest_proposed_date) return false;
      const latestRecovery = loanRecoveryMap?.get(l.id);
      const isRecovered = !!(latestRecovery && latestRecovery >= l.latest_proposed_date);
      if (filters.recoveredOnly && !isRecovered) return false;
      if (filters.pendingOnly && (isRecovered || !(l.latest_proposed_date > todayStr))) return false;
      if (filters.dueOnly && (isRecovered || l.latest_proposed_date > todayStr)) return false;
    }

    return true;
  });

  if (filters.expiredOnly) {
    result = [...result].sort((a, b) => (a.expiry_date || '').localeCompare(b.expiry_date || ''));
  }
  if (filters.dueOnly) {
    result = [...result].sort((a, b) => (a.latest_proposed_date || '').localeCompare(b.latest_proposed_date || ''));
  }
  if (filters.pendingOnly) {
    result = [...result].sort((a, b) => (a.latest_proposed_date || '').localeCompare(b.latest_proposed_date || ''));
  }

  return result;
}
