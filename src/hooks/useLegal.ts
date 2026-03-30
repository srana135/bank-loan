import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LegalCase, LegalCaseOrder, Lawyer } from '@/types';
import { toast } from 'sonner';

const isPGRST = (err: unknown) =>
  typeof (err as any)?.message === 'string' && ((err as any).message.includes('PGRST205') || (err as any).message.includes('Could not find'));

export const useLegalCases = (branchId?: string | null) => {
  return useQuery({
    queryKey: ['legal-cases', branchId],
    queryFn: async () => {
      let q = supabase.from('legal_cases').select('*').order('created_at', { ascending: false });
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as LegalCase[];
    },
    retry: (count, error) => isPGRST(error) ? false : count < 3,
  });
};

export const useCreateLegalCase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (caseData: Partial<LegalCase>) => {
      const { error } = await supabase.from('legal_cases').insert(caseData);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-cases'] }); toast.success('Case created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateLegalCase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LegalCase> & { id: string }) => {
      const { error } = await supabase.from('legal_cases').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-cases'] }); toast.success('Case updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteLegalCase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('legal_cases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-cases'] }); toast.success('Case deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useCaseOrders = (caseId: string | null) => {
  return useQuery({
    queryKey: ['case-orders', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      const { data, error } = await supabase.from('legal_case_orders').select('*').eq('case_id', caseId).order('order_date', { ascending: false });
      if (error) throw error;
      return (data || []) as LegalCaseOrder[];
    },
    enabled: !!caseId,
    retry: (count, error) => isPGRST(error) ? false : count < 3,
  });
};

export const useAddCaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: Partial<LegalCaseOrder>) => {
      const { error } = await supabase.from('legal_case_orders').insert(order);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case-orders'] }); toast.success('Order added'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useLawyers = () => {
  return useQuery({
    queryKey: ['lawyers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('lawyers').select('*').order('name');
      if (error) throw error;
      return (data || []) as Lawyer[];
    },
    retry: (count, error) => isPGRST(error) ? false : count < 3,
  });
};

export const useCreateLawyer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lawyer: Partial<Lawyer>) => {
      const { error } = await supabase.from('lawyers').insert(lawyer);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lawyers'] }); toast.success('Lawyer added'); },
    onError: (e: Error) => toast.error(e.message),
  });
};
