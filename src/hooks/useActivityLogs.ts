import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

export function useActivityLogs(limit = 100) {
  return useQuery({
    queryKey: ['activity-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as ActivityLog[];
    },
    retry: 1,
  });
}

export async function logActivity(
  userId: string | null,
  userName: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, any>
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      user_name: userName,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || {},
    });
  } catch {
    // Silent fail - don't block main operations
  }
}
