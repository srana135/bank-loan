## পরিকল্পনা: ফারায়েজ + আনা-গন্ডা ক্যালকুলেটর যোগ করা

### লক্ষ্য
`/emi-calculator/eligibility` পেজে (`LoanEligibility.tsx`) eligibility section-এর **ঠিক উপরে** দুটি নতুন স্বাধীন ক্যালকুলেটর যোগ করা — Islamic Faraid (উত্তরাধিকার) এবং Traditional Ana-Gonda-Kora-Kranti-Til (জমি ভাগ)।

### নতুন ফাইল

**১. `src/components/calculators/FaraidCalculator.tsx`**
- Title: "☪️ ইসলামী ফারায়েজ উত্তরাধিকার ক্যালকুলেটর"
- Inputs:
  - মোট সম্পদ (number, টাকা/জমি মূল্য)
  - স্বামী (checkbox)
  - স্ত্রী (checkbox + count 1‑4)
  - পিতা, মাতা (checkbox)
  - পুত্র, কন্যা সংখ্যা (number 0+)
  - দাদা, দাদি, নানি (checkbox)
  - সহোদর ভাই/বোন, বৈমাত্রেয় ভাই/বোন, বৈপিত্রেয় ভাই/বোন (number 0+)
  - পুত্রের কন্যা (checkbox + count)
- ফারায়েজ ইঞ্জিন (`calculateFaraid` helper):
  - Step 1 — Fixed shares (Quranic):
    - স্বামী: কন্যা/পুত্রের কন্যা না থাকলে 1/2, থাকলে 1/4
    - স্ত্রী: 1/4 বা 1/8 (সন্তান থাকলে); একাধিক স্ত্রী হলে নিজেদের মধ্যে সমান
    - পিতা: পুত্র/পুত্রের কন্যা থাকলে 1/6 fixed; কন্যা থাকলে 1/6 + residue; কেউ না থাকলে শুধু residuary
    - মাতা: ভাইবোন ≥2 বা সন্তান থাকলে 1/6, না হলে 1/3 (Umariyatain ক্ষেত্রে স্বামী/স্ত্রী + পিতা থাকলে 1/3 of remainder — সরল রূপে handle)
    - কন্যা: একা 1/2, একাধিক 2/3, পুত্র থাকলে residuary (2:1)
    - পুত্রের কন্যা: কন্যা না থাকলে 1/2 বা 2/3, এক কন্যা থাকলে 1/6
    - সহোদর বোন: কন্যা/পুত্র/পিতা না থাকলে 1/2 বা 2/3
    - বৈপিত্রেয় ভাইবোন: এক হলে 1/6, একাধিক 1/3 সমান বণ্টন
    - দাদি/নানি: 1/6 (ভাগ করে)
  - Step 2 — Asabah (residuary): পুত্র (2:1 কন্যার সাথে), পিতা, দাদা, সহোদর ভাই (2:1 বোনের সাথে), বৈমাত্রেয় ভাই
  - Step 3 — 'Awl: যদি total fixed shares > 1, proportionally কমানো
  - Step 4 — Radd: residuary না থাকলে surplus স্বামী/স্ত্রী বাদে fixed heirs-এ ফেরত
- Output:
  - মোট সম্পদ
  - প্রতিটি heir-এর share: টাকা + শতাংশ
  - Residuary (আসাবাহ) আলাদা label
  - প্রযোজ্য আয়াতের তালিকা (যেমন "স্বামী/স্ত্রী — সূরা আন-নিসা ৪:১২", "পুত্র-কন্যা ৪:১১", "কালালা ৪:১৭৬")
  - নোট: "বণ্টনের পূর্বে ঋণ পরিশোধ ও ওসিয়ত (১/৩ পর্যন্ত) আদায় করতে হবে।"

