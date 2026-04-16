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
    mutationFn: async (order: Partial<LegalCaseOrder> & { _case_id?: string }) => {
      const { _case_id, ...orderData } = order;
      const { error } = await supabase.from('legal_case_orders').insert(orderData);
      if (error) throw error;
      // Update case next_date + latest_order
      if (orderData.case_id) {
        const updatePayload: Record<string, any> = {};
        if (orderData.next_date) updatePayload.next_date = orderData.next_date;
        if (orderData.order_summary) updatePayload.latest_order_summary = orderData.order_summary;
        if (orderData.order_date) updatePayload.latest_order_date = orderData.order_date;
        if (Object.keys(updatePayload).length > 0) {
          await supabase.from('legal_cases').update(updatePayload).eq('id', orderData.case_id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-orders'] });
      qc.invalidateQueries({ queryKey: ['legal-cases'] });
      toast.success('Order added');
    },
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

export const useUpdateLawyer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lawyer> & { id: string }) => {
      const { error } = await supabase.from('lawyers').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lawyers'] }); toast.success('Lawyer updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteLawyer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lawyers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lawyers'] }); toast.success('Lawyer deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

// Bulk import legal cases
export const useBulkImportCases = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cases: Partial<LegalCase>[]) => {
      const { error } = await supabase.from('legal_cases').insert(cases);
      if (error) throw error;
      return cases.length;
    },
    onSuccess: (_d, cases) => {
      qc.invalidateQueries({ queryKey: ['legal-cases'] });
      toast.success(`${cases.length} case(s) imported`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
