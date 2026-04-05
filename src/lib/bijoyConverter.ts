/**
 * Bijoy ANSI (SutonnyMJ) ↔ Unicode Bangla converter
 * Based on @codesigntheory/bnbijoy2unicode mapping tables
 */

// Pre-conversion cleanup
const PRE_CONVERSION_MAP: Record<string, string> = {
  'yy': 'y', 'vv': 'v', '„„': '„', '­­': '­',
  'y&': 'y', '„&': '„', '‡u': 'u‡', 'wu': 'uw',
};

// Main character conversion map (Bijoy ANSI → Unicode)
const CONVERSION_MAP: Record<string, string> = {
  '°': 'ক্ক', '±': 'ক্ট', '²': 'ক্ষ্ণ', '³': 'ক্ত', '´': 'ক্ম',
  'µ': 'ক্র', '¶': 'ক্ষ', '·': 'ক্স', '¸': 'গু', '¹': 'জ্ঞ',
  'º': 'গ্দ', '»': 'গ্ধ', '¼': 'ঙ্ক', '½': 'ঙ্গ', '¾': 'জ্জ',
  '¿': '্ত্র', 'À': 'জ্ঝ', 'Á': 'জ্ঞ', 'Â': 'ঞ্চ', 'Ã': 'ঞ্ছ',
  'Ä': 'ঞ্জ', 'Å': 'ঞ্ঝ', 'Æ': 'ট্ট', 'Ç': 'ড্ড', 'È': 'ণ্ট',
  'É': 'ণ্ঠ', 'Ê': 'ণ্ড', 'Ë': 'ত্ত', 'Ì': 'ত্থ', 'Î': 'ত্র',
  'Ï': 'দ্দ', 'Ð': 'ণ্ড', 'Ñ': '-', 'Ò': '\u201C', 'Ó': '\u201D',
  'Ô': '\u2018', 'Õ': '\u2019', '×': 'দ্ধ', 'Ø': 'দ্ব', 'Ù': 'দ্ম',
  'Ú': 'ন্ঠ', 'Û': 'ন্ড', 'Ü': 'ন্ধ', 'Ý': 'ন্স', 'Þ': 'প্ট',
  'ß': 'প্ত', 'à': 'প্প', 'á': 'প্স', 'â': 'ব্জ', 'ã': 'ব্দ',
  'ä': 'ব্ধ', 'å': 'ভ্র', 'ç': 'ম্ফ', 'é': 'ল্ক', 'ê': 'ল্গ',
  'ë': 'ল্ট', 'ì': 'ল্ড', 'í': 'ল্প', 'î': 'ল্ফ', 'ï': 'শু',
  'ð': 'শ্চ', 'ñ': 'শ্ছ', 'ò': 'ষ্ণ', 'ó': 'ষ্ট', 'ô': 'ষ্ঠ',
  'õ': 'ষ্ফ', 'ö': 'স্খ', '÷': 'স্ট', 'ø': 'স্ন', 'ù': 'স্ফ',
  'û': 'হু', 'ü': 'হৃ', 'ý': 'হ্ন', 'ÿ': 'ক্ষ', 'þ': 'হ্ম',
  'A': 'অ', 'B': 'ই', 'C': 'ঈ', 'D': 'উ', 'E': 'ঊ',
  'F': 'ঋ', 'G': 'এ', 'H': 'ঐ', 'I': 'ও', 'J': 'ঔ',
  'K': 'ক', 'L': 'খ', 'M': 'গ', 'N': 'ঘ', 'O': 'ঙ',
  'P': 'চ', 'Q': 'ছ', 'R': 'জ', 'S': 'ঝ', 'T': 'ঞ',
  'U': 'ট', 'V': 'ঠ', 'W': 'ড', 'X': 'ঢ', 'Y': 'ণ',
  'Z': 'ত', '_': 'থ', '`': 'দ', 'a': 'ধ', 'b': 'ন',
  'c': 'প', 'd': 'ফ', 'e': 'ব', 'f': 'ভ', 'g': 'ম',
  'h': 'য', 'i': 'র', 'j': 'ল', 'k': 'শ', 'l': 'ষ',
  'm': 'স', 'n': 'হ', 'o': 'ড়', 'p': 'ঢ়', 'q': 'য়',
  'r': 'ৎ', 's': 'ং', 't': 'ঃ', 'u': 'ঁ',
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
  '•': 'ঙ্', '|': '।',
};

