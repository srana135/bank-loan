import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Profile, RegistrationRequest } from '@/types';
import { toast } from 'sonner';

const isPGRST205 = (err: unknown) =>
  typeof (err as any)?.message === 'string' && ((err as any).message.includes('PGRST205') || (err as any).message.includes('Could not find the table'));

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Profile[];
    },
    retry: (count, error) => isPGRST205(error) ? false : count < 3,
  });
};

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Profile> & { id: string }) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profiles'] }); toast.success('Profile updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useRegistrationRequests = () => {
  return useQuery({
    queryKey: ['registration-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registration_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as RegistrationRequest[];
    },
    retry: (count, error) => isPGRST205(error) ? false : count < 3,
  });
};

export const useCreateRegistrationRequest = () => {
  return useMutation({
    mutationFn: async (req: Partial<RegistrationRequest>) => {
      const { error } = await supabase.from('registration_requests').insert(req);
      if (error) throw error;
    },
    onSuccess: () => toast.success('Registration request submitted successfully!'),
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useApproveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, reviewerId, role, branchId }: { requestId: string; reviewerId: string; role: string; branchId: string | null }) => {
      const { data: req, error: fetchErr } = await supabase
        .from('registration_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      if (fetchErr) throw fetchErr;

      const { data: profiles } = await supabase.from('profiles').select('id').eq('email', req.email);
      if (profiles && profiles.length > 0) {
        await supabase.from('profiles').update({
          role,
          branch_id: branchId,
          is_active: true,
          full_name: req.full_name,
          mobile: req.mobile,
          user_id: req.requested_user_id,
        }).eq('id', profiles[0].id);
      }

      const { error } = await supabase.from('registration_requests').update({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      }).eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registration-requests'] });
      qc.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Request approved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useRejectRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, reviewerId, reason }: { requestId: string; reviewerId: string; reason: string }) => {
      const { error } = await supabase.from('registration_requests').update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      }).eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registration-requests'] });
      toast.success('Request rejected');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
