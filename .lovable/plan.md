

# Complete Project Audit & Enhancement Plan
## Steady Loan Aid — Bangladesh Development Bank PLC

---

## PART A: Current State Audit (What's Working)

| Module | Status | Notes |
|--------|--------|-------|
| Auth (Login/Signup/Reset/Registration Request) | Working | Supabase Auth integrated |
| Admin Dashboard | Working | Tabs: Requests, Users, Branches, Settings |
| Loan Management (CRUD) | Working | Search, filters, bulk ops, import/export |
| Loan Map View | Working | Leaflet map with branch filter |
| EMI Calculator | Working | Reducing/simple interest, grace period, disbursement date |
| DPS/FDR Calculators | Working | Basic financial calcs |
| Loan Eligibility | Working | DTI-based calc, proposals, PDF export |
| Currency Converter | Working | |
| Services/Upload | Working | File upload to Supabase Storage |
| Connect Us | Working | Contact info + map |
| RLS & Role System | Working | admin/manager/employee with security definer |
| Realtime | Working | postgres_changes for loans |

---

## PART B: Issues Found & Required Fixes

### 1. Login Page — Remove Test Credentials & Redesign
- **Problem**: Login page exposes test account credentials (emails + passwords) publicly. This is a security risk.
- **Fix**: Remove the entire "Development Test Accounts" panel (lines 286-336 in Login.tsx). Redesign the login card with a cleaner, more professional look — add a branded hero illustration/gradient on the left side for desktop, keep card-only on mobile.

### 2. Loan Eligibility — Add Interest Rate & Tenure Input
- **Problem**: Currently uses hardcoded default rates (9%, 12%, 9.5%) and max tenure from `DEFAULT_RULES`. User cannot override.
- **Fix**: Add two new input fields to the eligibility form — `interestRate` (number) and `tenure` (number in months). Pre-fill from `DEFAULT_RULES` based on selected loan type, but allow manual override. Update the `calculate()` function to use user-provided values.

### 3. User Management — Admin-Only Full Control + Hide Admin from Non-Admins
- **Problem**: Currently all users in the profiles table are visible to anyone who can access User Management. No delete capability exists.
- **Fix**:
  - Add a **Delete User** button (admin-only) that deactivates + optionally removes the profile.
  - Filter the profiles list: non-admin users should NOT see admin profiles in the list.
  - Only admin can edit/update/deactivate/delete. Manager and employee see read-only view (or no access at all — currently protected by route).
  - Add email update capability for admin.
  - **Database**: Add an RLS policy or apply client-side filter to hide admin profiles from non-admin users. The `ProtectedRoute` already restricts `/admin` to admin role, so User Management is already admin-only.

### 4. Mobile Responsive — Card-Based Rich Design
- **Problem**: Tables on mobile are horizontal-scrolling which is hard to use. Loan Management, User Management, Proposals all use `<Table>` which isn't mobile-friendly.
- **Fix**: For screens < 768px (md breakpoint), render **card-based layouts** instead of tables:
  - **Loan Management**: Each loan as a card showing borrower name, account no, outstanding, classification badge, overdue info, and action buttons.
  - **User Management**: Each user as a card with avatar initial, name, role badge, branch, status, and action icons.
  - **Loan Eligibility Proposals**: Each proposal as a card with customer name, type, amount, status badge, and action buttons.
  - Cards should be information-rich with key data visible at a glance.

---

## PART C: Enhancement Features Plan

### 5. Dashboard Improvements
- Add **date-range filter** for loan stats on the homepage dashboard.
- Add **quick action buttons** (Add Loan, Check Eligibility, View Map) as floating cards.
- Show **overdue summary** (total overdue amount, count of overdue accounts).

### 6. Loan Management Enhancements
- **Loan Detail Page**: Instead of just a drawer, allow a full-page detail view with complete history, all comments, and edit capability.
- **Loan Status Timeline**: Visual timeline showing status changes.
- **Overdue Alerts**: Highlight loans with overdue > 3 installments in red.
- **Print Individual Loan**: Print a single loan's details as a formatted document.

### 7. Notification System
- **In-app notifications** for: new registration requests (admin), loan status changes, comment mentions.
- Badge count on the bell icon in header.
- Requires a `notifications` table in Supabase.

### 8. Activity/Audit Log
- Track who did what (created loan, approved request, changed role, etc.).
- Visible to admin in a new "Activity Log" tab in Admin Dashboard.
- Requires an `activity_logs` table.

### 9. Profile Page
- Allow users to update their own name, mobile, password.
- Show their branch info and role (read-only).
- Avatar upload support.

### 10. Dark Mode Toggle
- Add a theme toggle button in the header.
- The CSS already has dark mode variables defined.

---

## PART D: Implementation Plan (Priority Order)

### Phase 1 — Critical Fixes (Immediate)
| Step | Task | Files |
|------|------|-------|
| 1 | Remove test credentials from Login page, redesign with clean professional look | `Login.tsx` |
| 2 | Add Interest Rate & Tenure inputs to Loan Eligibility calculator | `LoanEligibility.tsx` |
| 3 | Admin-only controls in User Management (delete user, hide admin profiles from non-admins) | `UserManagement.tsx` |

### Phase 2 — Mobile UX Overhaul
| Step | Task | Files |
|------|------|-------|
| 4 | Create reusable mobile card components for Loan, User, Proposal lists | New components in `src/components/` |
| 5 | Add responsive breakpoint logic — show cards on mobile, tables on desktop | `LoanManagement.tsx`, `UserManagement.tsx`, `LoanEligibility.tsx` |
| 6 | Improve mobile navigation and touch targets | `Layout.tsx` |

### Phase 3 — Feature Enhancements
| Step | Task | Files |
|------|------|-------|
| 7 | User profile page with self-edit capability | New `Profile.tsx` page |
| 8 | Dark mode toggle | `Layout.tsx`, `index.css` |
| 9 | Overdue alerts and enhanced dashboard stats | `Index.tsx` |
| 10 | Activity log system | New migration, new components |

### Database Changes Needed
- **No new tables required** for Phase 1 and 2.
- Phase 3 may need: `notifications` table, `activity_logs` table (via Supabase SQL Editor migrations).

### Technical Details
- Mobile card views will use `useIsMobile()` hook (already exists in `src/hooks/use-mobile.tsx`) to conditionally render cards vs tables.
- Login redesign: split-screen layout on desktop (gradient left + form right), single card on mobile.
- User Management delete: will use `supabase.from('profiles').delete()` with confirmation dialog. Admin auth check enforced by existing RLS.
- Interest rate/tenure fields: add to Zod schema, pre-fill via `useEffect` on loan type change, pass to `calculate()`.
- All changes are client-side code only — Supabase is already connected and configured.

