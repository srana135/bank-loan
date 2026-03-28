import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Branch } from '@/types';

export const useBranches = () => {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('*').order('branch_name');
      if (error) throw error;
      return (data || []) as Branch[];
    },
  });
};
