/**
 * Islamic Faraid (Inheritance) Calculator
 * Based on Quran: Surah An-Nisa 4:11, 4:12, 4:176
 * Implements fixed shares (Furud), residuary (Asabah), 'Awl, and Radd.
 */
import { useState, useMemo } from 'react';

type Heirs = {
  husband: boolean;
  wife: boolean; wifeCount: number;
  father: boolean;
  mother: boolean;
  sons: number;
  daughters: number;
  paternalGrandfather: boolean;
  paternalGrandmother: boolean;
  maternalGrandmother: boolean;
  fullBrothers: number;
  fullSisters: number;
  consanguineBrothers: number;
  consanguineSisters: number;
  uterineBrothers: number;
  uterineSisters: number;
  sonsDaughter: boolean; sonsDaughterCount: number;
};

const DEFAULT: Heirs = {
  husband: false, wife: false, wifeCount: 1,
  father: false, mother: false,
  sons: 0, daughters: 0,
  paternalGrandfather: false, paternalGrandmother: false, maternalGrandmother: false,
  fullBrothers: 0, fullSisters: 0,
  consanguineBrothers: 0, consanguineSisters: 0,
  uterineBrothers: 0, uterineSisters: 0,
  sonsDaughter: false, sonsDaughterCount: 1,
};

type Result = {
  shares: { label: string; fraction: string; value: number; pct: number; type: 'fixed' | 'asabah' | 'radd' }[];
  appliedRules: string[];
  awlApplied: boolean;
  raddApplied: boolean;
  error?: string;
};

