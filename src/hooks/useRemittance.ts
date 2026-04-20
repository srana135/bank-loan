import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { RemittanceProfile } from '@/types';
import { toast } from 'sonner';
import { logActivity } from './useActivityLogs';

interface LogMeta { _userId?: string | null; _userName?: string | null }

export const useRemittanceProfiles = (branchId?: string | null) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['remittance_profiles', branchId],
    queryFn: async () => {
      let q = supabase.from('remittance_profiles').select('*').order('updated_at', { ascending: false });
      if (branchId) q = q.eq('branch_id', branchId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as RemittanceProfile[];
    },
    enabled: branchId !== null,
  });

  useEffect(() => {
    const channel = supabase
      .channel('remittance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'remittance_profiles' }, () => {
        qc.invalidateQueries({ queryKey: ['remittance_profiles'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return query;
};

export const useRemittanceByLoan = (loanId?: string | null) =>
  useQuery({
    queryKey: ['remittance_profiles', 'loan', loanId],
    queryFn: async () => {
      if (!loanId) return [];
      const { data, error } = await supabase
        .from('remittance_profiles')
        .select('*')
        .eq('loan_id', loanId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as RemittanceProfile[];
    },
    enabled: !!loanId,
  });

export const useCreateRemittance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<RemittanceProfile> & LogMeta) => {
      const { _userId, _userName, ...row } = payload;
      const { data, error } = await supabase.from('remittance_profiles').insert(row).select().single();
      if (error) throw error;
      logActivity(_userId || null, _userName || null, 'create', 'remittance_profile', data.id, {
        field: 'Remittance Profile Created',
        new_value: data.account_holder_name,
      });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remittance_profiles'] }); toast.success('Profile saved'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateRemittance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, _userId, _userName, ...updates }: Partial<RemittanceProfile> & { id: string } & LogMeta) => {
      // Strip immutable / server-managed fields to avoid update conflicts
      const { created_at, updated_at, collected_by, ...safe } = updates as any;
      const { data, error } = await supabase.from('remittance_profiles').update(safe).eq('id', id).select().single();
      if (error) throw error;
      logActivity(_userId || null, _userName || null, 'update', 'remittance_profile', id, {
        field: 'Remittance Profile Updated',
        new_value: data.account_holder_name,
      });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remittance_profiles'] }); toast.success('Profile updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteRemittance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, _userId, _userName }: { id: string } & LogMeta) => {
      const { error } = await supabase.from('remittance_profiles').delete().eq('id', id);
      if (error) throw error;
      logActivity(_userId || null, _userName || null, 'delete', 'remittance_profile', id, {
        field: 'Remittance Profile Deleted',
        old_value: id,
      });
      return id;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remittance_profiles'] }); toast.success('Profile deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });
};
