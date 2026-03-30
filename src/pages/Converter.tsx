import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Copy, ArrowRightLeft, Type } from 'lucide-react';
import { toast } from 'sonner';

// Bijoy to Unicode mapping (ANSI Bijoy character codes to Unicode Bangla)
const BIJOY_TO_UNICODE_MAP: Record<string, string> = {
  'Av': 'অ', 'Aw': 'আ', 'B': 'ই', 'C': 'ঈ', 'D': 'উ', 'E': 'ঊ',
  'F': 'ঋ', 'G': 'এ', 'H': 'ঐ', 'I': 'ও', 'J': 'ঔ',
  'K': 'ক', 'L': 'খ', 'M': 'গ', 'N': 'ঘ', 'O': 'ঙ',
  'P': 'চ', 'Q': 'ছ', 'R': 'জ', 'S': 'ঝ', 'T': 'ঞ',
  'U': 'ট', 'V': 'ঠ', 'W': 'ড', 'X': 'ঢ', 'Y': 'ণ',
  'Z': 'ত', '[': 'থ', '\\': 'দ', ']': 'ধ', '^': 'ন',
  '_': 'প', '`': 'ফ', 'a': 'ব', 'b': 'ভ', 'c': 'ম',
  'd': 'য', 'e': 'র', 'f': 'ল', 'g': 'শ', 'h': 'ষ',
  'i': 'স', 'j': 'হ', 'k': 'ড়', 'l': 'ঢ়', 'm': 'য়',
  'n': 'ৎ', 'o': 'ং', 'p': 'ঃ', 'q': 'ঁ',
  '‡': 'া', '†': 'ি', '…': 'ী', '~': 'ু', 'ƒ': 'ূ',
  '„': 'ৃ', '‰': 'ে', 'ˆ': 'ৈ', '‹': 'ো', 'Š': 'ৌ',
  '©': '্',
};

function bijoyToUnicode(text: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    // Try two-character match first
    if (i + 1 < text.length) {
      const two = text[i] + text[i + 1];
      if (BIJOY_TO_UNICODE_MAP[two]) {
        result += BIJOY_TO_UNICODE_MAP[two];
        i += 2;
        continue;
      }
    }
    // Single character match
    if (BIJOY_TO_UNICODE_MAP[text[i]]) {
      result += BIJOY_TO_UNICODE_MAP[text[i]];
    } else {
      result += text[i];
    }
    i++;
  }
  return result;
}

function unicodeToBijoy(text: string): string {
  const reverseMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(BIJOY_TO_UNICODE_MAP)) {
    reverseMap[v] = k;
  }
  let result = '';
  for (const ch of text) {
    result += reverseMap[ch] || ch;
  }
  return result;
}

// Bangla number/text transliteration
const BN_DIGITS: Record<string, string> = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
const EN_DIGITS: Record<string, string> = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };

// Phonetic Bangla to English transliteration (basic)
const BN_TO_EN_MAP: [RegExp, string][] = [
  [/ক্ষ/g, 'kkh'], [/জ্ঞ/g, 'gg'], [/ঞ্চ/g, 'nch'], [/ঞ্জ/g, 'nj'],
  [/ঙ্ক/g, 'nk'], [/ঙ্গ/g, 'ng'], [/ক্ক/g, 'kk'], [/ক্ট/g, 'kt'],
  [/ক্র/g, 'kr'], [/ক্ল/g, 'kl'], [/ক্ষ/g, 'kkh'],
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

function banglaToEnglish(text: string): string {
  let result = text;
  // Convert Bangla digits
  for (const [bn, en] of Object.entries(BN_DIGITS)) {
    result = result.replaceAll(bn, en);
  }
  // Convert Bangla text
  for (const [pattern, replacement] of BN_TO_EN_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function englishToBangla(text: string): string {
  let result = text;
  // Convert English digits
  for (const [en, bn] of Object.entries(EN_DIGITS)) {
    result = result.replaceAll(en, bn);
  }
  // Convert English text (phonetic)
  for (const [pattern, replacement] of EN_TO_BN_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

type ConverterMode = 'bijoy-unicode' | 'unicode-bijoy' | 'bn-en' | 'en-bn';

const MODES: { value: ConverterMode; label: string; from: string; to: string }[] = [
  { value: 'bijoy-unicode', label: 'Bijoy → Unicode', from: 'ANSI Bijoy Text', to: 'Unicode Bangla' },
  { value: 'unicode-bijoy', label: 'Unicode → Bijoy', from: 'Unicode Bangla', to: 'ANSI Bijoy Text' },
  { value: 'bn-en', label: 'বাংলা → English', from: 'Bangla Text', to: 'English Transliteration' },
  { value: 'en-bn', label: 'English → বাংলা', from: 'English Text', to: 'Bangla Phonetic' },
];

const Converter = () => {
  const [mode, setMode] = useState<ConverterMode>('bijoy-unicode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const convert = () => {
    if (!input.trim()) { toast.error('Please enter text to convert'); return; }
    let result = '';
    switch (mode) {
      case 'bijoy-unicode': result = bijoyToUnicode(input); break;
      case 'unicode-bijoy': result = unicodeToBijoy(input); break;
      case 'bn-en': result = banglaToEnglish(input); break;
      case 'en-bn': result = englishToBangla(input); break;
    }
    setOutput(result);
  };

  const copyOutput = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => toast.success('Copied to clipboard'));
  };

  const swap = () => {
    setInput(output);
    setOutput('');
    // Swap mode
    const swapMap: Record<string, ConverterMode> = {
      'bijoy-unicode': 'unicode-bijoy',
      'unicode-bijoy': 'bijoy-unicode',
      'bn-en': 'en-bn',
      'en-bn': 'bn-en',
    };
    setMode(swapMap[mode]);
  };

  const currentMode = MODES.find(m => m.value === mode)!;

  return (
    <div className="container py-6 space-y-6">
      <div className="text-center">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Text Converter</h1>
        <p className="text-sm text-muted-foreground mt-1">Bijoy ↔ Unicode · Bangla ↔ English</p>
      </div>

      <Card className="max-w-3xl mx-auto card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Type className="h-5 w-5 text-primary" /> Converter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={v => { setMode(v as ConverterMode); setOutput(''); }}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-4">
              {MODES.map(m => (
                <TabsTrigger key={m.value} value={m.value} className="text-xs sm:text-sm">
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">{currentMode.from}</Badge>
              </div>
              <Textarea
                placeholder={`Enter ${currentMode.from} here...`}
                value={input}
                onChange={e => setInput(e.target.value)}
                className="min-h-[200px] text-sm"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">{currentMode.to}</Badge>
                {output && (
                  <Button variant="ghost" size="sm" onClick={copyOutput} className="gap-1 h-6 text-xs">
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                )}
              </div>
              <Textarea
                value={output}
                readOnly
                className="min-h-[200px] text-sm bg-muted/30"
                placeholder="Converted text will appear here..."
              />
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={convert} className="gap-2 min-w-[140px]">
              Convert
            </Button>
            <Button variant="outline" onClick={swap} className="gap-2">
              <ArrowRightLeft className="h-4 w-4" /> Swap
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>• Bijoy ↔ Unicode: Converts between ANSI Bijoy encoding and Unicode Bangla</p>
            <p>• Bangla ↔ English: Phonetic transliteration (including number conversion)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Converter;