function calculate(estate: number, h: Heirs): Result {
  const rules: string[] = [];
  const fixed: { key: string; label: string; share: number; fraction: string }[] = [];

  if (estate <= 0) return { shares: [], appliedRules: [], awlApplied: false, raddApplied: false, error: 'মোট সম্পদ ০-এর বেশি দিন।' };

  const hasSon = h.sons > 0;
  const hasDaughter = h.daughters > 0;
  const hasSonsDaughter = h.sonsDaughter && h.sonsDaughterCount > 0;
  const hasFather = h.father;
  const hasChildOrGrandchild = hasSon || hasDaughter || hasSonsDaughter;
  const hasMaleDescendant = hasSon; // simplified
  const totalSiblings = h.fullBrothers + h.fullSisters + h.consanguineBrothers + h.consanguineSisters + h.uterineBrothers + h.uterineSisters;

  // Husband
  if (h.husband) {
    const s = hasChildOrGrandchild ? 1/4 : 1/2;
    fixed.push({ key: 'husband', label: 'স্বামী', share: s, fraction: hasChildOrGrandchild ? '১/৪' : '১/২' });
    rules.push('স্বামী — সূরা আন-নিসা ৪:১২');
  }
  // Wife (split among wives)
  if (h.wife && h.wifeCount > 0) {
    const total = hasChildOrGrandchild ? 1/8 : 1/4;
    fixed.push({ key: 'wife', label: `স্ত্রী (${h.wifeCount} জন, সমান ভাগ)`, share: total, fraction: hasChildOrGrandchild ? '১/৮' : '১/৪' });
    rules.push('স্ত্রী — সূরা আন-নিসা ৪:১২');
  }
  // Mother
  if (h.mother) {
    const s = (hasChildOrGrandchild || totalSiblings >= 2) ? 1/6 : 1/3;
    fixed.push({ key: 'mother', label: 'মাতা', share: s, fraction: s === 1/6 ? '১/৬' : '১/৩' });
    rules.push('মাতা — সূরা আন-নিসা ৪:১১');
  }
  // Paternal Grandmother / Maternal Grandmother (1/6 shared if mother absent)
  if (!h.mother) {
    const grans = [h.paternalGrandmother, h.maternalGrandmother].filter(Boolean).length;
    if (grans > 0) {
      fixed.push({ key: 'grandmothers', label: `দাদি/নানি (${grans} জন)`, share: 1/6, fraction: '১/৬' });
      rules.push('দাদি/নানি — হাদীস (১/৬ সমান বণ্টন)');
    }
  }
  // Daughters
  if (hasDaughter && !hasSon) {
    const s = h.daughters === 1 ? 1/2 : 2/3;
    fixed.push({ key: 'daughters', label: `কন্যা (${h.daughters} জন)`, share: s, fraction: h.daughters === 1 ? '১/২' : '২/৩' });
    rules.push('কন্যা — সূরা আন-নিসা ৪:১১');
  }
  // Son's daughters
  if (hasSonsDaughter && !hasSon) {
    let s = 0; let frac = '';
    if (!hasDaughter) { s = h.sonsDaughterCount === 1 ? 1/2 : 2/3; frac = h.sonsDaughterCount === 1 ? '১/২' : '২/৩'; }
    else if (h.daughters === 1) { s = 1/6; frac = '১/৬'; }
    if (s > 0) {
      fixed.push({ key: 'sonsDaughter', label: `পুত্রের কন্যা (${h.sonsDaughterCount} জন)`, share: s, fraction: frac });
      rules.push('পুত্রের কন্যা — সূরা আন-নিসা ৪:১১');
    }
  }
  // Father — fixed 1/6 if any descendant; else asabah only
  if (hasFather && hasChildOrGrandchild) {
    fixed.push({ key: 'father', label: 'পিতা', share: 1/6, fraction: '১/৬' });
    rules.push('পিতা — সূরা আন-নিসা ৪:১১');
  }
  // Paternal grandfather (only if no father), 1/6 with descendant
  if (!hasFather && h.paternalGrandfather && hasChildOrGrandchild) {
    fixed.push({ key: 'pgf', label: 'দাদা', share: 1/6, fraction: '১/৬' });
    rules.push('দাদা — পিতার অনুপস্থিতিতে (১/৬)');
  }
  // Uterine siblings (blocked by father, child, paternal grandfather)
  const uterineTotal = h.uterineBrothers + h.uterineSisters;
  if (uterineTotal > 0 && !hasFather && !hasChildOrGrandchild && !h.paternalGrandfather) {
    const s = uterineTotal === 1 ? 1/6 : 1/3;
    fixed.push({ key: 'uterine', label: `বৈপিত্রেয় ভাই/বোন (${uterineTotal} জন, সমান)`, share: s, fraction: uterineTotal === 1 ? '১/৬' : '১/৩' });
    rules.push('বৈপিত্রেয় ভাই/বোন (কালালা) — সূরা আন-নিসা ৪:১২');
  }
  // Full sisters (only fixed if no son, no father, no full brother)
  if (h.fullSisters > 0 && !hasSon && !hasFather && h.fullBrothers === 0 && !hasChildOrGrandchild) {
    const s = h.fullSisters === 1 ? 1/2 : 2/3;
    fixed.push({ key: 'fullSisters', label: `সহোদর বোন (${h.fullSisters} জন)`, share: s, fraction: h.fullSisters === 1 ? '১/২' : '২/৩' });
    rules.push('সহোদর বোন — সূরা আন-নিসা ৪:১৭৬');
  }
  // Consanguine sisters (only fixed if no full siblings, no son, no father)
  if (h.consanguineSisters > 0 && !hasSon && !hasFather && h.consanguineBrothers === 0 && h.fullBrothers === 0 && h.fullSisters === 0 && !hasChildOrGrandchild) {
    const s = h.consanguineSisters === 1 ? 1/2 : 2/3;
    fixed.push({ key: 'conSisters', label: `বৈমাত্রেয় বোন (${h.consanguineSisters} জন)`, share: s, fraction: h.consanguineSisters === 1 ? '১/২' : '২/৩' });
    rules.push('বৈমাত্রেয় বোন — সূরা আন-নিসা ৪:১৭৬');
  }

  // Total fixed
  let totalFixed = fixed.reduce((s, f) => s + f.share, 0);
  let awlApplied = false;
  if (totalFixed > 1) {
    awlApplied = true;
    rules.push("'আউল প্রয়োগ — অংশসমূহ আনুপাতিকভাবে কমানো হয়েছে");
    fixed.forEach(f => { f.share = f.share / totalFixed; });
    totalFixed = 1;
  }

  // Residuary heirs (Asabah)
  type Asab = { key: string; label: string; units: number };
  const asabah: Asab[] = [];
  if (hasSon) {
    // sons + daughters share 2:1
    const units = h.sons * 2 + h.daughters;
    asabah.push({ key: 'sonsDaughtersAsabah', label: `পুত্র (${h.sons}) ও কন্যা (${h.daughters}) — ২:১`, units });
    rules.push('পুত্র-কন্যা আসাবাহ (২:১) — সূরা আন-নিসা ৪:১১');
  }
  if (hasFather && !hasMaleDescendant) {
    // father gets residue when no male descendant
    asabah.push({ key: 'fatherAsabah', label: 'পিতা (অবশিষ্ট)', units: 1 });
    if (!hasChildOrGrandchild) rules.push('পিতা — অবশিষ্ট সম্পূর্ণ আসাবাহ');
  } else if (!hasFather && h.paternalGrandfather && !hasMaleDescendant) {
    asabah.push({ key: 'pgfAsabah', label: 'দাদা (অবশিষ্ট)', units: 1 });
  } else if (!hasSon && !hasFather && (h.fullBrothers > 0 || (h.fullSisters > 0 && (hasDaughter || hasSonsDaughter)))) {
    const units = h.fullBrothers * 2 + h.fullSisters;
    if (units > 0) {
      asabah.push({ key: 'fullBrosAsabah', label: `সহোদর ভাই (${h.fullBrothers}) ও বোন (${h.fullSisters}) — ২:১`, units });
      rules.push('সহোদর ভাই-বোন আসাবাহ — সূরা আন-নিসা ৪:১৭৬');
    }
  } else if (!hasSon && !hasFather && h.fullBrothers === 0 && h.fullSisters === 0 && (h.consanguineBrothers > 0 || (h.consanguineSisters > 0 && (hasDaughter || hasSonsDaughter)))) {
    const units = h.consanguineBrothers * 2 + h.consanguineSisters;
    if (units > 0) asabah.push({ key: 'conBrosAsabah', label: `বৈমাত্রেয় ভাই (${h.consanguineBrothers}) ও বোন (${h.consanguineSisters}) — ২:১`, units });
  }

  const residue = Math.max(0, 1 - totalFixed);
  let raddApplied = false;
  const shares: Result['shares'] = [];

  fixed.forEach(f => shares.push({ label: f.label, fraction: f.fraction, value: estate * f.share, pct: f.share * 100, type: 'fixed' }));

  if (residue > 0 && asabah.length > 0) {
    const totalUnits = asabah.reduce((s, a) => s + a.units, 0);
    asabah.forEach(a => {
      const portion = residue * (a.units / totalUnits);
      shares.push({ label: a.label, fraction: 'অবশিষ্ট (আসাবাহ)', value: estate * portion, pct: portion * 100, type: 'asabah' });
    });
  } else if (residue > 0.0001 && fixed.length > 0) {
    // Radd — return surplus to fixed heirs except spouses
    raddApplied = true;
    rules.push('রদ্দ প্রয়োগ — অবশিষ্ট অংশ স্বামী/স্ত্রী ব্যতীত ফিক্সড উত্তরাধিকারীদের মধ্যে আনুপাতিকভাবে ফেরত');
    const eligible = fixed.filter(f => f.key !== 'husband' && f.key !== 'wife');
    const eligibleTotal = eligible.reduce((s, f) => s + f.share, 0);
    if (eligibleTotal > 0) {
      eligible.forEach(f => {
        const extra = residue * (f.share / eligibleTotal);
        shares.push({ label: `${f.label} — রদ্দ`, fraction: 'রদ্দ অংশ', value: estate * extra, pct: extra * 100, type: 'radd' });
      });
    }
  }

  if (shares.length === 0) return { shares: [], appliedRules: [], awlApplied: false, raddApplied: false, error: 'কোনো বৈধ উত্তরাধিকারী পাওয়া যায়নি। অন্তত একজন নির্বাচন করুন।' };

  return { shares, appliedRules: rules, awlApplied, raddApplied };
}

