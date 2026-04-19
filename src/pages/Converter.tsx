import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Copy, ArrowRightLeft, Type, Trash2, Loader2, Globe, Languages, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { bijoyToUnicode, unicodeToBijoy, translateText } from '@/lib/bijoyConverter';
import * as XLSX from 'xlsx';

type ConverterMode = 'bijoy-unicode' | 'unicode-bijoy' | 'bn-en' | 'en-bn' | 'pdf-excel';

const MODES: { value: ConverterMode; label: string; from: string; to: string; icon: typeof Type }[] = [
  { value: 'bijoy-unicode', label: 'Bijoy → Unicode', from: 'ANSI Bijoy Text', to: 'Unicode Bangla', icon: Type },
  { value: 'unicode-bijoy', label: 'Unicode → Bijoy', from: 'Unicode Bangla', to: 'ANSI Bijoy Text', icon: Type },
  { value: 'bn-en', label: 'বাংলা → English', from: 'বাংলা টেক্সট', to: 'English Translation', icon: Globe },
  { value: 'en-bn', label: 'English → বাংলা', from: 'English Text', to: 'বাংলা অনুবাদ', icon: Languages },
  { value: 'pdf-excel', label: 'PDF → Excel', from: 'Upload PDF', to: 'Download Excel', icon: FileSpreadsheet },
];

interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const Converter = () => {
  const [mode, setMode] = useState<ConverterMode>('bijoy-unicode');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfStatus, setPdfStatus] = useState('');

  const convert = async () => {
    if (mode === 'pdf-excel') return; // handled by separate button
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

  // Cluster items into rows by Y proximity, then columns by X gaps → table-like grid
  const itemsToRows = (items: PdfTextItem[]): string[][] => {
    if (items.length === 0) return [];
    const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: PdfTextItem[][] = [];
    const yTol = (sorted[0].height || 10) * 0.6;
    for (const it of sorted) {
      const last = rows[rows.length - 1];
      if (last && Math.abs(last[0].y - it.y) <= yTol) last.push(it);
      else rows.push([it]);
    }
    return rows.map(r => r.sort((a, b) => a.x - b.x).map(c => c.str));
  };

  // Detect tables: rows with 3+ columns AND at least 2 consecutive such rows
  const splitTablesAndText = (rows: { cells: string[]; raw: PdfTextItem[] }[]) => {
    const result: Array<{ type: 'table' | 'paragraph'; data: string[][] | string }> = [];
    let i = 0;
    while (i < rows.length) {
      const isTableRow = (r: { cells: string[] }) => r.cells.length >= 3;
      if (isTableRow(rows[i]) && i + 1 < rows.length && isTableRow(rows[i + 1])) {
        const tableRows: string[][] = [];
        while (i < rows.length && isTableRow(rows[i])) {
          tableRows.push(rows[i].cells);
          i++;
        }
        result.push({ type: 'table', data: tableRows });
      } else {
        const para = rows[i].cells.join(' ').trim();
        if (para) result.push({ type: 'paragraph', data: para });
        i++;
      }
    }
    return result;
  };

  const convertPdfToExcel = async () => {
    if (!pdfFile) { toast.error('Please select a PDF file'); return; }
    setLoading(true);
    setPdfStatus('Loading PDF...');
    try {
      const pdfjsLib: any = await import('pdfjs-dist/build/pdf.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const buf = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

      // Pass 1: extract per-page rows + detect blocks
      type PageData = {
        pageNum: number;
        blocks: Array<{ type: 'table' | 'paragraph'; data: string[][] | string }>;
      };
      const pagesData: PageData[] = [];

      for (let p = 1; p <= pdf.numPages; p++) {
        setPdfStatus(`Reading page ${p}/${pdf.numPages}...`);
        const page = await pdf.getPage(p);
        const tc = await page.getTextContent();
        const items: PdfTextItem[] = tc.items.map((it: any) => ({
          str: it.str,
          x: it.transform[4],
          y: it.transform[5],
          width: it.width || 0,
          height: it.height || Math.abs(it.transform[3]) || 10,
        })).filter((it: PdfTextItem) => it.str && it.str.trim());

        const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
        const rowGroups: PdfTextItem[][] = [];
        const yTol = ((sorted[0]?.height) || 10) * 0.6;
        for (const it of sorted) {
          const last = rowGroups[rowGroups.length - 1];
          if (last && Math.abs(last[0].y - it.y) <= yTol) last.push(it);
          else rowGroups.push([it]);
        }
        const rows = rowGroups.map(group => {
          const sortedByX = group.sort((a, b) => a.x - b.x);
          const cells: string[] = [];
          let cur = sortedByX[0].str;
          let prevEnd = sortedByX[0].x + sortedByX[0].width;
          for (let k = 1; k < sortedByX.length; k++) {
            const gap = sortedByX[k].x - prevEnd;
            if (gap > (sortedByX[k].height || 10) * 0.8) {
              cells.push(cur.trim());
              cur = sortedByX[k].str;
            } else {
              cur += ' ' + sortedByX[k].str;
            }
            prevEnd = sortedByX[k].x + sortedByX[k].width;
          }
          cells.push(cur.trim());
          return { cells: cells.filter(c => c.length > 0), raw: group };
        }).filter(r => r.cells.length > 0);

        pagesData.push({ pageNum: p, blocks: splitTablesAndText(rows) });
      }

      // Determine the maximum column count across ALL tables (consistent column mapping)
      let maxCols = 1;
      for (const pg of pagesData) {
        for (const b of pg.blocks) {
          if (b.type === 'table') {
            for (const row of b.data as string[][]) {
              if (row.length > maxCols) maxCols = row.length;
            }
          }
        }
      }
      const padRow = (r: string[]) => {
        const out = [...r];
        while (out.length < maxCols) out.push('');
        return out;
      };

      // Build single combined sheet
      const sheetRows: string[][] = [];

      // PAGE 1: paragraphs above first table, then table rows
      const firstPage = pagesData[0];
      if (firstPage) {
        const firstTableIdx = firstPage.blocks.findIndex(b => b.type === 'table');
        const headerBlocks = firstTableIdx === -1 ? firstPage.blocks : firstPage.blocks.slice(0, firstTableIdx);
        for (const b of headerBlocks) {
          if (b.type === 'paragraph') {
            const text = (b.data as string).trim();
            if (text) sheetRows.push(padRow([text]));
          } else {
            // unlikely — but fallback to table cells
            for (const row of b.data as string[][]) sheetRows.push(padRow(row));
          }
        }
        if (headerBlocks.length > 0) sheetRows.push(padRow([])); // spacer before table
      }

      // ALL PAGES: append table rows only (continuous merged table)
      for (const pg of pagesData) {
        for (const b of pg.blocks) {
          if (b.type === 'table') {
            for (const row of b.data as string[][]) sheetRows.push(padRow(row));
          }
        }
      }

      // LAST PAGE: footer paragraphs (text AFTER the last table on the last page)
      const lastPage = pagesData[pagesData.length - 1];
      if (lastPage) {
        const lastTableIdx = (() => {
          let idx = -1;
          lastPage.blocks.forEach((b, i) => { if (b.type === 'table') idx = i; });
          return idx;
        })();
        if (lastTableIdx !== -1 && lastTableIdx < lastPage.blocks.length - 1) {
          const footerBlocks = lastPage.blocks.slice(lastTableIdx + 1);
          if (footerBlocks.some(b => b.type === 'paragraph' && (b.data as string).trim())) {
            sheetRows.push(padRow([])); // spacer after table
          }
          for (const b of footerBlocks) {
            if (b.type === 'paragraph') {
              const text = (b.data as string).trim();
              if (text) sheetRows.push(padRow([text]));
            }
          }
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(sheetRows);
      ws['!cols'] = Array.from({ length: maxCols }, () => ({ wch: 22 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Converted');

      const fname = pdfFile.name.replace(/\.pdf$/i, '') + '.xlsx';
      XLSX.writeFile(wb, fname);
      setPdfStatus(`✓ Converted ${pdf.numPages} page(s) → 1 sheet`);
      toast.success(`Excel saved: ${fname}`);
    } catch (err: any) {
      console.error('PDF→Excel error:', err);
      toast.error(err.message || 'PDF conversion failed');
      setPdfStatus('');
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => toast.success('কপি হয়েছে'));
  };

  const swap = () => {
    if (mode === 'pdf-excel') return;
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

  const clear = () => { setInput(''); setOutput(''); setPdfFile(null); setPdfStatus(''); };

  const currentMode = MODES.find(m => m.value === mode)!;
  const isTranslation = mode === 'bn-en' || mode === 'en-bn';
  const isPdfMode = mode === 'pdf-excel';

  return (
    <div className="container py-6 space-y-6">
      <div className="text-center">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Text Converter & Translator</h1>
        <p className="text-sm text-muted-foreground mt-1">Bijoy ↔ Unicode · বাংলা ↔ English · PDF → Excel</p>
      </div>

      <Card className="max-w-3xl mx-auto card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <currentMode.icon className="h-5 w-5 text-primary" />
            {isPdfMode ? 'PDF to Excel Converter' : isTranslation ? 'Translator' : 'Converter'}
            {isTranslation && <Badge variant="secondary" className="text-[10px]">API</Badge>}
            {isPdfMode && <Badge variant="secondary" className="text-[10px]">Layout-aware</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={v => { setMode(v as ConverterMode); setOutput(''); setPdfFile(null); setPdfStatus(''); }}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-5">
              {MODES.map(m => (
                <TabsTrigger key={m.value} value={m.value} className="text-xs sm:text-sm">
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {isPdfMode ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/20">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <Input type="file" accept="application/pdf,.pdf" onChange={e => { setPdfFile(e.target.files?.[0] || null); setPdfStatus(''); }} className="max-w-sm mx-auto" />
                {pdfFile && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Selected: <span className="font-medium text-foreground">{pdfFile.name}</span> ({(pdfFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
              {pdfStatus && (
                <div className="text-center text-sm text-muted-foreground">{pdfStatus}</div>
              )}
              <div className="rounded-lg bg-muted/30 p-3 text-xs space-y-1">
                <p className="font-medium">কীভাবে কাজ করে:</p>
                <p>• সব পেজ একটি শীটে merge হবে (single sheet output)</p>
                <p>• সব পেজের টেবিল → একটি continuous merged table</p>
                <p>• Page 1: টেবিলের আগের লেখা → paragraph rows হিসেবে উপরে</p>
                <p>• Page 2+: শুধু টেবিল data (উপরের text বাদ)</p>
                <p>• Last page: টেবিলের পরের লেখা → footer paragraph rows</p>
                <p>• Consistent column mapping; alignment-এর জন্য empty cells</p>
              </div>
            </div>
          ) : (
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
          )}

          <div className="flex justify-center gap-3 flex-wrap">
            {isPdfMode ? (
              <Button onClick={convertPdfToExcel} disabled={loading || !pdfFile} className="gap-2 min-w-[180px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                Convert & Download Excel
              </Button>
            ) : (
              <>
                <Button onClick={convert} disabled={loading} className="gap-2 min-w-[140px]">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isTranslation ? 'Translate' : 'Convert'}
                </Button>
                <Button variant="outline" onClick={swap} className="gap-2" disabled={loading}>
                  <ArrowRightLeft className="h-4 w-4" /> Swap
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={clear} className="gap-2" disabled={loading}>
              <Trash2 className="h-4 w-4" /> Clear
            </Button>
          </div>

          {!isPdfMode && (
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>• <strong>Bijoy ↔ Unicode:</strong> ANSI Bijoy encoding এবং Unicode Bangla এর মধ্যে রূপান্তর</p>
              <p>• <strong>বাংলা ↔ English:</strong> সম্পূর্ণ অনুবাদ (Translation)</p>
              {isTranslation && <p className="text-primary/70">🌐 অনুবাদের জন্য ইন্টারনেট সংযোগ প্রয়োজন</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Converter;
