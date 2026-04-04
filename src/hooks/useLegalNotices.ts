import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LegalNotice } from '@/types';
import { toast } from 'sonner';

const isPGRST = (err: unknown) =>
  typeof (err as any)?.message === 'string' && ((err as any).message.includes('PGRST205') || (err as any).message.includes('Could not find'));

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
    mutationFn: async (notice: Partial<LegalNotice>) => {
      const { error } = await supabase.from('legal_notices').insert(notice);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-notices'] }); toast.success('Notice created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateLegalNotice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LegalNotice> & { id: string }) => {
      const { error } = await supabase.from('legal_notices').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-notices'] }); toast.success('Notice updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteLegalNotice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('legal_notices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-notices'] }); toast.success('Notice deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });
};
