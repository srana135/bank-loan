import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AppSettingsMap {
  tax_rate_with_tin: number;
  tax_rate_without_tin: number;
  excise_duty_slabs: { min: number; max: number; duty: number }[];
  premature_encashment_rate_discount: number;
  loan_eligibility: {
    cmsme: { dti_ratio: number; max_amount: number; default_rate: number; max_tenure: number };
    personal: { dti_ratio: number; max_amount: number; default_rate: number; max_tenure: number };
    home_loan: { dti_ratio: number; max_amount: number; default_rate: number; max_tenure: number };
  };
  emi_rounding: number;
}

const DEFAULTS: AppSettingsMap = {
  tax_rate_with_tin: 10,
  tax_rate_without_tin: 15,
  excise_duty_slabs: [
    { min: 0, max: 100000, duty: 0 },
    { min: 100001, max: 500000, duty: 150 },
    { min: 500001, max: 1000000, duty: 500 },
    { min: 1000001, max: 5000000, duty: 2500 },
    { min: 5000001, max: 10000000, duty: 12000 },
    { min: 10000001, max: 50000000, duty: 25000 },
    { min: 50000001, max: Infinity, duty: 50000 },
  ],
  premature_encashment_rate_discount: 2,
  loan_eligibility: {
    cmsme: { dti_ratio: 0.5, max_amount: 5000000, default_rate: 9, max_tenure: 60 },
    personal: { dti_ratio: 0.4, max_amount: 2000000, default_rate: 12, max_tenure: 48 },
    home_loan: { dti_ratio: 0.45, max_amount: 20000000, default_rate: 8.5, max_tenure: 240 },
  },
  emi_rounding: 1,
};

const isPGRST205 = (err: unknown) =>
  typeof (err as any)?.message === 'string' && ((err as any).message.includes('PGRST205') || (err as any).message.includes('Could not find the table'));

export const useAppSettings = () => {
  return useQuery({
    queryKey: ['app-settings-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('setting_key, setting_value');
      // If table doesn't exist, just return defaults
      if (error && isPGRST205(error)) return DEFAULTS;
      const settings = { ...DEFAULTS } as any;
      if (data) {
        for (const row of data) {
          if (row.setting_key in settings) {
            settings[row.setting_key] = row.setting_value;
          }
        }
      }
      return settings as AppSettingsMap;
    },
    staleTime: 5 * 60 * 1000,
    retry: (count, error) => isPGRST205(error) ? false : count < 3,
  });
};
