/**
 * Official Khatian Fraction Land Share Calculator
 * 1 Ana = 20 Gonda; 1 Gonda = 4 Kora; 1 Kora = 3 Kranti; 1 Kranti = 20 Til
 * => 1 Ana = 4800 Til ; 1 Satak = 16 Ana = 76800 Til
 */
import { useState, useMemo } from 'react';

const ANA_SYMBOLS = ['০','৷','৵','৶','৷','৷⁄','৷৵','৷৶','৷৷','৷৷⁄','৷৷৵','৷৷৶','৸','৸⁄','৸৵','৸৶','১'];
const KORA_SYMBOLS = ['০','৷','৷৷','৸'];
const KRANTI_SYMBOLS = ['০','৴','৴৴'];
const bnDigits = (n: number) => n.toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[+d]);
const GONDA_SYMBOLS = Array.from({ length: 20 }, (_, i) => bnDigits(i));
const TIL_SYMBOLS = Array.from({ length: 20 }, (_, i) => bnDigits(i));

const TIL_PER_ANA = 4800;
const TIL_PER_GONDA = 240;
const TIL_PER_KORA = 60;
const TIL_PER_KRANTI = 20;
const TIL_PER_SATAK = 76800;

type UnitProps = {
  label: string;
  symbols: string[];
  value: number;
  onChange: (v: number) => void;
  max: number;
};

const UnitSelector = ({ label, symbols, value, onChange, max }: UnitProps) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-[#1b4d2e]">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={e => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
        className="w-20 px-2 py-1 rounded border border-[#b48752] bg-[#fff3e6] text-[#1b4d2e] text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#b87a48]"
      />
    </div>
    <div className="flex flex-wrap gap-1">
      {symbols.map((sym, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={`min-w-[2.25rem] px-2 py-1.5 rounded border text-sm font-mono transition-colors ${
            value === i
              ? 'bg-[#b87a48] text-white border-[#b48752]'
              : 'bg-[#fff3e6] text-[#1b4d2e] border-[#b48752] hover:bg-[#f3e3c8]'
          }`}
          style={{ fontFamily: '"Noto Sans Bengali", "SolaimanLipi", monospace' }}
        >
          {sym}
        </button>
      ))}
    </div>
  </div>
);

function symbolic(ana: number, gonda: number, kora: number, kranti: number, til: number) {
  const parts: string[] = [];
  if (ana > 0) parts.push(`${ANA_SYMBOLS[ana]} (${ana} আনা)`);
  if (gonda > 0) parts.push(`${gonda} গন্ডা`);
  if (kora > 0) parts.push(`${KORA_SYMBOLS[kora]} (${kora} কড়া)`);
  if (kranti > 0) parts.push(`${KRANTI_SYMBOLS[kranti]} (${kranti} ক্রান্তি)`);
  if (til > 0) parts.push(`${til} তিল`);
  return parts.length ? parts.join(' · ') : '০';
}

const fmt = (n: number) => n.toLocaleString('en-BD', { maximumFractionDigits: 4 });

