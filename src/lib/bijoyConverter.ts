/**
 * Bijoy ANSI ↔ Unicode Bangla converter
 * Uses the @abdalgolabs/ansi-unicode-converter package for accurate conversion
 */
import {
  bijoyToUnicode as b2u,
  unicodeToBijoy as u2b,
} from '@abdalgolabs/ansi-unicode-converter';

export function bijoyToUnicode(text: string): string {
  try {
    return b2u(text);
  } catch {
    return text;
  }
}

export function unicodeToBijoy(text: string): string {
  try {
    return u2b(text);
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

// Phonetic Bangla to English transliteration
const BN_TO_EN_MAP: [RegExp, string][] = [
  [/ক্ষ/g, 'kkh'], [/জ্ঞ/g, 'gg'], [/ঞ্চ/g, 'nch'], [/ঞ্জ/g, 'nj'],
  [/ঙ্ক/g, 'nk'], [/ঙ্গ/g, 'ng'], [/ক্ক/g, 'kk'], [/ক্ট/g, 'kt'],
  [/ক্র/g, 'kr'], [/ক্ল/g, 'kl'],
  [/অ/g, 'o'], [/আ/g, 'a'], [/ই/g, 'i'], [/ঈ/g, 'ee'],
  [/উ/g, 'u'], [/ঊ/g, 'oo'], [/ঋ/g, 'ri'], [/এ/g, 'e'],
  [/ঐ/g, 'oi'], [/ও/g, 'o'], [/ঔ/g, 'ou'],
  [/ক/g, 'k'], [/খ/g, 'kh'], [/গ/g, 'g'], [/ঘ/g, 'gh'], [/ঙ/g, 'ng'],
  [/চ/g, 'ch'], [/ছ/g, 'chh'], [/জ/g, 'j'], [/ঝ/g, 'jh'], [/ঞ/g, 'n'],
  [/ট/g, 't'], [/ঠ/g, 'th'], [/ড/g, 'd'], [/ঢ/g, 'dh'], [/ণ/g, 'n'],
  [/ত/g, 't'], [/থ/g, 'th'], [/দ/g, 'd'], [/ধ/g, 'dh'], [/ন/g, 'n'],
  [/প/g, 'p'], [/ফ/g, 'ph'], [/ব/g, 'b'], [/ভ/g, 'bh'], [/ম/g, 'm'],
  [/য/g, 'z'], [/র/g, 'r'], [/ল/g, 'l'], [/শ/g, 'sh'], [/ষ/g, 'sh'],
  [/স/g, 's'], [/হ/g, 'h'], [/ড়/g, 'r'], [/ঢ়/g, 'rh'], [/য়/g, 'y'],
  [/ৎ/g, 't'], [/ং/g, 'ng'], [/ঃ/g, 'h'], [/ঁ/g, 'n'],
  [/া/g, 'a'], [/ি/g, 'i'], [/ী/g, 'ee'], [/ু/g, 'u'], [/ূ/g, 'oo'],
  [/ৃ/g, 'ri'], [/ে/g, 'e'], [/ৈ/g, 'oi'], [/ো/g, 'o'], [/ৌ/g, 'ou'],
  [/্/g, ''], [/।/g, '.'],
];

// Basic English phonetic to Bangla
const EN_TO_BN_MAP: [RegExp, string][] = [
  [/kh/gi, 'খ'], [/gh/gi, 'ঘ'], [/ng/gi, 'ং'], [/chh/gi, 'ছ'],
  [/ch/gi, 'চ'], [/jh/gi, 'ঝ'], [/th/gi, 'থ'], [/dh/gi, 'ধ'],
  [/ph/gi, 'ফ'], [/bh/gi, 'ভ'], [/sh/gi, 'শ'],
  [/ee/gi, 'ী'], [/oo/gi, 'ূ'], [/ou/gi, 'ৌ'], [/oi/gi, 'ৈ'],
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
  let result = text;
  for (const [bn, en] of Object.entries(BN_DIGITS)) {
    result = result.split(bn).join(en);
  }
  for (const [pattern, replacement] of BN_TO_EN_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function englishToBangla(text: string): string {
  let result = text;
  for (const [en, bn] of Object.entries(EN_DIGITS)) {
    result = result.split(en).join(bn);
  }
  for (const [pattern, replacement] of EN_TO_BN_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
