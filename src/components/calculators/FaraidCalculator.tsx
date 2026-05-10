/**
 * Islamic Faraid (Inheritance) Calculator
 * Per-person output with names; rule descriptions (no verse references).
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

type Member = { nameKey: string; relation: string; weight: number };
type Group = {
  key: string;
  groupLabel: string;
  fraction: string;
  share: number;          // 0..1 of estate
  type: 'fixed' | 'asabah' | 'radd';
  isSpouse?: boolean;
  members: Member[];
};

type Result = {
  groups: Group[];
  appliedRules: string[];
  awlApplied: boolean;
  raddApplied: boolean;
  error?: string;
};

const seq = (n: number) => Array.from({ length: n }, (_, i) => i);

function calculate(estate: number, h: Heirs): Result {
  const rules: string[] = [];
  if (estate <= 0) return { groups: [], appliedRules: [], awlApplied: false, raddApplied: false, error: 'মোট সম্পদ ০-এর বেশি দিন।' };

  const hasSon = h.sons > 0;
  const hasDaughter = h.daughters > 0;
  const hasSonsDaughter = h.sonsDaughter && h.sonsDaughterCount > 0;
  const hasFather = h.father;
  const hasChildOrGrandchild = hasSon || hasDaughter || hasSonsDaughter;
  const hasMaleDescendant = hasSon;
  const totalSiblings = h.fullBrothers + h.fullSisters + h.consanguineBrothers + h.consanguineSisters + h.uterineBrothers + h.uterineSisters;

  const fixed: Group[] = [];

  // Husband
  if (h.husband) {
    const s = hasChildOrGrandchild ? 1/4 : 1/2;
    fixed.push({
      key: 'husband', groupLabel: 'স্বামী',
      fraction: hasChildOrGrandchild ? '১/৪' : '১/২',
      share: s, type: 'fixed', isSpouse: true,
      members: [{ nameKey: 'husband_0', relation: 'স্বামী', weight: 1 }],
    });
    rules.push('স্বামী: সন্তান/পৌত্রী না থাকলে ১/২, থাকলে ১/৪।');
  }
  // Wife
  if (h.wife && h.wifeCount > 0) {
    const total = hasChildOrGrandchild ? 1/8 : 1/4;
    fixed.push({
      key: 'wife', groupLabel: `স্ত্রী (${h.wifeCount} জন, সমান ভাগ)`,
      fraction: hasChildOrGrandchild ? '১/৮' : '১/৪',
      share: total, type: 'fixed', isSpouse: true,
      members: seq(h.wifeCount).map(i => ({ nameKey: `wife_${i}`, relation: `স্ত্রী ${i + 1}`, weight: 1 })),
    });
    rules.push('স্ত্রী: সন্তান/পৌত্রী না থাকলে ১/৪, থাকলে ১/৮ (একাধিক স্ত্রী হলে নিজেদের মধ্যে সমান বণ্টন)।');
  }
  // Mother
  if (h.mother) {
    const s = (hasChildOrGrandchild || totalSiblings >= 2) ? 1/6 : 1/3;
    fixed.push({
      key: 'mother', groupLabel: 'মাতা',
      fraction: s === 1/6 ? '১/৬' : '১/৩',
      share: s, type: 'fixed',
      members: [{ nameKey: 'mother_0', relation: 'মাতা', weight: 1 }],
    });
    rules.push('মাতা: সন্তান/পৌত্রী/পৌত্র অথবা ২ বা ততোধিক ভাইবোন থাকলে ১/৬, না হলে ১/৩।');
  }
  // Grandmothers (if mother absent)
  if (!h.mother) {
    const list: Member[] = [];
    if (h.paternalGrandmother) list.push({ nameKey: 'pgm_0', relation: 'দাদি', weight: 1 });
    if (h.maternalGrandmother) list.push({ nameKey: 'mgm_0', relation: 'নানি', weight: 1 });
    if (list.length > 0) {
      fixed.push({
        key: 'grandmothers', groupLabel: `দাদি/নানি (${list.length} জন)`,
        fraction: '১/৬', share: 1/6, type: 'fixed', members: list,
      });
      rules.push('দাদি/নানি: মাতা না থাকলে ১/৬ (একাধিক হলে সমান বণ্টন)।');
    }
  }
  // Daughters fixed (only if no son)
  if (hasDaughter && !hasSon) {
    const s = h.daughters === 1 ? 1/2 : 2/3;
    fixed.push({
      key: 'daughters', groupLabel: `কন্যা (${h.daughters} জন)`,
      fraction: h.daughters === 1 ? '১/২' : '২/৩',
      share: s, type: 'fixed',
      members: seq(h.daughters).map(i => ({ nameKey: `daughter_${i}`, relation: `কন্যা ${i + 1}`, weight: 1 })),
    });
    rules.push('কন্যা: পুত্র না থাকলে — একা হলে ১/২, একাধিক হলে ২/৩ (সমান বণ্টন)। পুত্র থাকলে পুত্র:কন্যা = ২:১ অনুপাতে অবশিষ্ট।');
  }
  // Son's daughters
  if (hasSonsDaughter && !hasSon) {
    let s = 0; let frac = '';
    if (!hasDaughter) { s = h.sonsDaughterCount === 1 ? 1/2 : 2/3; frac = h.sonsDaughterCount === 1 ? '১/২' : '২/৩'; }
    else if (h.daughters === 1) { s = 1/6; frac = '১/৬'; }
    if (s > 0) {
      fixed.push({
        key: 'sonsDaughter', groupLabel: `পুত্রের কন্যা (${h.sonsDaughterCount} জন)`,
        fraction: frac, share: s, type: 'fixed',
        members: seq(h.sonsDaughterCount).map(i => ({ nameKey: `sd_${i}`, relation: `পুত্রের কন্যা ${i + 1}`, weight: 1 })),
      });
      rules.push('পুত্রের কন্যা: কন্যা না থাকলে — একা হলে ১/২, একাধিক হলে ২/৩; এক কন্যা থাকলে ১/৬ (২/৩ পূর্ণ করতে)।');
    }
  }
  // Father fixed (only if descendant)
  if (hasFather && hasChildOrGrandchild) {
    fixed.push({
      key: 'father', groupLabel: 'পিতা',
      fraction: '১/৬', share: 1/6, type: 'fixed',
      members: [{ nameKey: 'father_0', relation: 'পিতা', weight: 1 }],
    });
    rules.push('পিতা: সন্তান/পৌত্রী/পৌত্র থাকলে ১/৬ ফিক্সড; পুত্র না থাকলে ১/৬-এর সাথে অবশিষ্ট অংশও পান।');
  }
  // Paternal grandfather fixed (only if no father, with descendant)
  if (!hasFather && h.paternalGrandfather && hasChildOrGrandchild) {
    fixed.push({
      key: 'pgf', groupLabel: 'দাদা',
      fraction: '১/৬', share: 1/6, type: 'fixed',
      members: [{ nameKey: 'pgf_0', relation: 'দাদা', weight: 1 }],
    });
    rules.push('দাদা: পিতার অনুপস্থিতিতে পিতার ভূমিকা পালন করেন (১/৬ + অবশিষ্ট)।');
  }
  // Uterine siblings
  const uterineTotal = h.uterineBrothers + h.uterineSisters;
  if (uterineTotal > 0 && !hasFather && !hasChildOrGrandchild && !h.paternalGrandfather) {
    const s = uterineTotal === 1 ? 1/6 : 1/3;
    const list: Member[] = [];
    seq(h.uterineBrothers).forEach(i => list.push({ nameKey: `ub_${i}`, relation: `বৈপিত্রেয় ভাই ${i + 1}`, weight: 1 }));
    seq(h.uterineSisters).forEach(i => list.push({ nameKey: `us_${i}`, relation: `বৈপিত্রেয় বোন ${i + 1}`, weight: 1 }));
    fixed.push({
      key: 'uterine', groupLabel: `বৈপিত্রেয় ভাই/বোন (${uterineTotal} জন)`,
      fraction: uterineTotal === 1 ? '১/৬' : '১/৩',
      share: s, type: 'fixed', members: list,
    });
    rules.push('বৈপিত্রেয় ভাই/বোন (কালালা): পিতা/সন্তান/দাদা না থাকলে — একজন হলে ১/৬, একাধিক হলে ১/৩ (নারী-পুরুষ সমান)।');
  }
  // Full sisters fixed
  if (h.fullSisters > 0 && !hasSon && !hasFather && h.fullBrothers === 0 && !hasChildOrGrandchild) {
    const s = h.fullSisters === 1 ? 1/2 : 2/3;
    fixed.push({
      key: 'fullSisters', groupLabel: `সহোদর বোন (${h.fullSisters} জন)`,
      fraction: h.fullSisters === 1 ? '১/২' : '২/৩',
      share: s, type: 'fixed',
      members: seq(h.fullSisters).map(i => ({ nameKey: `fs_${i}`, relation: `সহোদর বোন ${i + 1}`, weight: 1 })),
    });
    rules.push('সহোদর বোন: সহোদর ভাই, পুত্র, পিতা ও সন্তান/পৌত্রী না থাকলে — একা হলে ১/২, একাধিক হলে ২/৩।');
  }
  // Consanguine sisters fixed
  if (h.consanguineSisters > 0 && !hasSon && !hasFather && h.consanguineBrothers === 0 && h.fullBrothers === 0 && h.fullSisters === 0 && !hasChildOrGrandchild) {
    const s = h.consanguineSisters === 1 ? 1/2 : 2/3;
    fixed.push({
      key: 'conSisters', groupLabel: `বৈমাত্রেয় বোন (${h.consanguineSisters} জন)`,
      fraction: h.consanguineSisters === 1 ? '১/২' : '২/৩',
      share: s, type: 'fixed',
      members: seq(h.consanguineSisters).map(i => ({ nameKey: `cs_${i}`, relation: `বৈমাত্রেয় বোন ${i + 1}`, weight: 1 })),
    });
    rules.push('বৈমাত্রেয় বোন: সহোদর ভাইবোন, বৈমাত্রেয় ভাই, পুত্র, পিতা ও সন্তান না থাকলে — একা হলে ১/২, একাধিক হলে ২/৩।');
  }

  // Awl
  let totalFixed = fixed.reduce((s, f) => s + f.share, 0);
  let awlApplied = false;
  if (totalFixed > 1.0000001) {
    awlApplied = true;
    rules.push("'আউল প্রয়োগ: মোট ফিক্সড অংশ ১-এর বেশি হওয়ায় আনুপাতিকভাবে কমানো হয়েছে।");
    fixed.forEach(f => { f.share = f.share / totalFixed; });
    totalFixed = 1;
  }

  // Asabah groups
  const asabah: Group[] = [];
  if (hasSon) {
    const members: Member[] = [];
    seq(h.sons).forEach(i => members.push({ nameKey: `son_${i}`, relation: `পুত্র ${i + 1}`, weight: 2 }));
    seq(h.daughters).forEach(i => members.push({ nameKey: `daughter_${i}`, relation: `কন্যা ${i + 1}`, weight: 1 }));
    asabah.push({
      key: 'sonsDaughtersAsabah',
      groupLabel: hasDaughter ? `পুত্র (${h.sons}) ও কন্যা (${h.daughters}) — ২:১` : `পুত্র (${h.sons})`,
      fraction: 'অবশিষ্ট (২:১)', share: 0, type: 'asabah', members,
    });
    rules.push('পুত্র (ও কন্যা): অবশিষ্ট সম্পদ আসাবাহ হিসেবে পান; পুত্র:কন্যা = ২:১ অনুপাতে।');
  }
  if (hasFather && !hasMaleDescendant) {
    asabah.push({
      key: 'fatherAsabah', groupLabel: 'পিতা (অবশিষ্ট)',
      fraction: 'অবশিষ্ট', share: 0, type: 'asabah',
      members: [{ nameKey: 'father_0', relation: 'পিতা', weight: 1 }],
    });
  } else if (!hasFather && h.paternalGrandfather && !hasMaleDescendant) {
    asabah.push({
      key: 'pgfAsabah', groupLabel: 'দাদা (অবশিষ্ট)',
      fraction: 'অবশিষ্ট', share: 0, type: 'asabah',
      members: [{ nameKey: 'pgf_0', relation: 'দাদা', weight: 1 }],
    });
  } else if (!hasSon && !hasFather && (h.fullBrothers > 0 || (h.fullSisters > 0 && (hasDaughter || hasSonsDaughter)))) {
    const members: Member[] = [];
    seq(h.fullBrothers).forEach(i => members.push({ nameKey: `fb_${i}`, relation: `সহোদর ভাই ${i + 1}`, weight: 2 }));
    if (h.fullBrothers > 0) seq(h.fullSisters).forEach(i => members.push({ nameKey: `fs_${i}`, relation: `সহোদর বোন ${i + 1}`, weight: 1 }));
    else seq(h.fullSisters).forEach(i => members.push({ nameKey: `fs_${i}`, relation: `সহোদর বোন ${i + 1}`, weight: 1 }));
    if (members.length > 0) {
      asabah.push({
        key: 'fullSibAsabah',
        groupLabel: `সহোদর ভাই (${h.fullBrothers}) ও বোন (${h.fullSisters})${h.fullBrothers ? ' — ২:১' : ''}`,
        fraction: 'অবশিষ্ট', share: 0, type: 'asabah', members,
      });
      rules.push('সহোদর ভাই-বোন: কালালা ক্ষেত্রে অবশিষ্ট আসাবাহ; ভাই থাকলে ভাই:বোন = ২:১।');
    }
  } else if (!hasSon && !hasFather && h.fullBrothers === 0 && h.fullSisters === 0 && (h.consanguineBrothers > 0 || (h.consanguineSisters > 0 && (hasDaughter || hasSonsDaughter)))) {
    const members: Member[] = [];
    seq(h.consanguineBrothers).forEach(i => members.push({ nameKey: `cb_${i}`, relation: `বৈমাত্রেয় ভাই ${i + 1}`, weight: 2 }));
    if (h.consanguineBrothers > 0) seq(h.consanguineSisters).forEach(i => members.push({ nameKey: `cs_${i}`, relation: `বৈমাত্রেয় বোন ${i + 1}`, weight: 1 }));
    else seq(h.consanguineSisters).forEach(i => members.push({ nameKey: `cs_${i}`, relation: `বৈমাত্রেয় বোন ${i + 1}`, weight: 1 }));
    if (members.length > 0) {
      asabah.push({
        key: 'conSibAsabah',
        groupLabel: `বৈমাত্রেয় ভাই (${h.consanguineBrothers}) ও বোন (${h.consanguineSisters})${h.consanguineBrothers ? ' — ২:১' : ''}`,
        fraction: 'অবশিষ্ট', share: 0, type: 'asabah', members,
      });
      rules.push('বৈমাত্রেয় ভাই-বোন: সহোদর ভাইবোন না থাকলে অবশিষ্ট আসাবাহ; ভাই থাকলে ভাই:বোন = ২:১।');
    }
  }

  const residue = Math.max(0, 1 - totalFixed);
  const groups: Group[] = [...fixed];

  let raddApplied = false;
  if (residue > 0.0001 && asabah.length > 0) {
    const totalUnits = asabah.reduce((s, a) => s + a.members.reduce((x, m) => x + m.weight, 0), 0);
    asabah.forEach(a => {
      const units = a.members.reduce((x, m) => x + m.weight, 0);
      a.share = residue * (units / totalUnits);
      groups.push(a);
    });
  } else if (residue > 0.0001 && fixed.length > 0) {
    raddApplied = true;
    rules.push('রদ্দ প্রয়োগ: আসাবাহ না থাকায় অবশিষ্ট অংশ স্বামী/স্ত্রী ব্যতীত ফিক্সড উত্তরাধিকারীদের মধ্যে আনুপাতিকভাবে ফেরত।');
    const eligible = fixed.filter(f => !f.isSpouse);
    const eligibleTotal = eligible.reduce((s, f) => s + f.share, 0);
    if (eligibleTotal > 0) {
      eligible.forEach(f => {
        const extra = residue * (f.share / eligibleTotal);
        groups.push({
          key: `${f.key}_radd`,
          groupLabel: `${f.groupLabel} — রদ্দ`,
          fraction: 'রদ্দ অংশ',
          share: extra, type: 'radd',
          members: f.members,
        });
      });
    }
  }

  if (groups.length === 0) return { groups: [], appliedRules: [], awlApplied: false, raddApplied: false, error: 'কোনো বৈধ উত্তরাধিকারী পাওয়া যায়নি। অন্তত একজন নির্বাচন করুন।' };

  return { groups, appliedRules: rules, awlApplied, raddApplied };
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

  type NameField = { key: string; label: string };
  const buildNameFields = (): NameField[] => {
    const f: NameField[] = [];
    if (h.husband) f.push({ key: 'husband_0', label: 'স্বামীর নাম' });
    if (h.wife) for (let i = 0; i < h.wifeCount; i++) f.push({ key: `wife_${i}`, label: `স্ত্রী ${i + 1} নাম` });
    if (h.father) f.push({ key: 'father_0', label: 'পিতার নাম' });
    if (h.mother) f.push({ key: 'mother_0', label: 'মাতার নাম' });
    for (let i = 0; i < h.sons; i++) f.push({ key: `son_${i}`, label: `পুত্র ${i + 1} নাম` });
    for (let i = 0; i < h.daughters; i++) f.push({ key: `daughter_${i}`, label: `কন্যা ${i + 1} নাম` });
    if (h.paternalGrandfather) f.push({ key: 'pgf_0', label: 'দাদার নাম' });
    if (h.paternalGrandmother) f.push({ key: 'pgm_0', label: 'দাদির নাম' });
    if (h.maternalGrandmother) f.push({ key: 'mgm_0', label: 'নানির নাম' });
    if (h.sonsDaughter) for (let i = 0; i < h.sonsDaughterCount; i++) f.push({ key: `sd_${i}`, label: `পুত্রের কন্যা ${i + 1} নাম` });
    for (let i = 0; i < h.fullBrothers; i++) f.push({ key: `fb_${i}`, label: `সহোদর ভাই ${i + 1} নাম` });
    for (let i = 0; i < h.fullSisters; i++) f.push({ key: `fs_${i}`, label: `সহোদর বোন ${i + 1} নাম` });
    for (let i = 0; i < h.consanguineBrothers; i++) f.push({ key: `cb_${i}`, label: `বৈমাত্রেয় ভাই ${i + 1} নাম` });
    for (let i = 0; i < h.consanguineSisters; i++) f.push({ key: `cs_${i}`, label: `বৈমাত্রেয় বোন ${i + 1} নাম` });
    for (let i = 0; i < h.uterineBrothers; i++) f.push({ key: `ub_${i}`, label: `বৈপিত্রেয় ভাই ${i + 1} নাম` });
    for (let i = 0; i < h.uterineSisters; i++) f.push({ key: `us_${i}`, label: `বৈপিত্রেয় বোন ${i + 1} নাম` });
    return f;
  };
  const nameFields = buildNameFields();

  // Expand groups into per-person rows
  type Row = { relation: string; name: string; fraction: string; value: number; pct: number; type: Group['type'] };
  const buildRows = (groups: Group[]): Row[] => {
    const rows: Row[] = [];
    groups.forEach(g => {
      const totalWeight = g.members.reduce((s, m) => s + m.weight, 0) || 1;
      g.members.forEach(m => {
        const portion = g.share * (m.weight / totalWeight);
        rows.push({
          relation: m.relation,
          name: heirNames[m.nameKey] || '—',
          fraction: g.fraction,
          value: estate * portion,
          pct: portion * 100,
          type: g.type,
        });
      });
    });
    return rows;
  };

  const printReport = () => {
    if (!result || result.error) return;
    const rows = buildRows(result.groups);
    const w = window.open('', '_blank');
    if (!w) return;
    const rowsHtml = rows.map(r => `<tr>
        <td>${r.relation}</td>
        <td>${r.name}</td>
        <td>${r.fraction}</td>
        <td style="text-align:right">৳ ${fmt(r.value)}</td>
        <td style="text-align:right">${r.pct.toFixed(2)}%</td>
      </tr>`).join('');
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
      <table><thead><tr><th>সম্পর্ক</th><th>নাম</th><th>অংশ</th><th style="text-align:right">টাকা</th><th style="text-align:right">%</th></tr></thead>
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

  const tableRows = result && !result.error ? buildRows(result.groups) : [];

  return (
    <div className="rounded-lg overflow-hidden shadow-lg bg-[#1b4d2e] p-3 sm:p-4">
      <div className="rounded-md bg-[#fef7e8] text-[#1b4d2e]">
        <div className="bg-[#b87a48] text-white px-4 py-3 rounded-t-md">
          <h2 className="font-bold text-base sm:text-lg">☪️ ইসলামী ফারায়েজ উত্তরাধিকার ক্যালকুলেটর</h2>
          <p className="text-xs opacity-90 mt-0.5">কুরআন ও সুন্নাহ অনুযায়ী উত্তরাধিকার বণ্টন</p>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">মৃত ব্যক্তির নাম</label>
            <input type="text" value={deceasedName} onChange={e => setDeceasedName(e.target.value)} className={numCls} placeholder="মৃত ব্যক্তির পূর্ণ নাম" />
          </div>
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

          {nameFields.length > 0 && (
            <div className="rounded border border-[#b48752] bg-[#fff3e6] p-3">
              <div className="text-sm font-semibold mb-2 text-[#1b4d2e]">ওয়ারিশগণের নাম</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {nameFields.map(f => (
                  <div key={f.key} className="flex items-center gap-2">
                    <label className="text-xs whitespace-nowrap min-w-[110px]">{f.label}</label>
                    <input type="text" value={heirNames[f.key] || ''} onChange={e => updateName(f.key, e.target.value)} className="flex-1 px-2 py-1 rounded border border-[#b48752]/40 bg-white text-sm text-[#1b4d2e]" placeholder="নাম লিখুন" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={() => setShow(true)} className="px-4 py-2 rounded bg-[#b87a48] text-white font-semibold border border-[#b48752] hover:opacity-90">হিসাব করুন</button>
            <button onClick={() => { setH(DEFAULT); setEstate(0); setShow(false); setHeirNames({}); setDeceasedName(''); }} className="px-4 py-2 rounded bg-[#fff3e6] text-[#1b4d2e] border border-[#b48752] hover:bg-[#f3e3c8]">রিসেট</button>
          </div>

          {result && (
            <div className="space-y-3 pt-2">
              {result.error ? (
                <div className="p-3 rounded bg-red-100 text-red-800 text-sm">{result.error}</div>
              ) : (
                <>
                  <div className="p-3 rounded bg-[#1b4d2e] text-[#fef7e8]">
                    <div className="text-xs opacity-80">মৃত ব্যক্তি: {deceasedName || '—'}</div>
                    <div className="text-xs opacity-80 mt-0.5">মোট সম্পদ</div>
                    <div className="text-xl font-bold">৳ {fmt(estate)}</div>
                    {result.awlApplied && <div className="mt-1 text-xs text-amber-200">⚠ 'আউল প্রয়োগ করা হয়েছে</div>}
                    {result.raddApplied && <div className="mt-1 text-xs text-amber-200">ℹ রদ্দ প্রয়োগ করা হয়েছে</div>}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#b87a48] text-white">
                        <tr>
                          <th className="text-left px-2 py-1.5">সম্পর্ক</th>
                          <th className="text-left px-2 py-1.5">নাম</th>
                          <th className="text-left px-2 py-1.5">অংশ</th>
                          <th className="text-right px-2 py-1.5">টাকা</th>
                          <th className="text-right px-2 py-1.5">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((r, i) => (
                          <tr key={i} className={`border-b border-[#b48752]/20 ${r.type === 'asabah' ? 'bg-[#fff3e6]' : r.type === 'radd' ? 'bg-amber-50' : ''}`}>
                            <td className="px-2 py-1.5">{r.relation}</td>
                            <td className="px-2 py-1.5 text-xs">{r.name}</td>
                            <td className="px-2 py-1.5 text-xs">{r.fraction}</td>
                            <td className="px-2 py-1.5 text-right font-semibold">৳ {fmt(r.value)}</td>
                            <td className="px-2 py-1.5 text-right">{r.pct.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={printReport} className="px-4 py-2 rounded bg-[#1b4d2e] text-white text-sm font-semibold hover:opacity-90">
                      📄 রিপোর্ট ডাউনলোড / প্রিন্ট
                    </button>
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
