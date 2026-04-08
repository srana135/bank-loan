
# Feature Implementation Plan

## 1. Activity/Audit Log
- **DB Migration**: Create `activity_logs` table (id, user_id, user_name, action, entity_type, entity_id, details, created_at)
- **Hook**: `useActivityLogs` — fetch logs with filters
- **Helper**: `logActivity()` function to insert log entries
- **UI**: New "Activity Log" tab in Admin Dashboard with search, date filter, entity type filter
- **Integration**: Add `logActivity()` calls in existing hooks (useLoans, useLegal, useRecoveries)

## 4. Report Generator
- **New Page**: `src/pages/ReportGenerator.tsx`
- **Route**: `/reports` (protected)
- **Features**: 
  - Date range picker (from/to)
  - Branch filter
  - Report types: Loan Summary, Recovery Report, Legal Case Report, Aging Report
  - Generate PDF with jsPDF
  - Export Excel with XLSX
- **Navigation**: Add to Layout menu

## 5. Loan Status Timeline
- **Component**: `src/components/loans/LoanTimeline.tsx`
- **Data**: Combine comments, recoveries, and loan creation into a chronological timeline
- **UI**: Vertical timeline with icons per event type (comment, recovery, status change)
- **Integration**: Add as a tab in LoanDetailDrawer

## 10. Loan Aging Analysis
- **Component**: `src/components/loans/LoanAgingAnalysis.tsx`
- **Buckets**: 0-30, 31-60, 61-90, 91-180, 181-365, 365+ days overdue
- **UI**: Table + summary cards showing count and amount per bucket
- **Integration**: Add to LoanManagement page and Dashboard

## 12. Automated Classification Suggestion
- **Component**: `src/components/loans/ClassificationSuggestion.tsx`
- **Logic**: Read `loan_classification_days` from app_settings, compare with loan's overdue_days
- **UI**: Badge/alert showing suggested classification if different from current
- **Integration**: Show in loan list and loan detail

## 13. User Activity Status
- **DB Migration**: Add `last_login_at` column to profiles
- **Auth Integration**: Update `last_login_at` on login in AuthContext
- **UI**: Show last login time in User Management table, online/offline indicator
- **Admin Dashboard**: Show recently active users

## Database Migration (Single SQL)
```sql
-- Activity logs table
CREATE TABLE activity_logs (...)
-- Add last_login_at to profiles
ALTER TABLE profiles ADD COLUMN last_login_at TIMESTAMPTZ
```

## Files to Create
- `src/hooks/useActivityLogs.ts`
- `src/components/loans/LoanTimeline.tsx`
- `src/components/loans/LoanAgingAnalysis.tsx`
- `src/components/loans/ClassificationSuggestion.tsx`
- `src/pages/ReportGenerator.tsx`

## Files to Edit
- `src/pages/AdminDashboard.tsx` — Add Activity Log tab, User status
- `src/pages/LoanManagement.tsx` — Add aging analysis, classification suggestion
- `src/components/loans/LoanDetailDrawer.tsx` — Add timeline tab
- `src/components/Layout.tsx` — Add Reports nav item
- `src/App.tsx` — Add /reports route
- `src/contexts/AuthContext.tsx` — Update last_login
- `src/pages/UserManagement.tsx` — Show last login
- `src/hooks/useLoans.ts` — Add logActivity calls
- `src/pages/Index.tsx` — Add aging summary to dashboard
- Migration SQL file