**২. `src/components/calculators/AnaGonaCalculator.tsx`**
- Title: "🌾 ট্রেডিশনাল আনা-গন্ডা-কড়া-ক্রান্তি-তিল ক্যালকুলেটর"
- Fixed: 1 সতক = 16 আনা; 1 আনা = 4 গন্ডা = 16 কড়া = 64 ক্রান্তি = 256 তিল (1 সতক = 4096 তিল)
- Input: মোট জমি (সতক, decimal)
- পাঁচটি unit selector — প্রতিটিতে symbol button row + synced number input:
  - আনা (0‑16): symbols `০ ৷ ৵ ৶ ৷ ৷⁄ ৷৵ ৷৶ ৷৷ ৷৷⁄ ৷৷৵ ৷৷৶ ৸ ৸⁄ ৸৵ ৸৶ ১`
  - গন্ডা (0‑3): digits `০ ১ ২ ৩`
  - কড়া (0‑3): symbols `০ ৷ ৷৷ ৸`
  - ক্রান্তি (0‑2): symbols `০ ৴ ৴৴`
  - তিল (0‑3): digits `০ ১ ২ ৩`
- Compute: `selectedTil = ana*256 + gonda*64 + kora*16 + kranti*4 + til`
- `selectedSatak = totalSatak * selectedTil / 4096`
- `remainingSatak = totalSatak − selectedSatak`
- দুটি card: "নির্বাচিত অংশ" ও "অবশিষ্ট অংশ" — symbolic representation, সতক, শতাংশ
- Warning যদি selected > total
- Footnote: "স্থির সম্পর্ক: ১ সতক = ১৬ আনা | ১ আনা = ৪ গন্ডা = ১৬ কড়া = ৬৪ ক্রান্তি = ২৫৬ তিল"

### থিম ক্লাস
দুটিই Tailwind inline classes ব্যবহার করবে নির্দিষ্ট রঙে (existing UI kit-এ এই রঙগুলো নেই তাই hex দিয়ে arbitrary values):
- Page bg: `bg-[#1b4d2e]` wrapper
- Card: `bg-[#fef7e8] text-[#1b4d2e]`
- Header: `bg-[#b87a48] text-white`
- Default button: `bg-[#fff3e6] border border-[#b48752] text-[#1b4d2e]`
- Active button: `bg-[#b87a48] text-white border-[#b48752]`
- Bengali symbol রেন্ডারের জন্য `font-mono` + `font-["Noto_Sans_Bengali",monospace]` fallback

### Edge cases
- মোট সম্পদ ≤ 0 → শুধু validation message
- কোনো heir select না হলে → "অন্তত একজন উত্তরাধিকারী নির্বাচন করুন"
- Faraid: পুত্র + কন্যা থাকলে কন্যার fixed share বাতিল হয়ে residuary
- Ana-Gona: প্রতিটি unit তার range-এর বাইরে গেলে clamp; total > 4096 til হলে warning
- শূন্য জমি/0 til selected → 0 দেখাবে error ছাড়া

### Integration — `src/pages/LoanEligibility.tsx`
- Top-এ import:
  ```ts
  import FaraidCalculator from '@/components/calculators/FaraidCalculator';
  import AnaGonaCalculator from '@/components/calculators/AnaGonaCalculator';
  ```
- Render-এর শুরুতে (line 229, container `<div>`-এর ভেতরে eligibility Tabs/Card-এর **আগে**):
  ```tsx
  <div className="space-y-6">
    <FaraidCalculator />
    <AnaGonaCalculator />
  </div>
  ```
- বাকি eligibility UI অপরিবর্তিত থাকবে।

### প্রভাবিত ফাইল
1. **নতুন:** `src/components/calculators/FaraidCalculator.tsx`
2. **নতুন:** `src/components/calculators/AnaGonaCalculator.tsx`
3. **সম্পাদিত:** `src/pages/LoanEligibility.tsx` — শুধু ২টি import + ২টি component eligibility section-এর উপরে যোগ

### আচরণ সারাংশ
| Component | Input | Output |
|---|---|---|
| Faraid | মোট সম্পদ + heir selection | প্রতি heir-এর শেয়ার (৳ + %), Asabah label, applied verses, debt/will note |
| Ana-Gona | মোট সতক + 5 unit (symbol/number sync) | নির্বাচিত ও অবশিষ্ট সতক/শতাংশ, symbolic form, range warning |
