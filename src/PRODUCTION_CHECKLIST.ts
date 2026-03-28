/**
 * ================================================================
 * LOAN MANAGEMENT APP — PRODUCTION CHECKLIST
 * ================================================================
 *
 * AUTH FLOW (src/contexts/AuthContext.tsx, src/pages/Login.tsx)
 * ✅ Real Supabase auth with signInWithPassword
 * ✅ Sign up creates auth user + profile via trigger
 * ✅ Session persisted via onAuthStateChange listener
 * ✅ Profile fetched after auth state change
 * ✅ Role derived from profiles table (admin/manager/employee)
 *
 * REGISTRATION REQUEST (src/pages/Login.tsx → register-request mode)
 * ✅ Form saves to registration_requests table
 * ✅ Does NOT grant access until admin approval
 * ✅ Clear success/error feedback
 *
 * ADMIN APPROVAL (src/pages/RegistrationRequests.tsx)
 * ✅ Lists pending/approved/rejected requests
 * ✅ Approve: assigns role + branch, activates profile
 * ✅ Reject: requires rejection reason
 * ✅ Status filter works
 *
 * USER MANAGEMENT (src/pages/UserManagement.tsx)
 * ✅ List, search, filter by role/branch/status
 * ✅ Create user via Supabase auth + profile update
 * ✅ Edit user: name, user_id, mobile, role, branch
 * ✅ Deactivate/reactivate toggle
 * ✅ Password reset via resetPasswordForEmail
 * ✅ Bulk import from Excel
 *
 * BRANCH MANAGEMENT (src/pages/BranchManagement.tsx)
 * ✅ CRUD operations on branches table
 * ✅ Location (lat/lng) and radius support
 *
 * BRANCH RESTRICTIONS
 * ✅ Manager sees only own-branch loans (useLoans hook filters by branch_id)
 * ✅ RLS policies enforce branch restriction at database level
 * ✅ Admin sees all branches
 *
 * LOAN CRUD (src/pages/LoanManagement.tsx)
 * ✅ Create loan with validated form (19 fields, Zod schema)
 * ✅ Edit loan (pre-filled form)
 * ✅ Delete loan with confirmation
 * ✅ Employee: view + comment only (no create/edit/delete buttons)
 * ✅ Manager: CRUD own branch loans
 * ✅ Admin: CRUD all loans
 *
 * LOAN IMPORT (src/components/loans/LoanImportDialog.tsx)
 * ✅ Template download with exact column headers
 * ✅ Excel upload with SheetJS parsing
 * ✅ Column validation
 * ✅ Row-by-row upsert by account_no
 * ✅ Result summary (total/success/failed/errors)
 * ✅ Logged to import_logs table
 *
 * FILTERS (src/components/loans/LoanFilters.tsx)
 * ✅ Account Name, Borrower Name, Address typeahead
 * ✅ Account Type, Account Status dropdowns
 * ✅ Classification checkboxes (STD/SMA/SS/DF/BL)
 * ✅ Instant filter updates on loan list + summary + SMS
 * ✅ Clear filters button
 *
 * COMMENTS (src/components/loans/LoanComments.tsx, useLoans.ts)
 * ✅ Per-loan comment thread in detail drawer
 * ✅ All roles can add comments
 * ✅ latest_comment updated on loan record
 * ✅ Bulk comment for selected/filtered loans
 * ✅ Realtime updates via postgres_changes
 *
 * MAP (src/pages/LoanMap.tsx)
 * ✅ Leaflet + OpenStreetMap tiles
 * ✅ Branch selector with center/circle
 * ✅ Classification-colored markers
 * ✅ Tooltip with full loan summary
 * ✅ Marker click opens detail drawer
 * ✅ Delete from map works, edit redirects to management
 *
 * SMS UTILITY (src/components/loans/SmsUtility.tsx)
 * ✅ Collects deduplicated numbers from filtered loans
 * ✅ Message textarea
 * ✅ Copy numbers button
 * ✅ Open sms: link button
 * ✅ Empty/invalid guards
 *
 * CLICK TO CALL
 * ✅ tel: links in loan detail drawer (borrower, guarantors)
 * ✅ tel: links in loan proposals table
 * ✅ tel: links on Connect Us page
 *
 * SERVICE FILE UPLOAD (src/pages/ServiceProductList.tsx)
 * ✅ Upload to Supabase Storage (documents bucket)
 * ✅ Metadata in service_files table
 * ✅ File type validation (image/pdf/doc)
 * ✅ 20MB size limit
 * ✅ Preview for images and PDFs
 * ✅ Download/open for all types
 * ✅ Delete for admin/manager
 * ✅ Graceful fallback if table not created
 *
 * EMI CALCULATOR (src/pages/EMICalculator.tsx)
 * ✅ 6 installment frequencies
 * ✅ Reducing balance + simple interest
 * ✅ Grace period (in-period/ex-period)
 * ✅ Upward rounding from app_settings
 * ✅ Amortization schedule table
 * ✅ Pie chart + line chart
 * ✅ PDF export
 *
 * DPS CALCULATOR (src/pages/DPSCalculator.tsx)
 * ✅ Monthly compound interest
 * ✅ TIN-based tax (10%/15%)
 * ✅ Excise duty from app_settings
 * ✅ Monthly breakdown table
 * ✅ PDF export
 *
 * FDR CALCULATOR (src/pages/FDRCalculator.tsx)
 * ✅ Simple/compound interest
 * ✅ Maturity/periodic payout modes
 * ✅ TIN-based tax + excise duty
 * ✅ Premature encashment with rate discount
 * ✅ PDF export
 *
 * LOAN ELIGIBILITY (src/pages/LoanEligibility.tsx)
 * ✅ DTI-based calculation using configurable rules
 * ✅ CMSME/Personal/Home Loan types with defaults
 * ✅ Save to loan_proposals table
 * ✅ Status flow: Proposed → In Progress → Disbursement / Rejected
 * ✅ Rejection requires comment
 * ✅ Rejected proposals PDF export
 * ✅ Graceful fallback if table not created
 *
 * CURRENCY CONVERTER (src/pages/CurrencyConverter.tsx)
 * ✅ Live rates from open.er-api.com
 * ✅ 10+ currencies (USD, SAR, AED, EUR, GBP, etc.)
 * ✅ Swap currencies
 * ✅ Rate timestamp display
 * ✅ Loading/error states
 *
 * APP SETTINGS (src/pages/AppSettings.tsx)
 * ✅ Admin-only CRUD on app_settings table
 * ✅ JSON value editor
 * ✅ Used by calculators for tax rates, excise slabs, eligibility rules
 *
 * REALTIME (src/hooks/useLoans.ts)
 * ✅ loans table: postgres_changes subscription
 * ✅ loan_comments: per-loan subscription
 * ✅ Query invalidation on change events
 *
 * RLS POLICIES (supabase-migration.sql)
 * ✅ Admin: full access all tables
 * ✅ Manager: branch-restricted loan CRUD
 * ✅ Employee: read loans, insert comments
 * ✅ Security definer functions for role checks
 * ✅ Service files: admin/manager upload, all read
 * ✅ App settings: admin only
 *
 * FIRST ADMIN BOOTSTRAP
 * After running migration, register first user, then:
 * UPDATE public.profiles SET role = 'admin', is_active = true WHERE email = 'your@email.com';
 *
 * ================================================================
 */
export {};
