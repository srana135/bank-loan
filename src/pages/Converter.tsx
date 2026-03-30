import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Copy, ArrowRightLeft, Type, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { bijoyToUnicode, unicodeToBijoy, banglaToEnglish, englishToBangla } from '@/lib/bijoyConverter';

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
    if (!input.trim()) { toast.error('টেক্সট লিখুন'); return; }
    let result = '';
    switch (mode) {
      case 'bijoy-unicode': result = bijoyToUnicode(input); break;
      case 'unicode-bijoy': result = unicodeToBijoy(input); break;
      case 'bn-en': result = banglaToEnglish(input); break;
      case 'en-bn': result = englishToBangla(input); break;
    }
    setOutput(result);
    toast.success('রূপান্তর সম্পন্ন');
  };

  const copyOutput = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => toast.success('কপি হয়েছে'));
  };

  const swap = () => {
    setInput(output);
    setOutput('');
    const swapMap: Record<string, ConverterMode> = {
      'bijoy-unicode': 'unicode-bijoy',
      'unicode-bijoy': 'bijoy-unicode',
      'bn-en': 'en-bn',
      'en-bn': 'bn-en',
    };
    setMode(swapMap[mode]);
  };

  const clear = () => { setInput(''); setOutput(''); };

  const currentMode = MODES.find(m => m.value === mode)!;

  return (
    <div className="container py-6 space-y-6">
      <div className="text-center">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Text Converter</h1>
        <p className="text-sm text-muted-foreground mt-1">Bijoy ↔ Unicode · বাংলা ↔ English</p>
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
                placeholder={`${currentMode.from} এখানে লিখুন বা পেস্ট করুন...`}
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
                placeholder="রূপান্তরিত টেক্সট এখানে দেখা যাবে..."
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
            <Button variant="ghost" onClick={clear} className="gap-2">
              <Trash2 className="h-4 w-4" /> Clear
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>• Bijoy ↔ Unicode: ANSI Bijoy encoding এবং Unicode Bangla এর মধ্যে রূপান্তর</p>
            <p>• বাংলা ↔ English: ফোনেটিক ট্রান্সলিটারেশন (সংখ্যা রূপান্তর সহ)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Converter;
