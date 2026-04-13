

# Proposed Date — Comment Sync Fix + Inline Quick Edit

## পরিবর্তন ১: Comment Edit Sync Fix (`useLoans.ts`)

`useUpdateComment` হুকে comment এর `proposed_repayment_date` এডিট করলে `loans` টেবিলের `latest_proposed_date` ও আপডেট হবে। এর জন্য mutation এ `loan_id` প্যারামিটার যোগ করতে হবে এবং সর্বশেষ proposed date খুঁজে loans টেবিল আপডেট করতে হবে।

`useDeleteComment` এও একই লজিক — কমেন্ট ডিলিট হলে বাকি কমেন্টগুলো থেকে সর্বশেষ proposed date বের করে loans টেবিল আপডেট করবে।

## পরিবর্তন ২: Inline Quick Edit (`LoanManagement.tsx`)

Proposed কলামে তারিখের পাশে ছোট Edit আইকন বাটন থাকবে। ক্লিক করলে inline date input দেখাবে — সেভ করলে সরাসরি `loans.latest_proposed_date` আপডেট হবে।

## ফাইল পরিবর্তন

### `src/hooks/useLoans.ts`
- **useUpdateComment**: `loan_id` প্যারামিটার যোগ। আপডেটের পর ঐ loan এর সব কমেন্ট থেকে সর্বশেষ `proposed_repayment_date` বের করে `loans.latest_proposed_date` আপডেট।
- **useDeleteComment**: `loan_id` প্যারামিটার যোগ। ডিলিটের পর একই sync লজিক।
- `loans` query ও invalidate করবে।

### `src/components/loans/LoanComments.tsx`
- `handleSaveEdit` এ `loan_id` পাস করবে `updateComment.mutateAsync` তে।
- `handleDelete` এ `loan_id` পাস করবে `deleteComment.mutateAsync` তে।

### `src/pages/LoanManagement.tsx`
- Proposed কলামে (desktop ও mobile) inline edit state যোগ।
- Edit icon → date input → Save/Cancel বাটন।
- সেভ করলে `useUpdateLoan` দিয়ে `latest_proposed_date` সরাসরি আপডেট।

