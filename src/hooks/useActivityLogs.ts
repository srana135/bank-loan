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

/**
 * Log multiple field-level changes at once.
 * Compares oldData vs newData and creates a log entry for each changed field.
 */
export async function logFieldChanges(
  userId: string | null,
  userName: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  note?: string,
  fieldLabels?: Record<string, string>
) {
  try {
    const entries: any[] = [];
    const keys = new Set([...Object.keys(newData)]);
    for (const key of keys) {
      // Skip internal/meta fields
      if (key === 'id' || key === 'created_at' || key === 'updated_at' || key.startsWith('_')) continue;
      const oldVal = oldData[key];
      const newVal = newData[key];
      if (String(oldVal ?? '') !== String(newVal ?? '')) {
        entries.push({
          user_id: userId,
          user_name: userName,
          action,
          entity_type: entityType,
          entity_id: entityId,
          details: {
            field: fieldLabels?.[key] || key,
            old_value: oldVal ?? null,
            new_value: newVal ?? null,
            note: note || null,
          },
        });
      }
    }
    if (entries.length > 0) {
      await supabase.from('activity_logs').insert(entries);
    } else if (note) {
      // Log even if no field changed but there's a note
      await supabase.from('activity_logs').insert({
        user_id: userId,
        user_name: userName,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: { note },
      });
    }
  } catch {
    // Silent fail
  }
}