// Pre-symbols (come before the main character, map to hasanta + consonant)
const PRE_SYMBOLS_MAP: Record<string, string> = {
  '®': 'ষ্', '¯': 'স্', '\u201C': 'চ্', '˜': 'দ্', '™': 'দ্',
  'š': 'ন্', '›': 'ন্', '¤': 'ম্',
};

// Reff
const REFF: Record<string, string> = { '©': 'র্' };

// Post-symbols (come after the main character)
const POST_SYMBOLS_MAP: Record<string, string> = {
  '&': '্‌', 'ú': '্প', 'è': '্ন', '^': '্ব',
  '\u2018': '্তু', '\u2019': '্থ', '‹': '্ক', 'Œ': '্ক্র',
  '—': '্ত', 'Í': '্ত', 'œ': '্ন', 'Ÿ': '্ব',
  '¡': '্ব', '¢': '্ভ', '£': '্ভ্র', '¥': '্ম',
  '¦': '্ব', '§': '্ম', '¨': '্য', 'ª': '্র',
  '«': '্র', '¬': '্ল', '­': '্ল', 'Ö': '্র',
};

// Vowel signs (kaars)
const KAARS: Record<string, string> = {
  'v': 'া', 'w': 'ি', 'x': 'ী', 'y': 'ু', 'z': 'ু',
  'æ': 'ু', '\u201C': 'ু', '–': 'ু', '~': 'ূ', 'ƒ': 'ূ',
  '‚': 'ূ', '„': 'ৃ', '…': 'ৃ', '†': 'ে', '‡': 'ে',
  'ˆ': 'ৈ', '‰': 'ৈ', 'Š': 'ৗ',
};

// Post-kaar conversion
const KAAR_POST_CONVERSION: Record<string, string> = {
  'ো': 'ো', 'ৌ': 'ৌ',
};

// Post-conversion cleanup
const POST_CONVERSION_MAP: Record<string, string> = {
  'অা': 'আ', '্‌্‌': '্‌',
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createPattern(symbols: Record<string, string>, delimiter = '') {
  return Object.keys(symbols).map(escapeRegExp).join(delimiter);
}

const ALL_SYMBOLS = { ...CONVERSION_MAP, ...PRE_SYMBOLS_MAP, ...POST_SYMBOLS_MAP };

export function bijoyToUnicode(text: string): string {
  if (!text) return '';
  try {
    // Pre-conversion
    let result = text;
    for (const [k, v] of Object.entries(PRE_CONVERSION_MAP)) {
      result = result.split(k).join(v);
    }

    const SYMBOLS_PATTERN = new RegExp('[' + createPattern(ALL_SYMBOLS) + ']', 'g');
    const replaceSymbol = (m: string) => ALL_SYMBOLS[m] || '';

    const preKeys = createPattern(PRE_SYMBOLS_MAP);
    const convKeys = createPattern(CONVERSION_MAP);
    const postKeys = createPattern(POST_SYMBOLS_MAP);
    const reffKeys = createPattern(REFF);
    const kaarKeys = 'ævxyz\u201C\u2013~\u0192\u201A\u201E\u2026';

    const MAIN_PATTERN = new RegExp(
      '([w\u2020\u2021\u02C6\u2030\u0160]?)' +
      '(([' + preKeys + '])*([' + convKeys + '])?([' + postKeys + '])*)' +
      '([' + reffKeys + '])?' +
      '([' + kaarKeys + ']?)' +
      '([' + postKeys + '])*',
      'g'
    );

    const HASAANT_PATTERN = new RegExp('(' + escapeRegExp('্') + ')+');

    result = result.replace(MAIN_PATTERN, (
      _match, preKaar, mUnit, _g3, _g4, _g5, reff, postKaar, postPhala
    ) => {
      let core = (mUnit || '').replace(SYMBOLS_PATTERN, replaceSymbol);
      core = core.replace(HASAANT_PATTERN, () => '্');
      core = reff ? 'র্' + core : core;
      core = postPhala ? core + (POST_SYMBOLS_MAP[postPhala] || '') : core;
      const kaarStr = (preKaar ? (KAARS[preKaar] || '') : '') + (postKaar ? (KAARS[postKaar] || '') : '');
      core = core + (KAAR_POST_CONVERSION[kaarStr] || kaarStr);
      return core;
    });

    // Post-conversion
    for (const [k, v] of Object.entries(POST_CONVERSION_MAP)) {
      result = result.split(k).join(v);
    }

    return result;
  } catch {
    return text;
  }
}

// Unicode to Bijoy - build reverse map from the main CONVERSION_MAP
const U2B_MAP: Record<string, string> = {};
// Build reverse: prefer single-char mappings
for (const [b, u] of Object.entries(CONVERSION_MAP)) {
  if (!U2B_MAP[u]) U2B_MAP[u] = b;
}

export function unicodeToBijoy(text: string): string {
  if (!text) return '';
  try {
    let result = text;
    // Reverse post-conversion first
    result = result.split('আ').join('অা');
    // Sort by unicode string length descending to match longer sequences first
    const entries = Object.entries(U2B_MAP).sort((a, b) => b[0].length - a[0].length);
    for (const [u, b] of entries) {
      result = result.split(u).join(b);
    }
    return result;
  } catch {
    return text;
  }
}

// ==================== Bangla ↔ English Transliteration ====================

const BN_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};
const EN_DIGITS: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};

// Bangla to English: process conjuncts first, then consonant+vowel combinations
const BN_TO_EN: [string, string][] = [
  // Conjuncts (যুক্তবর্ণ)
  ['ক্ষ', 'kkho'], ['জ্ঞ', 'gyo'], ['ঞ্চ', 'ncho'], ['ঞ্ছ', 'nchho'],
  ['ঞ্জ', 'njo'], ['ঞ্ঝ', 'njho'], ['ঙ্ক', 'ngko'], ['ঙ্গ', 'nggo'],
  ['ক্ক', 'kko'], ['ক্ট', 'kTo'], ['ক্ত', 'kto'], ['ক্ম', 'kmo'],
  ['ক্র', 'kro'], ['ক্স', 'kso'], ['গ্দ', 'gdo'], ['গ্ধ', 'gdho'],
  ['জ্জ', 'jjo'], ['জ্ঝ', 'jjho'], ['ট্ট', 'TTo'], ['ড্ড', 'DDo'],
  ['ণ্ট', 'NTo'], ['ণ্ঠ', 'NTho'], ['ণ্ড', 'NDo'], ['ত্ত', 'tto'],
  ['ত্থ', 'ttho'], ['ত্র', 'tro'], ['দ্দ', 'ddo'], ['দ্ধ', 'ddho'],
  ['দ্ব', 'dbo'], ['দ্ম', 'dmo'], ['ন্ঠ', 'nTho'], ['ন্ড', 'nDo'],
  ['ন্ধ', 'ndho'], ['ন্ত', 'nto'], ['ন্দ', 'ndo'], ['ন্স', 'nso'],
  ['ন্ন', 'nno'], ['প্ট', 'pTo'], ['প্ত', 'pto'], ['প্প', 'ppo'],
  ['প্র', 'pro'], ['প্স', 'pso'], ['ব্জ', 'bjo'], ['ব্দ', 'bdo'],
  ['ব্ধ', 'bdho'], ['ব্র', 'bro'], ['ভ্র', 'bhro'], ['ম্ফ', 'mpho'],
  ['ম্প', 'mpo'], ['ম্ব', 'mbo'], ['ল্ক', 'lko'], ['ল্গ', 'lgo'],
  ['ল্ট', 'lTo'], ['ল্ড', 'lDo'], ['ল্প', 'lpo'], ['ল্ফ', 'lpho'],
  ['ল্ল', 'llo'], ['শ্চ', 'shcho'], ['শ্ছ', 'shchho'], ['ষ্ণ', 'ShNo'],
  ['ষ্ট', 'ShTo'], ['ষ্ঠ', 'ShTho'], ['ষ্ফ', 'ShPho'], ['স্খ', 'skho'],
  ['স্ট', 'sTo'], ['স্ন', 'sno'], ['স্ত', 'sto'], ['স্থ', 'stho'],
  ['স্ফ', 'spho'], ['স্ক', 'sko'], ['স্প', 'spo'], ['স্র', 'sro'],
  ['হ্ন', 'hno'], ['হ্ম', 'hmo'], ['শ্র', 'shro'],
  // Vowel signs (dependent)
  ['ৌ', 'ou'], ['ো', 'o'], ['ৈ', 'oi'], ['ৗ', 'ou'],
  ['া', 'a'], ['ি', 'i'], ['ী', 'ee'], ['ু', 'u'], ['ূ', 'oo'],
  ['ৃ', 'ri'], ['ে', 'e'],
  ['্', ''],
  // Independent vowels
  ['আ', 'A'], ['অ', 'O'], ['ই', 'I'], ['ঈ', 'Ee'],
  ['উ', 'U'], ['ঊ', 'Oo'], ['ঋ', 'Ri'], ['এ', 'E'],
  ['ঐ', 'Oi'], ['ও', 'O'], ['ঔ', 'Ou'],
  // Consonants
  ['ক', 'k'], ['খ', 'kh'], ['গ', 'g'], ['ঘ', 'gh'], ['ঙ', 'ng'],
  ['চ', 'ch'], ['ছ', 'chh'], ['জ', 'j'], ['ঝ', 'jh'], ['ঞ', 'n'],
  ['ট', 'T'], ['ঠ', 'Th'], ['ড', 'D'], ['ঢ', 'Dh'], ['ণ', 'N'],
  ['ত', 't'], ['থ', 'th'], ['দ', 'd'], ['ধ', 'dh'], ['ন', 'n'],
  ['প', 'p'], ['ফ', 'ph'], ['ব', 'b'], ['ভ', 'bh'], ['ম', 'm'],
  ['য', 'z'], ['র', 'r'], ['ল', 'l'], ['শ', 'sh'], ['ষ', 'Sh'],
  ['স', 's'], ['হ', 'h'], ['ড়', 'R'], ['ঢ়', 'Rh'], ['য়', 'y'],
  ['ৎ', 't'], ['ং', 'ng'], ['ঃ', 'h'], ['ঁ', 'n'],
  ['।', '.'],
];

export function banglaToEnglish(text: string): string {
  if (!text) return '';
  let result = text;
  // Convert digits
  for (const [bn, en] of Object.entries(BN_DIGITS)) {
    result = result.split(bn).join(en);
  }
  // Sort by length descending for longest match first
  const sorted = [...BN_TO_EN].sort((a, b) => b[0].length - a[0].length);
  for (const [bn, en] of sorted) {
    result = result.split(bn).join(en);
  }
  return result;
}

// English to Bangla phonetic mapping
const EN_TO_BN: [RegExp, string][] = [
  // Multi-char first (order matters)
  [/kk?ho/gi, 'খ'], [/gho/gi, 'ঘ'], [/chh?o/gi, 'ছ'], [/cho/gi, 'চ'],
  [/jho/gi, 'ঝ'], [/Th/g, 'ঠ'], [/Dh/g, 'ঢ'],
  [/tho/gi, 'থ'], [/dho/gi, 'ধ'], [/pho/gi, 'ফ'],
  [/bho/gi, 'ভ'], [/sho/gi, 'শ'], [/ngo/gi, 'ঙ'],
  [/kh/gi, 'খ'], [/gh/gi, 'ঘ'], [/ch/gi, 'চ'],
  [/jh/gi, 'ঝ'], [/th/gi, 'থ'], [/dh/gi, 'ধ'],
  [/ph/gi, 'ফ'], [/bh/gi, 'ভ'], [/sh/gi, 'শ'],
  [/ng/gi, 'ং'],
  [/ee/gi, 'ী'], [/oo/gi, 'ূ'], [/ou/gi, 'ৌ'], [/oi/gi, 'ৈ'],
  [/ko/gi, 'ক'], [/go/gi, 'গ'], [/jo/gi, 'জ'], [/to/gi, 'ত'],
  [/do/gi, 'দ'], [/no/gi, 'ন'], [/po/gi, 'প'], [/bo/gi, 'ব'],
  [/mo/gi, 'ম'], [/ro/gi, 'র'], [/lo/gi, 'ল'], [/so/gi, 'স'],
  [/ho/gi, 'হ'], [/yo/gi, 'য়'],
  [/k/gi, 'ক'], [/g/gi, 'গ'], [/c/gi, 'চ'],
  [/j/gi, 'জ'], [/t/gi, 'ত'], [/d/gi, 'দ'],
  [/n/gi, 'ন'], [/p/gi, 'প'], [/f/gi, 'ফ'],
  [/b/gi, 'ব'], [/m/gi, 'ম'], [/r/gi, 'র'],
  [/l/gi, 'ল'], [/s/gi, 'স'], [/h/gi, 'হ'],
  [/y/gi, 'য়'], [/z/gi, 'য'],
  [/a/gi, 'া'], [/i/gi, 'ি'], [/u/gi, 'ু'],
  [/e/gi, 'ে'], [/o/gi, 'ো'],
];

export function englishToBangla(text: string): string {
  if (!text) return '';
  let result = text;
  // Convert digits
  for (const [en, bn] of Object.entries(EN_DIGITS)) {
    result = result.split(en).join(bn);
  }
  for (const [pattern, replacement] of EN_TO_BN) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
