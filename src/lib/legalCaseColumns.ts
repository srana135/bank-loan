import { LegalCase, Lawyer, Loan } from '@/types';

// Canonical Bengali column order matching the prescribed report layout (image-based)
export const ALL_LEGAL_CASE_COLUMNS: Record<string, string> = {
  serial: 'ক্রমিক নং',
  case_type: 'মামলার ধরন',
  case_number: 'মামলার নম্বর',
  filing_date: 'মামলা দায়েরের তারিখ',
  parties: 'বাদী এবং বিবাদী',
  court_name: 'আমলী আদালত',
  lawyer_info: 'নিয়োজিত আইনজীবীর নাম ও মোবাইল',
  latest_status: 'মামলার সর্বশেষ অবস্থা',
  bank_action: 'ব্যাংক কর্তৃক গৃহীত সর্বশেষ পদক্ষেপ',
  other_banks: 'জড়িত অন্যান্য ব্যাংক',
  loan_classification: 'ঋণ হিসাবের শ্রেণীকৃতমান (SMA/SS/DF/BL)',
  claim_amount: 'মামলায় বিজড়িত অর্থ (লক্ষ টাকায়)',
  remarks: 'মন্তব্য',
};

export const CANONICAL_LEGAL_CASE_COLUMN_ORDER = Object.keys(ALL_LEGAL_CASE_COLUMNS);

// Bengali numeral conversion
export const toBengaliNumber = (n: number | string): string => {
  const map: Record<string, string> = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
  return String(n).split('').map(ch => map[ch] ?? ch).join('');
};

const fmtDate = (s: string | null | undefined) => {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-GB');
  } catch { return s as string; }
};

export interface LegalCaseFieldCtx {
  index: number; // zero-based row index
  lawyersMap?: Map<string, Lawyer>;
  loansMap?: Map<string, Loan>;
  latestOrderMap?: Map<string, { order_date: string; order_summary: string; next_date?: string | null }>;
}

export const getLegalCaseFieldValue = (
  c: LegalCase,
  key: string,
  ctx: LegalCaseFieldCtx
): string | number => {
  switch (key) {
    case 'serial':
      return toBengaliNumber(ctx.index + 1);
    case 'case_type':
      return c.case_type || '';
    case 'case_number':
      return c.case_number || '';
    case 'filing_date':
      return fmtDate(c.filing_date);
    case 'parties': {
      const p = c.plaintiff_name?.trim() || '';
      const d = c.defendant_name?.trim() || '';
      if (p && d) return `বাদী: ${p}\nবিবাদী: ${d}`;
      return p || d || '';
    }
    case 'court_name':
      return c.court_name || '';
    case 'lawyer_info': {
      if (!c.lawyer_id) return '';
      const lw = ctx.lawyersMap?.get(c.lawyer_id);
      if (!lw) return '';
      return lw.mobile ? `${lw.name}\n${lw.mobile}` : lw.name;
    }
    case 'latest_status': {
      const live = ctx.latestOrderMap?.get(c.id);
      const date = live?.order_date || c.latest_order_date;
      const summary = live?.order_summary || c.latest_order_summary;
      if (!summary && !date) return '';
      return [fmtDate(date), summary].filter(Boolean).join('\n');
    }
    case 'bank_action':
      return c.description?.trim() || c.remarks?.trim() || '';
    case 'other_banks':
      return '';
    case 'loan_classification': {
      if (!c.loan_id) return '';
      const ln = ctx.loansMap?.get(c.loan_id);
      return ln?.classification || '';
    }
    case 'claim_amount': {
      if (c.claim_amount == null) return '';
      // Convert to lakh (1 lakh = 100,000)
      const lakh = c.claim_amount / 100000;
      return lakh.toFixed(2);
    }
    case 'remarks':
      return c.remarks || '';
    default:
      return '';
  }
};
