export type UserRole = 'admin' | 'manager' | 'officer' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Loan {
  id: string;
  user_id: string;
  loan_type: string;
  amount: number;
  interest_rate: number;
  tenure_months: number;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface ServiceProduct {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
}
