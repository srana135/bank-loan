import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface LoanClassificationDays {
  std_max: number;
  sma_max: number;
  ss_max: number;
  df_max: number;
  // BL = anything above df_max
}

export interface LegalCaseConfig {
  case_types: string[];
  default_court: string;
}

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
  simple_interest_ceiling_rounding: number;
  simple_interest_grace_months: number;
  simple_interest_grace_accumulates: boolean;
  // Map settings
  default_map_radius_km: number;
  default_map_lat: number;
  default_map_lng: number;
  // Classification days
  classification_days: LoanClassificationDays;
  // Legal case config
  legal_case_config: LegalCaseConfig;
  // Currency converter defaults
  default_currencies: string[];
  // DPS/FDR defaults
  dps_default_rate: number;
  fdr_default_rate: number;
  dps_default_tenure_years: number;
  fdr_default_tenure_months: number;
  // SMS template
  sms_template: string;
  // App branding
  app_name: string;
  app_name_bn: string;
  // Registration
  require_admin_approval: boolean;
  // Connect page
  connect_name: string;
  connect_designation: string;
  connect_organization: string;
  connect_mobile: string;
  connect_email: string;
  connect_location: string;
  connect_map_lat: number;
  connect_map_lng: number;
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
  simple_interest_ceiling_rounding: 1,
  simple_interest_grace_months: 0,
  simple_interest_grace_accumulates: true,
  default_map_radius_km: 5,
  default_map_lat: 23.8103,
  default_map_lng: 90.4125,
  classification_days: { std_max: 90, sma_max: 180, ss_max: 270, df_max: 360 },
  legal_case_config: { case_types: ['NI', 'Artha Rin', 'PDR'], default_court: '' },
  default_currencies: ['USD', 'SAR', 'AED', 'EUR', 'GBP', 'KWD', 'OMR', 'QAR', 'MYR', 'SGD'],
  dps_default_rate: 8,
  fdr_default_rate: 9,
  dps_default_tenure_years: 5,
  fdr_default_tenure_months: 12,
  sms_template: 'প্রিয় {{borrower}}, আপনার ঋণ হিসাব নং {{account}} এ বকেয়া ৳{{outstanding}}। অনুগ্রহ করে পরিশোধ করুন।',
  app_name: 'Loan Management',
  app_name_bn: 'ঋণ ব্যবস্থাপনা',
  require_admin_approval: true,
};

const isPGRST205 = (err: unknown) =>
  typeof (err as any)?.message === 'string' && ((err as any).message.includes('PGRST205') || (err as any).message.includes('Could not find the table'));

export const useAppSettings = () => {
  return useQuery({
    queryKey: ['app-settings-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('setting_key, setting_value');
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
