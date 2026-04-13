

# Proposed Date কলামে Recovery Status দেখানো

## বর্তমান অবস্থা
- **Proposed** কলামে শুধু `latest_proposed_date` তারিখ দেখায়
- কোনো Recovery হয়েছে কিনা সেটার কোনো ইন্ডিকেশন নেই

## কী করবো
Proposed কলামে তারিখের পাশে Recovery status দেখাবো:
- **✅ Recovered** — যদি proposed date এর পরে recovery রেকর্ড থাকে (সবুজ ব্যাজ)
- **⏳ Pending** — যদি proposed date আছে কিন্তু recovery হয়নি (হলুদ ব্যাজ)  
- **🔴 Overdue** — যদি proposed date পার হয়ে গেছে এবং recovery হয়নি (লাল ব্যাজ)

## পরিবর্তন

### 1. `LoanManagement.tsx`
- `useAllRecoveries` হুক ইম্পোর্ট করে সব recovery ডাটা আনবো
- প্রতিটি loan এর জন্য recovery status ক্যালকুলেট করবো (proposed date vs recovery date তুলনা)
- Proposed কলামে তারিখের নিচে ছোট Badge দিয়ে status দেখাবো
- Mobile card ভিউতেও একই status দেখাবো

### 2. Status Logic
```text
if (no proposed_date) → show "-"
if (has recovery after proposed_date) → "Recovered" (green)
if (proposed_date > today) → "Pending" (yellow)  
if (proposed_date <= today & no recovery) → "Overdue" (red)
```

এতে Loan Management টেবিলে এক নজরে বোঝা যাবে কোন লোনের proposed date এর বিপরীতে recovery হয়েছে, কোনটা pending, কোনটা overdue।

