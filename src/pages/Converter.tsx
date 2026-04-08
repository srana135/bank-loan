import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Copy, ArrowRightLeft, Type, Trash2, Loader2, Globe, Languages } from 'lucide-react';
import { toast } from 'sonner';
import { bijoyToUnicode, unicodeToBijoy, translateText } from '@/lib/bijoyConverter';

type ConverterMode = 'bijoy-unicode' | 'unicode-bijoy' | 'bn-en' | 'en-bn';

const MODES: { value: ConverterMode; label: string; from: string; to: string; icon: typeof Type }[] = [
  { value: 'bijoy-unicode', label: 'Bijoy → Unicode', from: 'ANSI Bijoy Text', to: 'Unicode Bangla', icon: Type },
  { value: 'unicode-bijoy', label: 'Unicode → Bijoy', from: 'Unicode Bangla', to: 'ANSI Bijoy Text', icon: Type },
  { value: 'bn-en', label: 'বাংলা → English', from: 'বাংলা টেক্সট', to: 'English Translation', icon: Globe },
  { value: 'en-bn', label: 'English → বাংলা', from: 'English Text', to: 'বাংলা অনুবাদ', icon: Languages },
];

const Converter = () => {
  const [mode, setMode] = useState<ConverterMode>('bijoy-unicode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const convert = async () => {
    if (!input.trim()) { toast.error('টেক্সট লিখুন'); return; }
    
    try {
      if (mode === 'bijoy-unicode') {
        setOutput(bijoyToUnicode(input));
        toast.success('রূপান্তর সম্পন্ন');
      } else if (mode === 'unicode-bijoy') {
        setOutput(unicodeToBijoy(input));
        toast.success('রূপান্তর সম্পন্ন');
      } else if (mode === 'bn-en') {
        setLoading(true);
        const result = await translateText(input, 'bn', 'en');
        setOutput(result);
        toast.success('অনুবাদ সম্পন্ন');
      } else if (mode === 'en-bn') {
        setLoading(true);
        const result = await translateText(input, 'en', 'bn');
        setOutput(result);
        toast.success('Translation complete');
      }
    } catch (err: any) {
      toast.error(err.message || 'রূপান্তরে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
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
  const isTranslation = mode === 'bn-en' || mode === 'en-bn';

  return (
    <div className="container py-6 space-y-6">
      <div className="text-center">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Text Converter & Translator</h1>
        <p className="text-sm text-muted-foreground mt-1">Bijoy ↔ Unicode · বাংলা ↔ English Translation</p>
      </div>

      <Card className="max-w-3xl mx-auto card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <currentMode.icon className="h-5 w-5 text-primary" />
            {isTranslation ? 'Translator' : 'Converter'}
            {isTranslation && <Badge variant="secondary" className="text-[10px]">API</Badge>}
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
                <span className="text-[10px] text-muted-foreground">{input.length} chars</span>
              </div>
              <Textarea
                placeholder={isTranslation
                  ? (mode === 'bn-en' ? 'বাংলা লেখা এখানে লিখুন...\nযেমন: আমার নাম মামুন' : 'Type English text here...\ne.g. My name is Mamun')
                  : `${currentMode.from} এখানে লিখুন বা পেস্ট করুন...`}
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
                placeholder={isTranslation ? 'অনুবাদ এখানে দেখা যাবে...' : 'রূপান্তরিত টেক্সট এখানে দেখা যাবে...'}
              />
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={convert} disabled={loading} className="gap-2 min-w-[140px]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isTranslation ? 'Translate' : 'Convert'}
            </Button>
            <Button variant="outline" onClick={swap} className="gap-2" disabled={loading}>
              <ArrowRightLeft className="h-4 w-4" /> Swap
            </Button>
            <Button variant="ghost" onClick={clear} className="gap-2" disabled={loading}>
              <Trash2 className="h-4 w-4" /> Clear
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>• <strong>Bijoy ↔ Unicode:</strong> ANSI Bijoy encoding এবং Unicode Bangla এর মধ্যে রূপান্তর</p>
            <p>• <strong>বাংলা ↔ English:</strong> সম্পূর্ণ অনুবাদ (Translation) — যেমন: "আমার নাম মামুন" → "My name is Mamun"</p>
            {isTranslation && <p className="text-primary/70">🌐 অনুবাদের জন্য ইন্টারনেট সংযোগ প্রয়োজন</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Converter;
