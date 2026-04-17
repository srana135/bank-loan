

## Goal
Settings এ "মামলা (Legal Case) PDF কলাম" section যোগ করা, ছবিতে দেখানো ১২-কলাম Bengali serial layout অনুযায়ী Report Generator থেকে PDF + Excel generate করা। User checkbox এ যেভাবেই select করুক — output সর্বদা canonical order এ থাকবে।

## Image-based canonical column order

| # | Bengali header | Source field |
|---|---|---|
| ১ | ক্রমিক নং | auto serial |
| ২ক | মামলার ধরন | `case_type` |
| ২খ | মামলার নম্বর | `case_number` |
| ৩ | মামলা দায়েরের তারিখ | `filing_date` |
| ৪ | বাদী এবং বিবাদী | `plaintiff_name` + `defendant_name` (one cell, two lines) |
| ৫ | আমলী আদালত | `court_name` |
| ৬ | নিয়োজিত আইনজীবীর নাম ও মোবাইল | lawyer.name + lawyer.mobile (lookup via `lawyer_id`) |
| ৭ | মামলার সর্বশেষ অবস্থা | latest entries from `legal_case_orders` (date + summary) |
| ৮ | ব্যাংক কর্তৃক গৃহীত সর্বশেষ পদক্ষেপ | `description` (or remarks if empty) |
| ৯ | জড়িত অন্যান্য ব্যাংক | new optional field — fallback "-" |
| ১০ | ঋণ হিসাবের শ্রেণীকৃতমান (SMA/SS/DF/BL) | linked loan via `loan_id` → `classification` |
| ১১ | মামলায় বিজড়িত অর্থের পরিমান | `claim_amount` (lakh format) |
| ১২ | মন্তব্য | `remarks` |

Missing/null fields → blank cell (column order preserved)।

## Implementation

### 1. New file `src/lib/legalCaseColumns.ts`
- `ALL_LEGAL_CASE_COLUMNS` map (key → Bengali label) in canonical order।
- `CANONICAL_LEGAL_CASE_COLUMN_ORDER = Object.keys(...)`।
- `getLegalCaseFieldValue(caseRow, key, ctx)` resolves loan classification, lawyer info, latest order, parties combination।

### 2. `src/hooks/useAppSettings.ts`
- Add `pdf_legal_case_columns: string[]` to `AppSettingsMap` + DEFAULTS (all 12 selected by default)।

### 3. `src/pages/AppSettings.tsx` → "PDF" tab
- Loan PDF column section এর নিচে নতুন "মামলা (Legal Case) PDF কলাম" section।
- Checkbox list iterating `ALL_LEGAL_CASE_COLUMNS` in canonical order।
- "Select All / Clear All" buttons।
- Save → upsert `pdf_legal_case_columns`।

### 4. `src/pages/ReportGenerator.tsx` — "Legal Cases" report
- Add queries: `useLawyers()`, `useLoans()` (for classification), bulk `legal_case_orders` (latest-per-case map — same pattern as LegalManagement)।
- Compute `legalCaseExportColumns = CANONICAL_LEGAL_CASE_COLUMN_ORDER.filter(k => settings.pdf_legal_case_columns.includes(k))` → **always canonical order**, selection only filters in/out।
- **PDF (jsPDF + autoTable)**:
  - Landscape A4
  - Title row (merged): "ব্যাংক/আর্থিক প্রতিষ্ঠানের মামলা সংক্রান্ত বিবরণী"
  - Subtitle: "{dateTo} তারিখ ভিত্তিক"
  - Table: header row (Bengali labels) + numbered serial row (১,২,৩...) + data rows
  - Header repeats per page; title only on page 1
- **Excel (xlsx)**:
  - Single sheet, merged title row at top, merged subtitle row, header row, data rows, optional totals
  - Cell-by-cell mapping using `getLegalCaseFieldValue`

### 5. Bengali numerals helper
Reuse existing or add small `toBengaliNumber(n)` utility for serial column।

## Files
- `src/lib/legalCaseColumns.ts` — new
- `src/hooks/useAppSettings.ts` — add setting key + default
- `src/pages/AppSettings.tsx` — add checkbox section in PDF tab
- `src/pages/ReportGenerator.tsx` — rewrite legal-cases PDF + Excel using new column system

## Notes
- "জড়িত অন্যান্য ব্যাংক" column — DB তে field নেই, blank দেখাবে। পরে চাইলে schema এ add করা যাবে।
- Selection order উপেক্ষা করা হবে — output সর্বদা canonical (image) order।
- Security/RLS unchanged।