const AnaGonaCalculator = () => {
  const [totalSatak, setTotalSatak] = useState<number>(0);
  const [ana, setAna] = useState(0);
  const [gonda, setGonda] = useState(0);
  const [kora, setKora] = useState(0);
  const [kranti, setKranti] = useState(0);
  const [til, setTil] = useState(0);
  const [partnerName, setPartnerName] = useState('');
  const [ownerName, setOwnerName] = useState('');

  const { selectedTil, selectedSatak, remainingSatak, selectedPct, remainingPct, exceeds } = useMemo(() => {
    const sTil = ana * TIL_PER_ANA + gonda * TIL_PER_GONDA + kora * TIL_PER_KORA + kranti * TIL_PER_KRANTI + til;
    const sSat = totalSatak * (sTil / TIL_PER_SATAK);
    const rSat = totalSatak - sSat;
    const sPct = totalSatak > 0 ? (sSat / totalSatak) * 100 : 0;
    const rPct = totalSatak > 0 ? (rSat / totalSatak) * 100 : 0;
    return {
      selectedTil: sTil,
      selectedSatak: sSat,
      remainingSatak: rSat,
      selectedPct: sPct,
      remainingPct: rPct,
      exceeds: sSat > totalSatak,
    };
  }, [totalSatak, ana, gonda, kora, kranti, til]);

  const reset = () => { setAna(0); setGonda(0); setKora(0); setKranti(0); setTil(0); setTotalSatak(0); };
  const symStr = symbolic(ana, gonda, kora, kranti, til);

  const printReport = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>জমির বণ্টন রিপোর্ট</title>
      <style>
        body{font-family:'Noto Sans Bengali','SolaimanLipi',Arial,sans-serif;padding:24px;color:#1b4d2e}
        h1{color:#b87a48;margin:0 0 4px}
        table{width:100%;border-collapse:collapse;margin:12px 0}
        th,td{border:1px solid #b48752;padding:8px;font-size:13px}
        th{background:#b87a48;color:#fff;text-align:left}
        .box{background:#fff3e6;border:1px solid #b48752;padding:10px;border-radius:6px;margin-top:12px;font-size:12px}
        @media print{button{display:none}}
      </style></head><body>
      <h1>🌾 আনা-গন্ডা-কড়া-ক্রান্তি-তিল রিপোর্ট</h1>
      <div style="color:#555;margin-bottom:12px;font-size:13px">তারিখ: ${new Date().toLocaleDateString('bn-BD')}</div>
      <table>
        <tr><th>মোট জমি (সতক)</th><td>${fmt(totalSatak)}</td></tr>
        <tr><th>মোট মালিক</th><td>${ownerName || '—'}</td></tr>
        <tr><th>অংশীদারের নাম</th><td>${partnerName || '—'}</td></tr>
        <tr><th>নির্বাচিত অংশ (প্রতীক)</th><td style="font-family:monospace">${symStr}</td></tr>
        <tr><th>নির্বাচিত (সতক)</th><td>${fmt(selectedSatak)} সতক (${selectedPct.toFixed(2)}%)</td></tr>
        <tr><th>অবশিষ্ট (সতক)</th><td>${fmt(Math.max(0, remainingSatak))} সতক (${Math.max(0, remainingPct).toFixed(2)}%)</td></tr>
        <tr><th>তিল হিসাব</th><td>${selectedTil} তিল / ${TIL_PER_SATAK}</td></tr>
      </table>
      <div class="box"><b>স্থির সম্পর্ক:</b> ১ সতক = ১৬ আনা · ১ আনা = ২০ গন্ডা = ৮০ কড়া = ২৪০ ক্রান্তি = ৪৮০০ তিল</div>
      <div style="margin-top:16px"><button onclick="window.print()" style="padding:8px 16px;background:#b87a48;color:#fff;border:0;border-radius:4px;cursor:pointer">প্রিন্ট/PDF সংরক্ষণ</button></div>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="rounded-lg overflow-hidden shadow-lg bg-[#1b4d2e] p-3 sm:p-4">
      <div className="rounded-md bg-[#fef7e8] text-[#1b4d2e]">
        <div className="bg-[#b87a48] text-white px-4 py-3 rounded-t-md">
          <h2 className="font-bold text-base sm:text-lg">🌾 ট্রেডিশনাল আনা-গন্ডা-কড়া-ক্রান্তি-তিল ক্যালকুলেটর</h2>
          <p className="text-xs opacity-90 mt-0.5">জমির ঐতিহ্যবাহী ভাগ পরিমাপ</p>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">মোট জমি (সতক)</label>
            <input
              type="number"
              min={0}
              step="0.0001"
              value={totalSatak || ''}
              onChange={e => setTotalSatak(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="w-full px-3 py-2 rounded border border-[#b48752] bg-[#fff3e6] text-[#1b4d2e] focus:outline-none focus:ring-2 focus:ring-[#b87a48]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UnitSelector label="আনা (0-16)" symbols={ANA_SYMBOLS} value={ana} onChange={setAna} max={16} />
            <UnitSelector label="গন্ডা (0-19)" symbols={GONDA_SYMBOLS} value={gonda} onChange={setGonda} max={19} />
            <UnitSelector label="কড়া (0-3)" symbols={KORA_SYMBOLS} value={kora} onChange={setKora} max={3} />
            <UnitSelector label="ক্রান্তি (0-2)" symbols={KRANTI_SYMBOLS} value={kranti} onChange={setKranti} max={2} />
            <UnitSelector label="তিল (0-19)" symbols={TIL_SYMBOLS} value={til} onChange={setTil} max={19} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={reset} className="px-4 py-2 rounded bg-[#fff3e6] text-[#1b4d2e] border border-[#b48752] hover:bg-[#f3e3c8]">রিসেট</button>
          </div>

          {exceeds && (
            <div className="p-3 rounded bg-red-100 text-red-800 text-sm border border-red-300">
              ⚠ নির্বাচিত অংশ মোট জমির চেয়ে বেশি হতে পারে না।
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded bg-[#1b4d2e] text-[#fef7e8]">
              <div className="text-xs opacity-80 mb-1">নির্বাচিত অংশ</div>
              <div className="font-mono text-base mb-1" style={{ fontFamily: '"Noto Sans Bengali", "SolaimanLipi", monospace' }}>{symStr}</div>
              <div className="text-lg font-bold">{fmt(selectedSatak)} সতক</div>
              <div className="text-xs opacity-80">{selectedPct.toFixed(2)}% · {selectedTil} তিল / {TIL_PER_SATAK}</div>
            </div>
            <div className="p-3 rounded bg-[#b87a48] text-white">
              <div className="text-xs opacity-90 mb-1">অবশিষ্ট অংশ</div>
              <div className="font-mono text-base mb-1 opacity-90">— (মোট - নির্বাচিত)</div>
              <div className="text-lg font-bold">{fmt(Math.max(0, remainingSatak))} সতক</div>
              <div className="text-xs opacity-90">{Math.max(0, remainingPct).toFixed(2)}%</div>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#fff3e6] border border-[#b48752] text-xs text-[#1b4d2e]">
            <strong>স্থির সম্পর্ক:</strong> ১ সতক = ১৬ আনা | ১ আনা = ২০ গন্ডা = ৮০ কড়া = ২৪০ ক্রান্তি = ৪৮০০ তিল
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnaGonaCalculator;