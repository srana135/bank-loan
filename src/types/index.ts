export type UserRole = 'admin' | 'manager' | 'employee';

export interface Profile {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  role: UserRole;
  branch_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  branch_code: string;
  branch_name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_km: number | null;
  created_at: string;
}

export interface RegistrationRequest {
  id: string;
  requested_user_id: string | null;
  full_name: string;
  email: string;
  mobile: string | null;
  requested_role: string | null;
  branch_name: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface Loan {
  id: string;
  account_no: string | null;
  account_name: string | null;
  borrower_name: string;
  mobile: string | null;
  account_type: string | null;
  account_status: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  installment_amount: number;
  overdue_installment_number: number;
  overdue_amount: number;
  outstanding_amount: number;
  classification: string | null;
  guarantor_1_name: string | null;
  guarantor_1_mobile: string | null;
  guarantor_2_name: string | null;
  guarantor_2_mobile: string | null;
  branch_id: string | null;
  latest_comment: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanComment {
  id: string;
  loan_id: string;
  comment_text: string;
  author_id: string;
  author_name: string | null;
  author_role: string | null;
  created_at: string;
}

export interface ServiceFile {
  id: string;
  title: string;
  description: string | null;
  file_name: string | null;
  file_path: string | null;
  file_type: string | null;
  uploaded_by: string | null;
  visible_to: string;
  created_at: string;
}

export interface LoanProposal {
  id: string;
  customer_name: string;
  mobile: string | null;
  loan_type: string | null;
  monthly_income: number | null;
  eligible_amount: number | null;
  probable_disbursement_date: string | null;
  status: string;
  rejection_comment: string | null;
  rejection_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  updated_at: string;
}

export interface ImportLog {
  id: string;
  import_type: string | null;
  file_name: string | null;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  error_summary: any;
  imported_by: string | null;
  created_at: string;
}
