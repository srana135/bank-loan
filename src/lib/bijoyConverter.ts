/**
 * Bijoy ANSI (SutonnyMJ) ↔ Unicode Bangla converter
 * + Bangla ↔ English Translation via MyMemory API
 */

// ==================== Bijoy ↔ Unicode ====================

const PRE_CONVERSION_MAP: Record<string, string> = {
  'yy': 'y', 'vv': 'v', '„„': '„', '­­': '­',
  'y&': 'y', '„&': '„', '‡u': 'u‡', 'wu': 'uw',
};

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

const PRE_SYMBOLS_MAP: Record<string, string> = {
  '®': 'ষ্', '¯': 'স্', '\u201C': 'চ্', '˜': 'দ্', '™': 'দ্',
  'š': 'ন্', '›': 'ন্', '¤': 'ম্',
};

const REFF: Record<string, string> = { '©': 'র্' };

const POST_SYMBOLS_MAP: Record<string, string> = {
  '&': '্‌', 'ú': '্প', 'è': '্ন', '^': '্ব',
  '\u2018': '্তু', '\u2019': '্থ', '‹': '্ক', 'Œ': '্ক্র',
  '—': '্ত', 'Í': '্ত', 'œ': '্ন', 'Ÿ': '্ব',
  '¡': '্ব', '¢': '্ভ', '£': '্ভ্র', '¥': '্ম',
  '¦': '্ব', '§': '্ম', '¨': '্য', 'ª': '্র',
  '«': '্র', '¬': '্ল', '­': '্ল', 'Ö': '্র',
};

const KAARS: Record<string, string> = {
  'v': 'া', 'w': 'ি', 'x': 'ী', 'y': 'ু', 'z': 'ু',
  'æ': 'ু', '\u201C': 'ু', '–': 'ু', '~': 'ূ', 'ƒ': 'ূ',
  '‚': 'ূ', '„': 'ৃ', '…': 'ৃ', '†': 'ে', '‡': 'ে',
  'ˆ': 'ৈ', '‰': 'ৈ', 'Š': 'ৗ',
};

const KAAR_POST_CONVERSION: Record<string, string> = {
  'ো': 'ো', 'ৌ': 'ৌ',
};

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

    for (const [k, v] of Object.entries(POST_CONVERSION_MAP)) {
      result = result.split(k).join(v);
    }

    return result;
  } catch {
    return text;
  }
}

const U2B_MAP: Record<string, string> = {};
for (const [b, u] of Object.entries(CONVERSION_MAP)) {
  if (!U2B_MAP[u]) U2B_MAP[u] = b;
}

export function unicodeToBijoy(text: string): string {
  if (!text) return '';
  try {
    let result = text;
    result = result.split('আ').join('অা');
    const entries = Object.entries(U2B_MAP).sort((a, b) => b[0].length - a[0].length);
    for (const [u, b] of entries) {
      result = result.split(u).join(b);
    }
    return result;
  } catch {
    return text;
  }
}

// ==================== Bangla ↔ English Translation (API) ====================

/**
 * Translate text using MyMemory free translation API
 * This does ACTUAL translation, not transliteration
 * e.g. "আমার নাম মামুন" → "My name is Mamun"
 */
export async function translateText(text: string, from: 'bn' | 'en', to: 'bn' | 'en'): Promise<string> {
  if (!text.trim()) return '';
  
  const langPair = `${from}|${to}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Translation API error');
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      let translated = data.responseData.translatedText;
      // MyMemory sometimes returns uppercase warning text - filter it
      if (translated === text || translated.includes('MYMEMORY WARNING')) {
        // Try matches array for better result
        if (data.matches && data.matches.length > 0) {
          const bestMatch = data.matches.find((m: any) => m.translation && m.translation !== text);
          if (bestMatch) translated = bestMatch.translation;
        }
      }
      return translated;
    }
    
    // Fallback: check matches
    if (data.matches && data.matches.length > 0) {
      return data.matches[0].translation || text;
    }
    
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('অনুবাদ সার্ভারে সংযোগ করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।');
  }
}

// Keep synchronous versions as fallback (phonetic transliteration)
const BN_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

export function banglaDigitsToEnglish(text: string): string {
  let result = text;
  for (const [bn, en] of Object.entries(BN_DIGITS)) {
    result = result.split(bn).join(en);
  }
  return result;
}
