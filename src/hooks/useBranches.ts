import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Branch } from '@/types';

const isPGRST205 = (err: unknown) =>
  typeof (err as any)?.message === 'string' && ((err as any).message.includes('PGRST205') || (err as any).message.includes('Could not find the table'));

export const useBranches = () => {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('branch_name');
      if (error) throw error;
      return (data || []) as Branch[];
    },
    retry: (count, error) => isPGRST205(error) ? false : count < 3,
  });
};
