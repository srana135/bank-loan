// Shared loan column definitions for Import / PDF / Excel exports
// Single source of truth — keep in sync between LoanImportDialog and exports.

export const ALL_LOAN_COLUMNS: Record<string, string> = {
  account_no: 'Account No',
  account_name: 'Account Name',
  borrower_name: 'Borrower Name',
  mobile: 'Mobile',
  account_type: 'Account Type',
  account_status: 'Account Status',
  loan_category: 'Loan Category',
  address: 'Address',
  disbursed_loan_amount: 'Disbursed Loan Amount',
  disbursement_date: 'Disbursement Date',
  expiry_date: 'Expiry Date',
  installment_amount: 'Installment Amount',
  overdue_installment_number: 'Overdue Installment Number',
  overdue_amount: 'Overdue Amount',
  outstanding_amount: 'Outstanding Amount',
  classification: 'Classification',
  guarantor_1_name: 'Guarantor 1 Name',
  guarantor_1_mobile: 'Guarantor 1 Mobile',
  guarantor_2_name: 'Guarantor 2 Name',
  guarantor_2_mobile: 'Guarantor 2 Mobile',
  branch_code: 'Branch Code',
  data_as_of_date: 'Data As-of Date',
  recovered_amount: 'Recovery Amount',
  recovery_date: 'Recovery Date',
};

// Canonical column order — used by both Import Template and PDF/Excel exports
export const CANONICAL_LOAN_COLUMN_ORDER = Object.keys(ALL_LOAN_COLUMNS);

export const NUMERIC_LOAN_COLS = ['disbursed_loan_amount', 'installment_amount', 'overdue_amount', 'outstanding_amount', 'recovered_amount', 'overdue_installment_number'];
export const INT_LOAN_COLS: string[] = [];

// Aggregated recovery columns are computed from loan_recoveries (not stored on loans)
// Treat them as "virtual" columns for export only.
export const RECOVERY_AGG_COLS = new Set(['recovered_amount', 'recovery_date']);

/**
 * Resolve a loan field for export.
 * `recovered_amount` → total recovery for that loan
 * `recovery_date` → latest recovery date for that loan
 * `branch_code` → resolved from branchMap
 * else → loan field directly
 */
export const getLoanFieldValue = (
  loan: any,
  key: string,
  ctx: { recoveryAgg?: Map<string, { total: number; lastAmt: number; lastDate: string }>; branchMap?: Map<string, string> }
): string | number => {
  if (key === 'recovered_amount') {
    const agg = ctx.recoveryAgg?.get(loan.id);
    return agg?.total || 0;
  }
  if (key === 'recovery_date') {
    const agg = ctx.recoveryAgg?.get(loan.id);
    return agg?.lastDate || '';
  }
  if (key === 'branch_code') {
    return ctx.branchMap?.get(loan.branch_id) || '';
  }
  const v = loan[key];
  return v == null ? '' : v;
};
