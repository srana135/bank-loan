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
  can_access_all_branches: boolean;
  language_preference: string | null;
  last_login_at: string | null;
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
  disbursement_date: string | null;
  disbursed_loan_amount: number | null;
  latest_comment: string | null;
  latest_proposed_date: string | null;
  expiry_date: string | null;
  data_as_of_date: string | null;
  loan_category: 'new' | 'rescheduled';
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanComment {
  id: string;
  loan_id: string;
  comment_text: string;
  proposed_repayment_date: string | null;
  author_id: string;
  author_name: string | null;
  author_role: string | null;
  created_at: string;
}

export interface LoanRecovery {
  id: string;
  loan_id: string;
  recovery_date: string;
  recovered_amount: number;
  recovery_type: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LegalCase {
  id: string;
  loan_id: string | null;
  case_number: string;
  case_type: string;
  court_name: string | null;
  filing_date: string | null;
  status: string;
  plaintiff_name: string | null;
  defendant_name: string | null;
  lawyer_id: string | null;
  officer_id: string | null;
  branch_id: string | null;
  description: string | null;
  claim_amount: number | null;
  next_date: string | null;
  remarks: string | null;
  latest_order_summary: string | null;
  latest_order_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegalCaseOrder {
  id: string;
  case_id: string;
  order_date: string;
  order_summary: string;
  next_date: string | null;
  order_type: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Lawyer {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  specialization: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LegalNotice {
  id: string;
  loan_id: string | null;
  borrower_name: string | null;
  organization_name: string | null;
  account_no: string | null;
  notice_type: string;
  sent_date: string | null;
  receipt_status: 'received' | 'returned' | 'pending';
  receipt_date: string | null;
  case_filing_deadline: string | null;
  branch_id: string | null;
  created_by: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_value: any;
  new_value: any;
  performed_by: string | null;
  performed_at: string;
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

export type RemittanceChannel = 'Bank Transfer' | 'bKash' | 'Nagad' | 'Rocket' | 'Exchange House' | 'Hand Carry';
export type ExpatRelation = 'Father' | 'Son' | 'Brother' | 'Husband' | 'Other';
export type RemittanceFrequency = 'Monthly' | 'Irregular';
export type RemittanceStability = 'Stable' | 'Medium' | 'Uncertain';

export interface RemittanceProfile {
  id: string;
  loan_id: string | null;
  branch_id: string | null;
  account_holder_name: string;
  account_number: string | null;
  mobile_number: string;
  expat_name: string | null;
  expat_relation: ExpatRelation | null;
  country: string | null;
  city: string | null;
  years_abroad: number | null;
  sends_money: boolean;
  frequency: RemittanceFrequency | null;
  average_amount: number | null;
  channels: RemittanceChannel[];
  receiver_name: string | null;
  receiver_mobile: string | null;
  receiver_method: string | null;
  stability: RemittanceStability | null;
  notes: string | null;
  collected_by: string | null;
  collected_by_name: string | null;
  created_at: string;
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
