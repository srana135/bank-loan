import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LegalNotice } from '@/types';
import { toast } from 'sonner';
import { logActivity, logFieldChanges } from './useActivityLogs';

const isPGRST = (err: unknown) =>
  typeof (err as any)?.message === 'string' && ((err as any).message.includes('PGRST205') || (err as any).message.includes('Could not find'));

interface LogMeta { _userId?: string | null; _userName?: string | null }

export const useLegalNotices = (branchId?: string | null) => {
  return useQuery({
    queryKey: ['legal-notices', branchId],
    queryFn: async () => {
      let q = supabase.from('legal_notices').select('*').order('created_at', { ascending: false });
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as LegalNotice[];
    },
    retry: (count, error) => isPGRST(error) ? false : count < 3,
  });
};

export const useCreateLegalNotice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notice: Partial<LegalNotice> & LogMeta) => {
      const { _userId, _userName, ...data } = notice;
      const { error } = await supabase.from('legal_notices').insert(data);
      if (error) throw error;
      logActivity(_userId || null, _userName || null, 'create', 'legal_notice', null, {
        field: 'Notice Created',
        new_value: `${data.notice_type || 'Notice'} - ${data.borrower_name || data.account_no || '-'}`,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-notices'] }); toast.success('Notice created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateLegalNotice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, _userId, _userName, ...updates }: Partial<LegalNotice> & { id: string } & LogMeta) => {
      const { data: oldNotice } = await supabase.from('legal_notices').select('*').eq('id', id).single();
      const { error } = await supabase.from('legal_notices').update(updates).eq('id', id);
      if (error) throw error;
      if (oldNotice) {
        logFieldChanges(_userId || null, _userName || null, 'update', 'legal_notice', id, oldNotice, updates, `Notice: ${oldNotice.borrower_name || id}`);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-notices'] }); toast.success('Notice updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteLegalNotice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, _userId, _userName }: { id: string } & LogMeta) => {
      const { error } = await supabase.from('legal_notices').delete().eq('id', id);
      if (error) throw error;
      logActivity(_userId || null, _userName || null, 'delete', 'legal_notice', id, {
        field: 'Notice Deleted',
        old_value: id,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-notices'] }); toast.success('Notice deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });
};
