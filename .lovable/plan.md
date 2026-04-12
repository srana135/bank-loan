

# Disbursed Amount ও Disbursement Date এড করার পদ্ধতি

## বর্তমান অবস্থা

- **Database**: `loans` টেবিলে `disbursement_date` ও `disbursed_loan_amount` কলাম আগেই আছে (migration-v2 এ যোগ করা হয়েছে)।
- **Types**: `Loan` টাইপে এই দুটি ফিল্ড আগেই আছে।
- **Detail Drawer**: ইতিমধ্যে এই দুটি ফিল্ড দেখাচ্ছে (line 107-108), কিন্তু ড্যাশ (`-`) দেখাচ্ছে কারণ ডাটা নেই।
- **LoanForm**: ফর্মে এই দুটি ফিল্ড **নেই** — তাই Edit করার সময় এগুলো ইনপুট দেওয়া যাচ্ছে না।

## সমাধান

`LoanForm.tsx` এ দুটি নতুন ফিল্ড যোগ করতে হবে:

1. **Zod Schema তে যোগ করা**:
   - `disbursed_loan_amount: z.coerce.number().min(0).optional()`
   - `disbursement_date: z.string().optional().default('')`

2. **Default Values এ যোগ করা**:
   - `disbursed_loan_amount: loan?.disbursed_loan_amount ?? undefined`
   - `disbursement_date: loan?.disbursement_date || ''`

3. **Form UI তে ফিল্ড রেন্ডার করা** (Financial সেকশনে):
   - Disbursed Amount — number input
   - Disbursement Date — date input

এটাই যথেষ্ট। Database, types, এবং detail drawer সব আগে থেকেই রেডি — শুধু ফর্মে ইনপুট ফিল্ড যোগ করলেই কাজ হবে।

