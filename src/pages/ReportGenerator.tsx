import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoans } from '@/hooks/useLoans';
import { useBranches } from '@/hooks/useBranches';
import { useLegalCases } from '@/hooks/useLegal';
import { useLegalNotices } from '@/hooks/useLegalNotices';
import { useLoanRecoveries } from '@/hooks/useRecoveries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Loader2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

type ReportType = 'loan-summary' | 'recovery' | 'legal-cases' | 'aging' | 'classification';

const REPORT_TYPES: { value: ReportType; label: string; desc: string }[] = [
  { value: 'loan-summary', label: 'Loan Summary', desc: 'Branch-wise loan portfolio summary' },
  { value: 'recovery', label: 'Recovery Report', desc: 'Recovery collections by date range' },
  { value: 'legal-cases', label: 'Legal Cases', desc: 'Active legal cases summary' },
  { value: 'aging', label: 'Aging Analysis', desc: 'Overdue loan aging buckets' },
  { value: 'classification', label: 'Classification', desc: 'Loan classification breakdown' },
];

const ReportGenerator = () => {
  const { profile, userRole } = useAuth();
  const branchFilter = userRole === 'manager' ? profile?.branch_id : undefined;
  const { data: loans } = useLoans(branchFilter);
  const { data: branches } = useBranches();
  const { data: legalCases } = useLegalCases(branchFilter);
  const { data: notices } = useLegalNotices(branchFilter);

  const [reportType, setReportType] = useState<ReportType>('loan-summary');
  const [branchId, setBranchId] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [generating, setGenerating] = useState(false);

  const filteredLoans = useMemo(() => {
    let result = loans || [];
    if (branchId !== 'all') result = result.filter(l => l.branch_id === branchId);
    return result;
  }, [loans, branchId]);

  const branchName = (id: string | null) => branches?.find(b => b.id === id)?.branch_name || 'Unknown';

  const generatePDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const now = new Date().toLocaleDateString('en-GB');
      const brLabel = branchId === 'all' ? 'All Branches' : branchName(branchId);

      doc.setFontSize(16);
      doc.text(REPORT_TYPES.find(r => r.value === reportType)?.label || 'Report', 14, 20);
      doc.setFontSize(10);
      doc.text(`Branch: ${brLabel} | Date: ${now}`, 14, 28);
      if (dateFrom || dateTo) doc.text(`Period: ${dateFrom || 'Start'} to ${dateTo || 'Present'}`, 14, 34);

      let y = 42;

      if (reportType === 'loan-summary') {
        const headers = ['Branch', 'Accounts', 'Outstanding', 'Overdue', 'STD', 'SMA', 'SS', 'DF', 'BL'];
        const branchGroups = new Map<string, any>();
        filteredLoans.forEach(l => {
          const bid = l.branch_id || 'unknown';
          if (!branchGroups.has(bid)) branchGroups.set(bid, { count: 0, outstanding: 0, overdue: 0, STD: 0, SMA: 0, SS: 0, DF: 0, BL: 0 });
          const g = branchGroups.get(bid)!;
          g.count++;
          g.outstanding += l.outstanding_amount || 0;
          g.overdue += l.overdue_amount || 0;
          g[l.classification || 'STD'] = (g[l.classification || 'STD'] || 0) + 1;
        });

        doc.setFontSize(8);
        headers.forEach((h, i) => doc.text(h, 14 + i * 22, y));
        y += 6;
        branchGroups.forEach((g, bid) => {
          const row = [branchName(bid), g.count, g.outstanding.toLocaleString(), g.overdue.toLocaleString(), g.STD, g.SMA, g.SS, g.DF, g.BL];
          row.forEach((v: any, i: number) => doc.text(String(v), 14 + i * 22, y));
          y += 5;
          if (y > 280) { doc.addPage(); y = 20; }
        });
      } else if (reportType === 'classification') {
        const cls = ['STD', 'SMA', 'SS', 'DF', 'BL'];
        cls.forEach(c => {
          const count = filteredLoans.filter(l => l.classification === c).length;
          const outstanding = filteredLoans.filter(l => l.classification === c).reduce((s, l) => s + (l.outstanding_amount || 0), 0);
          doc.text(`${c}: ${count} accounts — ৳${outstanding.toLocaleString()}`, 14, y);
          y += 7;
        });
      } else if (reportType === 'legal-cases') {
        const cases = legalCases || [];
        doc.setFontSize(8);
        doc.text(`Total Active Cases: ${cases.filter(c => c.status === 'active').length}`, 14, y);
        y += 8;
        const types = [...new Set(cases.map(c => c.case_type))];
        types.forEach(t => {
          const tc = cases.filter(c => c.case_type === t);
          const claim = tc.reduce((s, c) => s + (c.claim_amount || 0), 0);
          doc.text(`${t}: ${tc.length} cases — Claim: ৳${claim.toLocaleString()}`, 14, y);
          y += 6;
        });
      } else if (reportType === 'aging') {
        const buckets = [
          { label: '0-30 days', min: 0, max: 30 },
          { label: '31-60 days', min: 31, max: 60 },
          { label: '61-90 days', min: 61, max: 90 },
          { label: '91-180 days', min: 91, max: 180 },
          { label: '181-365 days', min: 181, max: 365 },
          { label: '365+ days', min: 366, max: Infinity },
        ];
        buckets.forEach(b => {
          const matching = filteredLoans.filter(l => {
            const days = (l.overdue_installment_number || 0) * 30;
            return days >= b.min && days <= b.max && l.overdue_amount > 0;
          });
          const amt = matching.reduce((s, l) => s + (l.overdue_amount || 0), 0);
          doc.text(`${b.label}: ${matching.length} accounts — ৳${amt.toLocaleString()}`, 14, y);
          y += 7;
        });
      }

      doc.save(`${reportType}_report_${now.replace(/\//g, '-')}.pdf`);
      toast.success('PDF Report generated');
    } catch (err) {
      toast.error('Report generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const generateExcel = () => {
    setGenerating(true);
    try {
      const wb = XLSX.utils.book_new();

      if (reportType === 'loan-summary' || reportType === 'classification' || reportType === 'aging') {
        const rows = filteredLoans.map(l => ({
          'Account No': l.account_no,
          'Borrower': l.borrower_name,
          'Organization': l.account_name,
          'Branch': branchName(l.branch_id),
          'Outstanding': l.outstanding_amount,
          'Overdue': l.overdue_amount,
          'Installment': l.installment_amount,
          'Overdue Count': l.overdue_installment_number,
          'Classification': l.classification,
          'Mobile': l.mobile,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Loans');
      }

      if (reportType === 'legal-cases') {
        const rows = (legalCases || []).map(c => ({
          'Case No': c.case_number,
          'Type': c.case_type,
          'Status': c.status,
          'Plaintiff': c.plaintiff_name,
          'Defendant': c.defendant_name,
          'Claim': c.claim_amount,
          'Next Date': c.next_date,
          'Court': c.court_name,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Legal Cases');
      }

      XLSX.writeFile(wb, `${reportType}_report.xlsx`);
      toast.success('Excel Report generated');
    } catch {
      toast.error('Export failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" /> Report Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Generate and download detailed reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Report Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Report Type</Label>
              <Select value={reportType} onValueChange={v => setReportType(v as ReportType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">{REPORT_TYPES.find(r => r.value === reportType)?.desc}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches?.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <Button onClick={generatePDF} disabled={generating} className="gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Download PDF
              </Button>
              <Button variant="outline" onClick={generateExcel} disabled={generating} className="gap-2">
                <Download className="h-4 w-4" /> Download Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              Preview
              <Badge variant="secondary" className="text-[10px]">{filteredLoans.length} loans</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportType === 'loan-summary' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="border"><CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Total Accounts</p>
                    <p className="text-xl font-bold">{filteredLoans.length}</p>
                  </CardContent></Card>
                  <Card className="border"><CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Outstanding</p>
                    <p className="text-sm font-bold">৳{filteredLoans.reduce((s, l) => s + (l.outstanding_amount || 0), 0).toLocaleString()}</p>
                  </CardContent></Card>
                  <Card className="border"><CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Overdue</p>
                    <p className="text-sm font-bold text-destructive">৳{filteredLoans.reduce((s, l) => s + (l.overdue_amount || 0), 0).toLocaleString()}</p>
                  </CardContent></Card>
                  <Card className="border"><CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Avg Installment</p>
                    <p className="text-sm font-bold">৳{filteredLoans.length > 0 ? Math.round(filteredLoans.reduce((s, l) => s + (l.installment_amount || 0), 0) / filteredLoans.length).toLocaleString() : 0}</p>
                  </CardContent></Card>
                </div>
              </div>
            )}

            {reportType === 'classification' && (
              <div className="grid grid-cols-5 gap-2">
                {['STD', 'SMA', 'SS', 'DF', 'BL'].map(cls => {
                  const count = filteredLoans.filter(l => l.classification === cls).length;
                  const amt = filteredLoans.filter(l => l.classification === cls).reduce((s, l) => s + (l.outstanding_amount || 0), 0);
                  return (
                    <Card key={cls} className="border">
                      <CardContent className="p-3 text-center">
                        <Badge variant={['DF', 'BL'].includes(cls) ? 'destructive' : 'secondary'} className="text-[10px] mb-1">{cls}</Badge>
                        <p className="text-lg font-bold">{count}</p>
                        <p className="text-[9px] text-muted-foreground">৳{amt.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {reportType === 'legal-cases' && (
              <div className="space-y-2">
                <p className="text-sm">Active: <strong>{(legalCases || []).filter(c => c.status === 'active').length}</strong></p>
                <p className="text-sm">Total Claim: <strong>৳{(legalCases || []).reduce((s, c) => s + (c.claim_amount || 0), 0).toLocaleString()}</strong></p>
              </div>
            )}

            {(reportType === 'aging' || reportType === 'recovery') && (
              <p className="text-sm text-muted-foreground">Select options and click Download to generate report</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportGenerator;
