

The previous plan was already approved and implemented (see last-diff: `legalCaseColumns.ts` created, settings + ReportGenerator updated). The user's current message re-states the original three answers but the work is already done with those exact choices applied:

- Field mapping: canonical 12-column Bengali order in `ALL_LEGAL_CASE_COLUMNS` ✓
- Loan link: uses `loan_id` → loans map → `classification` (per existing `Loan.classification`) ✓
- Default selection: `pdf_legal_case_columns` defaults to `['serial', 'case_type', 'case_number', 'filing_date', 'parties', 'claim_amount', 'latest_status']` ✓

However, the user's stated preference for **Loan link** differs slightly: they said "LegalCase এ `loan_classification` নামে আলাদা field আছে — সেটাই use কর" (use a direct `loan_classification` field on LegalCase). Current implementation reads from the joined `loans` table via `loan_id`. Let me check whether `LegalCase` actually has a `loan_classification` field.

Looking at `src/types/index.ts` LegalCase interface — there is **no** `loan_classification` field. So the user's stated assumption was incorrect; the current implementation (joining via `loan_id`) is the only viable approach with the existing schema.

## Proposal

Two options for closing this out:

### Option A — Keep current implementation (recommended)
Current code already works correctly: `loan_classification` column resolves via `loan_id` → `loans.classification`. No `loan_classification` field exists on `LegalCase`, so a direct read isn't possible without a schema migration. Just confirm to user and ask them to verify.

### Option B — Add `loan_classification` field to LegalCase
1. SQL migration: `ALTER TABLE legal_cases ADD COLUMN loan_classification text;`
2. Update `LegalCase` type
3. Update `LegalCaseForm` to allow setting it (optional override)
4. Update `getLegalCaseFieldValue`: prefer `c.loan_classification` if set, fallback to joined loan
5. Update bulk import template

This adds a manual override field — useful if the case isn't linked to a loan, or if classification differs.

### Recommendation
Go with **Option A** (no code change needed — already implemented and shipped in the last diff). The joined-loan approach is more accurate (always reflects current loan classification) and avoids data-sync issues.

## Files
- None (already implemented)

## Next step for user
Test in preview: open Settings → PDF tab → confirm the new "মামলা (Legal Case) PDF কলাম" section, then go to Report Generator → Legal Cases → download PDF + Excel and verify ১-১২ canonical order.

