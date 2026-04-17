import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LegalCase, LegalCaseOrder, Lawyer } from '@/types';
import { toast } from 'sonner';
import { logActivity, logFieldChanges } from './useActivityLogs';

const isPGRST = (err: unknown) =>
  typeof (err as any)?.message === 'string' && ((err as any).message.includes('PGRST205') || (err as any).message.includes('Could not find'));

interface LogMeta { _userId?: string | null; _userName?: string | null }

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
    mutationFn: async (caseData: Partial<LegalCase> & LogMeta) => {
      const { _userId, _userName, ...data } = caseData;
      const { error } = await supabase.from('legal_cases').insert(data);
      if (error) throw error;
      logActivity(_userId || null, _userName || null, 'create', 'legal_case', null, {
        field: 'Legal Case Created',
        new_value: data.case_number || 'New Case',
        note: `Case: ${data.case_number || '-'}`,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-cases'] }); toast.success('Case created'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateLegalCase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, _userId, _userName, ...updates }: Partial<LegalCase> & { id: string } & LogMeta) => {
      const { data: oldCase } = await supabase.from('legal_cases').select('*').eq('id', id).single();
      const { error } = await supabase.from('legal_cases').update(updates).eq('id', id);
      if (error) throw error;
      if (oldCase) {
        logFieldChanges(_userId || null, _userName || null, 'update', 'legal_case', id, oldCase, updates, `Case: ${oldCase.case_number || id}`);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['legal-cases'] }); toast.success('Case updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteLegalCase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, _userId, _userName, _caseNumber }: { id: string; _caseNumber?: string } & LogMeta) => {
      const { error } = await supabase.from('legal_cases').delete().eq('id', id);
      if (error) throw error;
      logActivity(_userId || null, _userName || null, 'delete', 'legal_case', id, {
        field: 'Legal Case Deleted',
        old_value: _caseNumber || id,
      });
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

// Recompute latest_order_date / latest_order_summary / next_date on the parent case
// after add/update/delete of an order.
async function recomputeCaseLatestOrder(caseId: string) {
  const { data: orders } = await supabase
    .from('legal_case_orders')
    .select('order_date, order_summary, next_date')
    .eq('case_id', caseId)
    .order('order_date', { ascending: false })
    .limit(1);
  const latest = orders?.[0];
  await supabase.from('legal_cases').update({
    latest_order_date: latest?.order_date || null,
    latest_order_summary: latest?.order_summary || null,
    next_date: latest?.next_date || null,
  }).eq('id', caseId);
}

export const useAddCaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: Partial<LegalCaseOrder> & { _case_id?: string } & LogMeta) => {
      const { _case_id, _userId, _userName, ...orderData } = order;
      const { error } = await supabase.from('legal_case_orders').insert(orderData);
      if (error) throw error;
      if (orderData.case_id) await recomputeCaseLatestOrder(orderData.case_id);
      logActivity(_userId || null, _userName || null, 'create', 'case_order', orderData.case_id || null, {
        field: 'Case Order Added',
        new_value: orderData.order_summary?.slice(0, 80) || '-',
        note: `Order date: ${orderData.order_date || '-'}, Next date: ${orderData.next_date || '-'}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-orders'] });
      qc.invalidateQueries({ queryKey: ['legal-cases'] });
      toast.success('Order added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateCaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, case_id, _userId, _userName, ...updates }: Partial<LegalCaseOrder> & { id: string; case_id: string } & LogMeta) => {
      const { data: oldOrder } = await supabase.from('legal_case_orders').select('*').eq('id', id).single();
      const { error } = await supabase.from('legal_case_orders').update(updates).eq('id', id);
      if (error) throw error;
      await recomputeCaseLatestOrder(case_id);
      if (oldOrder) {
        logFieldChanges(_userId || null, _userName || null, 'update', 'case_order', id, oldOrder, updates, `Order: ${oldOrder.order_date || id}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-orders'] });
      qc.invalidateQueries({ queryKey: ['legal-cases'] });
      toast.success('Order updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteCaseOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, case_id, _userId, _userName }: { id: string; case_id: string } & LogMeta) => {
      const { error } = await supabase.from('legal_case_orders').delete().eq('id', id);
      if (error) throw error;
      await recomputeCaseLatestOrder(case_id);
      logActivity(_userId || null, _userName || null, 'delete', 'case_order', id, {
        field: 'Case Order Deleted',
        old_value: id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-orders'] });
      qc.invalidateQueries({ queryKey: ['legal-cases'] });
      toast.success('Order deleted');
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
    mutationFn: async (lawyer: Partial<Lawyer> & LogMeta) => {
      const { _userId, _userName, ...data } = lawyer;
      const { error } = await supabase.from('lawyers').insert(data);
      if (error) throw error;
      logActivity(_userId || null, _userName || null, 'create', 'lawyer', null, {
        field: 'Lawyer Added',
        new_value: data.name || '-',
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lawyers'] }); toast.success('Lawyer added'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateLawyer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, _userId, _userName, ...updates }: Partial<Lawyer> & { id: string } & LogMeta) => {
      const { data: oldLawyer } = await supabase.from('lawyers').select('*').eq('id', id).single();
      const { error } = await supabase.from('lawyers').update(updates).eq('id', id);
      if (error) throw error;
      if (oldLawyer) {
        logFieldChanges(_userId || null, _userName || null, 'update', 'lawyer', id, oldLawyer, updates, `Lawyer: ${oldLawyer.name || id}`);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lawyers'] }); toast.success('Lawyer updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteLawyer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, _userId, _userName, _name }: { id: string; _name?: string } & LogMeta) => {
      const { error } = await supabase.from('lawyers').delete().eq('id', id);
      if (error) throw error;
      logActivity(_userId || null, _userName || null, 'delete', 'lawyer', id, {
        field: 'Lawyer Deleted',
        old_value: _name || id,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lawyers'] }); toast.success('Lawyer deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useBulkImportCases = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cases, _userId, _userName }: { cases: Partial<LegalCase>[] } & LogMeta) => {
      const { error } = await supabase.from('legal_cases').insert(cases);
      if (error) throw error;
      logActivity(_userId || null, _userName || null, 'create', 'legal_case', null, {
        field: 'Bulk Import',
        new_value: `${cases.length} case(s) imported`,
      });
      return cases.length;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['legal-cases'] });
      toast.success(`${v.cases.length} case(s) imported`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
