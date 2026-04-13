import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoans } from '@/hooks/useLoans';
import { useBranches } from '@/hooks/useBranches';
import { useLegalCases } from '@/hooks/useLegal';
import { useLegalNotices } from '@/hooks/useLegalNotices';
import { useAllRecoveries } from '@/hooks/useAllRecoveries';
import { BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import ReportConfig, { ReportType, REPORT_TYPES } from '@/components/reports/ReportConfig';
import ReportPreview, { AGING_BUCKETS_CONFIG } from '@/components/reports/ReportPreview';

const ReportGenerator = () => {
  const { profile, userRole } = useAuth();
  const branchFilter = userRole === 'manager' ? profile?.branch_id : undefined;
  const { data: loans } = useLoans(branchFilter);
  const { data: branches } = useBranches();
  const { data: legalCases } = useLegalCases(branchFilter);
  const { data: notices } = useLegalNotices(branchFilter);
  const { data: allRecoveries } = useAllRecoveries(branchFilter);

  const [reportType, setReportType] = useState<ReportType>('loan-summary');
  const [branchId, setBranchId] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const filteredLoans = useMemo(() => {
    let result = loans || [];
    if (branchId !== 'all') result = result.filter(l => l.branch_id === branchId);
    return result;
  }, [loans, branchId]);

  const filteredRecoveries = useMemo(() => {
    let result = allRecoveries || [];
    if (branchId !== 'all') result = result.filter(r => r.loans?.branch_id === branchId);
    if (dateFrom) result = result.filter(r => r.recovery_date >= dateFrom);
    if (dateTo) result = result.filter(r => r.recovery_date <= dateTo);
    return result;
  }, [allRecoveries, branchId, dateFrom, dateTo]);

  const filteredCases = useMemo(() => {
    let result = legalCases || [];
    if (branchId !== 'all') result = result.filter(c => c.branch_id === branchId);
    return result;
  }, [legalCases, branchId]);

  const filteredNotices = useMemo(() => {
    let result = notices || [];
    if (branchId !== 'all') result = result.filter(n => n.branch_id === branchId);
    if (dateFrom) result = result.filter(n => (n.sent_date || '') >= dateFrom);
    if (dateTo) result = result.filter(n => (n.sent_date || '') <= dateTo);
    return result;
  }, [notices, branchId, dateFrom, dateTo]);

  const branchName = (id: string | null) => branches?.find(b => b.id === id)?.branch_name || 'Unknown';

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerated(true);
      setGenerating(false);
      toast.success('Report generated successfully');
    }, 500);
  };

  const handleReportTypeChange = (v: ReportType) => {
    setReportType(v);
    setGenerated(false);
  };

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
        ['STD', 'SMA', 'SS', 'DF', 'BL'].forEach(c => {
          const count = filteredLoans.filter(l => l.classification === c).length;
          const outstanding = filteredLoans.filter(l => l.classification === c).reduce((s, l) => s + (l.outstanding_amount || 0), 0);
          doc.text(`${c}: ${count} accounts — BDT ${outstanding.toLocaleString()}`, 14, y);
          y += 7;
        });
      } else if (reportType === 'legal-cases') {
        doc.setFontSize(8);
        doc.text(`Total Active Cases: ${filteredCases.filter(c => c.status === 'active').length}`, 14, y);
        y += 8;
        const types = [...new Set(filteredCases.map(c => c.case_type))];
        types.forEach(t => {
          const tc = filteredCases.filter(c => c.case_type === t);
          const claim = tc.reduce((s, c) => s + (c.claim_amount || 0), 0);
          doc.text(`${t}: ${tc.length} cases — Claim: BDT ${claim.toLocaleString()}`, 14, y);
          y += 6;
        });
      } else if (reportType === 'aging') {
        AGING_BUCKETS_CONFIG.forEach(b => {
          const matching = filteredLoans.filter(l => {
            const days = (l.overdue_installment_number || 0) * 30;
            return days >= b.min && days <= b.max && l.overdue_amount > 0;
          });
          const amt = matching.reduce((s, l) => s + (l.overdue_amount || 0), 0);
          doc.text(`${b.label}: ${matching.length} accounts — BDT ${amt.toLocaleString()}`, 14, y);
          y += 7;
        });
      } else if (reportType === 'recovery') {
        doc.setFontSize(8);
        doc.text(`Total Recovered: BDT ${filteredRecoveries.reduce((s, r) => s + (r.recovered_amount || 0), 0).toLocaleString()}`, 14, y);
        y += 8;
        doc.text('Date | Account | Borrower | Type | Amount', 14, y);
        y += 5;
        filteredRecoveries.forEach(r => {
          doc.text(`${r.recovery_date} | ${r.loans?.account_no || '-'} | ${r.loans?.borrower_name || '-'} | ${r.recovery_type} | BDT ${(r.recovered_amount || 0).toLocaleString()}`, 14, y);
          y += 5;
          if (y > 280) { doc.addPage(); y = 20; }
        });
      } else if (reportType === 'legal-notices') {
        doc.setFontSize(8);
        doc.text(`Total Notices: ${filteredNotices.length}`, 14, y);
        y += 8;
        filteredNotices.forEach(n => {
          doc.text(`${n.sent_date || '-'} | ${n.borrower_name || n.organization_name || '-'} | ${n.notice_type} | ${n.receipt_status}`, 14, y);
          y += 5;
          if (y > 280) { doc.addPage(); y = 20; }
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
          'Disbursed Amount': l.disbursed_loan_amount,
          'Disbursement Date': l.disbursement_date,
          'Outstanding': l.outstanding_amount,
          'Overdue': l.overdue_amount,
          'Installment': l.installment_amount,
          'Overdue Count': l.overdue_installment_number,
          'Classification': l.classification,
          'Mobile': l.mobile,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Loans');
      }

      if (reportType === 'legal-cases') {
        const rows = filteredCases.map(c => ({
          'Case No': c.case_number, 'Type': c.case_type, 'Status': c.status,
          'Plaintiff': c.plaintiff_name, 'Defendant': c.defendant_name,
          'Claim': c.claim_amount, 'Next Date': c.next_date, 'Court': c.court_name,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Legal Cases');
      }

      if (reportType === 'recovery') {
        const rows = filteredRecoveries.map(r => ({
          'Date': r.recovery_date, 'Account': r.loans?.account_no,
          'Borrower': r.loans?.borrower_name, 'Type': r.recovery_type,
          'Amount': r.recovered_amount, 'Note': r.note,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Recoveries');
      }

      if (reportType === 'legal-notices') {
        const rows = filteredNotices.map(n => ({
          'Borrower': n.borrower_name, 'Organization': n.organization_name,
          'Account No': n.account_no, 'Notice Type': n.notice_type,
          'Sent Date': n.sent_date, 'Status': n.receipt_status,
          'Deadline': n.case_filing_deadline, 'Remarks': n.remarks,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Legal Notices');
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
        <ReportConfig
          reportType={reportType} setReportType={handleReportTypeChange}
          branchId={branchId} setBranchId={setBranchId}
          dateFrom={dateFrom} setDateFrom={setDateFrom}
          dateTo={dateTo} setDateTo={setDateTo}
          branches={branches}
          generating={generating} generated={generated}
          onGenerate={handleGenerate}
          onDownloadPDF={generatePDF}
          onDownloadExcel={generateExcel}
        />
        <ReportPreview
          reportType={reportType} generated={generated}
          filteredLoans={filteredLoans}
          legalCases={filteredCases}
          legalNotices={filteredNotices}
          recoveries={filteredRecoveries}
          branchName={branchName}
        />
      </div>
    </div>
  );
};

export default ReportGenerator;
