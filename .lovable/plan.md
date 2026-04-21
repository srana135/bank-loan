

## পরিকল্পনা: Legal ↔ Loan ক্রস-লিংক + Expired Loan Filter + Badge

### 1. Legal Management (মামলা/নোটিশ) — Linked Account ক্লিকেবল

**File:** `src/pages/LegalManagement.tsx`

- **Cases tab (mobile card + desktop table)**:  
  Linked loan-এর `account_no` / borrower name দেখানো cell-গুলো ক্লিকেবল link হবে। ক্লিক করলে `LoanDetailDrawer` ওপেন হবে same page-এ।
- **Notices tab**: একইভাবে account_no ক্লিকেবল হবে → matching `loan_id` থেকে loan খুঁজে drawer ওপেন।
- নতুন state: `const [linkedLoan, setLinkedLoan] = useState<Loan | null>(null)`; সাথে `<LoanDetailDrawer />` import করে render করা হবে (read-only mode — `onEdit`/`onDelete` no-op)।
- Row-এর existing case-detail click event-কে disrupt না করার জন্য account cell-এ `onClick={e => { e.stopPropagation(); setLinkedLoan(loan); }}`।

### 2. Loan Management — Notice/Case Badge

**Files:** `src/pages/LoanManagement.tsx`, `src/components/loans/LoanFilters.tsx`

- নতুন hook ব্যবহার: `useLegalNotices(branchFilter)` import করে।
- `loanNoticeMap`: `Map<loan_id, { count, latestType }>` build করা হবে।
- বর্তমান `loanCaseMap` ইতিমধ্যে আছে।
- **Table row + mobile card**-এ borrower name-এর পাশে badge দেখাব:
  - 🔴 `মামলা` (case থাকলে) — ক্লিকে `/legal?case=<id>` (existing query-param handler ইতিমধ্যে কাজ করছে)
  - 🟡 `নোটিশ` (notice থাকলে) — ক্লিকে `/legal?notice=<id>` (নতুন handler add করতে হবে — Plan §5)

### 3. Filter অংশে "Expired Loan" Checkbox

**Files:** `src/hooks/useLoans.ts`, `src/components/loans/LoanFilters.tsx`

- `LoanFilters` interface-এ যোগ: `expiredOnly: boolean`
- `defaultFilters`-এ: `expiredOnly: false`
- `applyFilters`-এ logic: যদি `expiredOnly=true`, শুধু সেই loans যেগুলোর `expiry_date < today` রাখা হবে। সাথে `expiry_date asc` sort (most expired first)।
- `LoanFilters.tsx`-এ Classification checkbox group-এর পাশে আরেকটা checkbox: **"Expired Loan"** label সহ। Active filter tag-এও দেখাবে।

### 4. Loan Detail Drawer — Linked Case/Notice Section

**File:** `src/components/loans/LoanDetailDrawer.tsx`

- নতুন props: `legalCases?: LegalCase[]; legalNotices?: LegalNotice[]; onOpenCase?: (id: string) => void; onOpenNotice?: (id: string) => void;`
- Drawer-এর Guarantors section-এর নিচে নতুন একটা section **"Legal Records"**:
  - Filter: `legalCases.filter(c => c.loan_id === loan.id)` এবং একই notices-এর জন্য
  - প্রতিটা item একটা ক্লিকেবল card — case হলে: `case_number · case_type · status` + next date; notice হলে: `notice_type · sent_date · receipt_status`
  - ক্লিক করলে drawer close হয়ে navigate: `navigate('/legal?case=<id>')` বা `?notice=<id>`
- কোনো record না থাকলে section hide।

### 5. Notice Auto-Open Support (`?notice=<id>`)

**File:** `src/pages/LegalManagement.tsx`

- বর্তমান `?case=<id>` handler-এর pattern follow করে নতুন `useEffect` যা `notices` load হলে `?notice=<id>` খুঁজে notice tab-এ switch করে detail drawer/edit dialog খুলবে। (Notices-এর জন্য আলাদা detail drawer নেই — তাই `openEditNotice(found)` call করব যা existing edit dialog ব্যবহার করে।)

### আচরণ সারাংশ

| Feature | Result |
|---|---|
| Legal cases-এ account number ক্লিক | Loan detail drawer খোলে |
| Legal notices-এ account number ক্লিক | Loan detail drawer খোলে |
| Loan যার case/notice আছে | Borrower-এর পাশে badge |
| Badge ক্লিক | Legal page-এ ওই case/notice খোলে |
| Filter → Expired Loan ✓ | শুধু expired loans, sorted oldest first |
| Loan detail-এ "Legal Records" section | Linked case + notice list, ক্লিকেবল |

### প্রভাবিত ফাইল

1. `src/pages/LegalManagement.tsx` — clickable account cells, notice auto-open, embed `LoanDetailDrawer`
2. `src/pages/LoanManagement.tsx` — notice map, badges in row/card, pass legal data to drawer
3. `src/components/loans/LoanDetailDrawer.tsx` — new "Legal Records" section + props
4. `src/components/loans/LoanFilters.tsx` — Expired Loan checkbox + active tag
5. `src/hooks/useLoans.ts` — `expiredOnly` field + filter logic + sort