const fmt = (n: number) => n.toLocaleString('en-BD', { maximumFractionDigits: 2 });

const inputCls = 'w-20 px-2 py-1 rounded border border-[#b48752] bg-[#fff3e6] text-[#1b4d2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#b87a48]';
const numCls = 'w-full px-3 py-2 rounded border border-[#b48752] bg-[#fff3e6] text-[#1b4d2e] focus:outline-none focus:ring-2 focus:ring-[#b87a48]';
const checkCls = 'h-4 w-4 accent-[#b87a48]';

const FaraidCalculator = () => {
  const [estate, setEstate] = useState<number>(0);
  const [h, setH] = useState<Heirs>(DEFAULT);
  const [show, setShow] = useState(false);
  const [deceasedName, setDeceasedName] = useState('');
  const [heirNames, setHeirNames] = useState<Record<string, string>>({});

  const result = useMemo(() => show ? calculate(estate, h) : null, [show, estate, h]);

  const update = <K extends keyof Heirs>(k: K, v: Heirs[K]) => setH(prev => ({ ...prev, [k]: v }));

  const updateName = (key: string, name: string) => setHeirNames(prev => ({ ...prev, [key]: name }));

  const printReport = () => {
    if (!result || result.error) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const rowsHtml = result.shares.map(s => {
      const name = heirNames[s.label] || '';
      return `<tr>
        <td>${s.label}${name ? ` — <b>${name}</b>` : ''}</td>
        <td>${s.fraction}</td>
        <td style="text-align:right">৳ ${fmt(s.value)}</td>
        <td style="text-align:right">${s.pct.toFixed(2)}%</td>
      </tr>`;
    }).join('');
    const rulesHtml = result.appliedRules.map(r => `<li>${r}</li>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>ফারায়েজ রিপোর্ট</title>
      <style>
        body{font-family:'Noto Sans Bengali','SolaimanLipi',Arial,sans-serif;padding:24px;color:#1b4d2e}
        h1{color:#b87a48;margin:0 0 4px} .meta{color:#555;margin-bottom:16px;font-size:13px}
        table{width:100%;border-collapse:collapse;margin:12px 0}
        th,td{border:1px solid #b48752;padding:6px 8px;font-size:13px}
        th{background:#b87a48;color:#fff;text-align:left}
        .box{background:#fff3e6;border:1px solid #b48752;padding:10px;border-radius:6px;margin-top:12px;font-size:12px}
        .note{background:#fff7d6;border:1px solid #e0c97a;padding:10px;border-radius:6px;margin-top:10px;font-size:12px}
        @media print{button{display:none}}
      </style></head><body>
      <h1>☪️ ইসলামী ফারায়েজ উত্তরাধিকার রিপোর্ট</h1>
      <div class="meta">মৃত ব্যক্তি: <b>${deceasedName || '—'}</b> · মোট সম্পদ: <b>৳ ${fmt(estate)}</b> · তারিখ: ${new Date().toLocaleDateString('bn-BD')}</div>
      <table><thead><tr><th>উত্তরাধিকারী</th><th>অংশ</th><th style="text-align:right">টাকা</th><th style="text-align:right">%</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      ${result.awlApplied ? '<div class="note">⚠ \'আউল প্রয়োগ করা হয়েছে</div>' : ''}
      ${result.raddApplied ? '<div class="note">ℹ রদ্দ প্রয়োগ করা হয়েছে</div>' : ''}
      <div class="box"><b>প্রযোজ্য বিধান (পূর্ণ শর্তাবলী):</b><ul>${rulesHtml}</ul></div>
      <div class="note">📌 বণ্টনের পূর্বে মৃতের ঋণ পরিশোধ এবং ওসিয়ত (সর্বোচ্চ ১/৩ সম্পদ) আদায় করতে হবে।</div>
      <div style="margin-top:16px"><button onclick="window.print()" style="padding:8px 16px;background:#b87a48;color:#fff;border:0;border-radius:4px;cursor:pointer">প্রিন্ট/PDF সংরক্ষণ</button></div>
      </body></html>`);
    w.document.close();
  };

  const Row = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-[#b48752]/20">{children}</div>
  );

  return (
    <div className="rounded-lg overflow-hidden shadow-lg bg-[#1b4d2e] p-3 sm:p-4">
      <div className="rounded-md bg-[#fef7e8] text-[#1b4d2e]">
        <div className="bg-[#b87a48] text-white px-4 py-3 rounded-t-md">
          <h2 className="font-bold text-base sm:text-lg">☪️ ইসলামী ফারায়েজ উত্তরাধিকার ক্যালকুলেটর</h2>
          <p className="text-xs opacity-90 mt-0.5">কুরআন অনুযায়ী (সূরা আন-নিসা ৪:১১, ৪:১২, ৪:১৭৬)</p>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">মোট সম্পদ (টাকা / জমির মূল্য)</label>
            <input type="number" min={0} value={estate || ''} onChange={e => setEstate(Number(e.target.value) || 0)} className={numCls} placeholder="0" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <Row>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className={checkCls} checked={h.husband} onChange={e => update('husband', e.target.checked)} disabled={h.wife} /> স্বামী</label>
            </Row>
            <Row>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className={checkCls} checked={h.wife} onChange={e => update('wife', e.target.checked)} disabled={h.husband} /> স্ত্রী</label>
              {h.wife && <input type="number" min={1} max={4} value={h.wifeCount} onChange={e => update('wifeCount', Math.max(1, Math.min(4, Number(e.target.value) || 1)))} className={inputCls} />}
            </Row>
            <Row>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className={checkCls} checked={h.father} onChange={e => update('father', e.target.checked)} /> পিতা</label>
            </Row>
            <Row>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className={checkCls} checked={h.mother} onChange={e => update('mother', e.target.checked)} /> মাতা</label>
            </Row>
            <Row>
              <span className="text-sm">পুত্র</span>
              <input type="number" min={0} value={h.sons} onChange={e => update('sons', Math.max(0, Number(e.target.value) || 0))} className={inputCls} />
            </Row>
            <Row>
              <span className="text-sm">কন্যা</span>
              <input type="number" min={0} value={h.daughters} onChange={e => update('daughters', Math.max(0, Number(e.target.value) || 0))} className={inputCls} />
            </Row>
            <Row>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className={checkCls} checked={h.paternalGrandfather} onChange={e => update('paternalGrandfather', e.target.checked)} /> দাদা</label>
            </Row>
            <Row>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className={checkCls} checked={h.paternalGrandmother} onChange={e => update('paternalGrandmother', e.target.checked)} /> দাদি</label>
            </Row>
            <Row>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className={checkCls} checked={h.maternalGrandmother} onChange={e => update('maternalGrandmother', e.target.checked)} /> নানি</label>
            </Row>
            <Row>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className={checkCls} checked={h.sonsDaughter} onChange={e => update('sonsDaughter', e.target.checked)} /> পুত্রের কন্যা</label>
              {h.sonsDaughter && <input type="number" min={1} value={h.sonsDaughterCount} onChange={e => update('sonsDaughterCount', Math.max(1, Number(e.target.value) || 1))} className={inputCls} />}
            </Row>
            <Row><span className="text-sm">সহোদর ভাই</span><input type="number" min={0} value={h.fullBrothers} onChange={e => update('fullBrothers', Math.max(0, Number(e.target.value) || 0))} className={inputCls} /></Row>
            <Row><span className="text-sm">সহোদর বোন</span><input type="number" min={0} value={h.fullSisters} onChange={e => update('fullSisters', Math.max(0, Number(e.target.value) || 0))} className={inputCls} /></Row>
            <Row><span className="text-sm">বৈমাত্রেয় ভাই</span><input type="number" min={0} value={h.consanguineBrothers} onChange={e => update('consanguineBrothers', Math.max(0, Number(e.target.value) || 0))} className={inputCls} /></Row>
            <Row><span className="text-sm">বৈমাত্রেয় বোন</span><input type="number" min={0} value={h.consanguineSisters} onChange={e => update('consanguineSisters', Math.max(0, Number(e.target.value) || 0))} className={inputCls} /></Row>
            <Row><span className="text-sm">বৈপিত্রেয় ভাই</span><input type="number" min={0} value={h.uterineBrothers} onChange={e => update('uterineBrothers', Math.max(0, Number(e.target.value) || 0))} className={inputCls} /></Row>
            <Row><span className="text-sm">বৈপিত্রেয় বোন</span><input type="number" min={0} value={h.uterineSisters} onChange={e => update('uterineSisters', Math.max(0, Number(e.target.value) || 0))} className={inputCls} /></Row>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={() => setShow(true)} className="px-4 py-2 rounded bg-[#b87a48] text-white font-semibold border border-[#b48752] hover:opacity-90">হিসাব করুন</button>
            <button onClick={() => { setH(DEFAULT); setEstate(0); setShow(false); }} className="px-4 py-2 rounded bg-[#fff3e6] text-[#1b4d2e] border border-[#b48752] hover:bg-[#f3e3c8]">রিসেট</button>
          </div>

          {result && (
            <div className="space-y-3 pt-2">
              {result.error ? (
                <div className="p-3 rounded bg-red-100 text-red-800 text-sm">{result.error}</div>
              ) : (
                <>
                  <div className="p-3 rounded bg-[#1b4d2e] text-[#fef7e8]">
                    <div className="text-xs opacity-80">মোট সম্পদ</div>
                    <div className="text-xl font-bold">৳ {fmt(estate)}</div>
                    {result.awlApplied && <div className="mt-1 text-xs text-amber-200">⚠ 'আউল প্রয়োগ করা হয়েছে</div>}
                    {result.raddApplied && <div className="mt-1 text-xs text-amber-200">ℹ রদ্দ প্রয়োগ করা হয়েছে</div>}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#b87a48] text-white">
                        <tr><th className="text-left px-2 py-1.5">উত্তরাধিকারী</th><th className="text-left px-2 py-1.5">অংশ</th><th className="text-right px-2 py-1.5">টাকা</th><th className="text-right px-2 py-1.5">%</th></tr>
                      </thead>
                      <tbody>
                        {result.shares.map((s, i) => (
                          <tr key={i} className={`border-b border-[#b48752]/20 ${s.type === 'asabah' ? 'bg-[#fff3e6]' : s.type === 'radd' ? 'bg-amber-50' : ''}`}>
                            <td className="px-2 py-1.5">{s.label}</td>
                            <td className="px-2 py-1.5 text-xs">{s.fraction}</td>
                            <td className="px-2 py-1.5 text-right font-semibold">৳ {fmt(s.value)}</td>
                            <td className="px-2 py-1.5 text-right">{s.pct.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 rounded bg-[#fff3e6] border border-[#b48752]">
                    <div className="text-xs font-semibold mb-1">প্রযোজ্য বিধান</div>
                    <ul className="text-xs space-y-0.5 list-disc list-inside">
                      {result.appliedRules.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                  <div className="p-3 rounded bg-amber-100 text-amber-900 text-xs border border-amber-300">
                    📌 <strong>নোট:</strong> বণ্টনের পূর্বে মৃতের ঋণ পরিশোধ এবং ওসিয়ত (সর্বোচ্চ ১/৩ সম্পদ পর্যন্ত) আদায় করতে হবে।
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaraidCalculator;