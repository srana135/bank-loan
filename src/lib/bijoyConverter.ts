/**
 * Bijoy ANSI ↔ Unicode Bangla converter
 * Pure implementation — no external dependency
 */

// Bijoy to Unicode character map
const B2U_MAP: Record<string, string> = {
  'A': 'ই', 'B': 'ন', 'C': 'ঐ', 'D': 'ড', 'E': 'ৈ', 'F': 'ঞ',
  'G': 'ঘ', 'H': 'খ', 'I': 'হ', 'J': 'জ', 'K': 'ক', 'L': 'ল',
  'M': 'ম', 'N': 'ণ', 'O': 'ে', 'P': 'প', 'Q': 'ঊ', 'R': 'চ',
  'S': 'শ', 'T': 'ট', 'U': 'ূ', 'V': 'ভ', 'W': 'ও', 'X': 'ঢ',
  'Y': 'য', 'Z': 'আ',
  'a': 'া', 'b': 'ব', 'c': 'চ', 'd': 'দ', 'e': 'ে', 'f': 'ফ',
  'g': 'গ', 'h': 'হ', 'i': 'ি', 'j': 'জ', 'k': 'ক', 'l': 'ল',
  'm': 'ম', 'n': 'ন', 'o': 'ো', 'p': 'প', 'q': 'ঙ', 'r': 'র',
  's': 'স', 't': 'ত', 'u': 'ু', 'v': 'ভ', 'w': 'ও', 'x': 'এ',
  'y': 'য়', 'z': 'য',
};

// Extended Bijoy codes (multi-byte or special)
const B2U_SPECIAL: [string, string][] = [
  ['š', 'ষ'], ['›', '্'], ['œ', 'ঠ'], ['\u0192', 'ঃ'],
  ['•', 'ূ'], ['Š', 'ঈ'], ['Ÿ', 'ঢ'], ['¡', 'অ'],
  ['¤', 'উ'], ['©', 'ছ'], ['¨', 'ঝ'], ['®', 'ঋ'],
  ['°', 'ং'], ['±', 'ঁ'], ['²', 'থ'], ['³', 'ধ'],
  ['´', 'ড়'], ['µ', 'ঢ়'], ['¶', 'ৎ'], ['·', 'ঔ'],
  ['~', 'ঁ'], ['&', '&'],
];

// Simple Bijoy to Unicode conversion
export function bijoyToUnicode(text: string): string {
  if (!text) return '';
  try {
    let result = text;
    // Apply special mappings first (longer sequences)
    for (const [bijoy, unicode] of B2U_SPECIAL) {
      result = result.split(bijoy).join(unicode);
    }
    // Apply single character mappings
    let output = '';
    for (let i = 0; i < result.length; i++) {
      const ch = result[i];
      output += B2U_MAP[ch] || ch;
    }
    return output;
  } catch {
    return text;
  }
}

// Unicode to Bijoy - reverse mapping
const U2B_MAP: Record<string, string> = {};
for (const [b, u] of Object.entries(B2U_MAP)) {
  if (!U2B_MAP[u]) U2B_MAP[u] = b;
}
for (const [b, u] of B2U_SPECIAL) {
  if (!U2B_MAP[u]) U2B_MAP[u] = b;
}

export function unicodeToBijoy(text: string): string {
  if (!text) return '';
  try {
    let output = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      output += U2B_MAP[ch] || ch;
    }
    return output;
  } catch {
    return text;
  }
}

// Bangla number/text transliteration
const BN_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};
const EN_DIGITS: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};

// Phonetic Bangla to English transliteration - conjuncts first
const BN_TO_EN_MAP: [RegExp, string][] = [
  [/ক্ষ/g, 'kkho'], [/জ্ঞ/g, 'ggo'], [/ঞ্চ/g, 'ncho'], [/ঞ্জ/g, 'njo'],
  [/ঙ্ক/g, 'nko'], [/ঙ্গ/g, 'ngo'], [/ক্ক/g, 'kko'], [/ক্ট/g, 'kto'],
  [/ক্র/g, 'kro'], [/ক্ল/g, 'klo'], [/ত্র/g, 'tro'], [/দ্র/g, 'dro'],
  [/প্র/g, 'pro'], [/ব্র/g, 'bro'], [/শ্র/g, 'shro'], [/স্র/g, 'sro'],
  [/ন্ত/g, 'nto'], [/ন্দ/g, 'ndo'], [/ম্প/g, 'mpo'], [/ম্ব/g, 'mbo'],
  [/স্ত/g, 'sto'], [/স্থ/g, 'stho'], [/ন্ন/g, 'nno'], [/ল্ল/g, 'llo'],
  [/ত্ত/g, 'tto'], [/দ্দ/g, 'ddo'], [/স্ক/g, 'sko'], [/স্প/g, 'spo'],
  // Vowels (independent)
  [/অ/g, 'o'], [/আ/g, 'a'], [/ই/g, 'i'], [/ঈ/g, 'ee'],
  [/উ/g, 'u'], [/ঊ/g, 'oo'], [/ঋ/g, 'ri'], [/এ/g, 'e'],
  [/ঐ/g, 'oi'], [/ও/g, 'o'], [/ঔ/g, 'ou'],
  // Consonants
  [/ক/g, 'ko'], [/খ/g, 'kho'], [/গ/g, 'go'], [/ঘ/g, 'gho'], [/ঙ/g, 'ngo'],
  [/চ/g, 'cho'], [/ছ/g, 'chho'], [/জ/g, 'jo'], [/ঝ/g, 'jho'], [/ঞ/g, 'no'],
  [/ট/g, 'to'], [/ঠ/g, 'tho'], [/ড/g, 'do'], [/ঢ/g, 'dho'], [/ণ/g, 'no'],
  [/ত/g, 'to'], [/থ/g, 'tho'], [/দ/g, 'do'], [/ধ/g, 'dho'], [/ন/g, 'no'],
  [/প/g, 'po'], [/ফ/g, 'pho'], [/ব/g, 'bo'], [/ভ/g, 'bho'], [/ম/g, 'mo'],
  [/য/g, 'jo'], [/র/g, 'ro'], [/ল/g, 'lo'], [/শ/g, 'sho'], [/ষ/g, 'sho'],
  [/স/g, 'so'], [/হ/g, 'ho'], [/ড়/g, 'ro'], [/ঢ়/g, 'rho'], [/য়/g, 'yo'],
  [/ৎ/g, 't'], [/ং/g, 'ng'], [/ঃ/g, 'h'], [/ঁ/g, 'n'],
  // Vowel signs (matras)
  [/া/g, 'a'], [/ি/g, 'i'], [/ী/g, 'ee'], [/ু/g, 'u'], [/ূ/g, 'oo'],
  [/ৃ/g, 'ri'], [/ে/g, 'e'], [/ৈ/g, 'oi'], [/ো/g, 'o'], [/ৌ/g, 'ou'],
  [/্/g, ''], [/।/g, '.'],
];

// Basic English phonetic to Bangla
const EN_TO_BN_MAP: [RegExp, string][] = [
  // Multi-char first
  [/kho/gi, 'খ'], [/gho/gi, 'ঘ'], [/chho/gi, 'ছ'], [/cho/gi, 'চ'],
  [/jho/gi, 'ঝ'], [/tho/gi, 'থ'], [/dho/gi, 'ধ'], [/pho/gi, 'ফ'],
  [/bho/gi, 'ভ'], [/sho/gi, 'শ'], [/ngo/gi, 'ং'],
  [/ko/gi, 'ক'], [/go/gi, 'গ'], [/jo/gi, 'জ'], [/to/gi, 'ত'],
  [/do/gi, 'দ'], [/no/gi, 'ন'], [/po/gi, 'প'], [/bo/gi, 'ব'],
  [/mo/gi, 'ম'], [/ro/gi, 'র'], [/lo/gi, 'ল'], [/so/gi, 'স'],
  [/ho/gi, 'হ'], [/yo/gi, 'য়'],
  [/ee/gi, 'ী'], [/oo/gi, 'ূ'], [/ou/gi, 'ৌ'], [/oi/gi, 'ৈ'],
  [/ng/gi, 'ং'], [/kh/gi, 'খ'], [/gh/gi, 'ঘ'], [/ch/gi, 'চ'],
  [/jh/gi, 'ঝ'], [/th/gi, 'থ'], [/dh/gi, 'ধ'], [/ph/gi, 'ফ'],
  [/bh/gi, 'ভ'], [/sh/gi, 'শ'],
  [/k/gi, 'ক'], [/g/gi, 'গ'], [/c/gi, 'চ'],
  [/j/gi, 'জ'], [/t/gi, 'ত'], [/d/gi, 'দ'],
  [/n/gi, 'ন'], [/p/gi, 'প'], [/f/gi, 'ফ'],
  [/b/gi, 'ব'], [/m/gi, 'ম'], [/r/gi, 'র'],
  [/l/gi, 'ল'], [/s/gi, 'স'], [/h/gi, 'হ'],
  [/y/gi, 'য়'], [/z/gi, 'য'],
  [/a/gi, 'া'], [/i/gi, 'ি'], [/u/gi, 'ু'],
  [/e/gi, 'ে'], [/o/gi, 'ো'],
];

export function banglaToEnglish(text: string): string {
  if (!text) return '';
  let result = text;
  // Convert Bangla digits to English digits
  for (const [bn, en] of Object.entries(BN_DIGITS)) {
    result = result.split(bn).join(en);
  }
  // Apply transliteration rules
  for (const [pattern, replacement] of BN_TO_EN_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function englishToBangla(text: string): string {
  if (!text) return '';
  let result = text;
  // Convert English digits to Bangla digits
  for (const [en, bn] of Object.entries(EN_DIGITS)) {
    result = result.split(en).join(bn);
  }
  // Apply transliteration rules
  for (const [pattern, replacement] of EN_TO_BN_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
