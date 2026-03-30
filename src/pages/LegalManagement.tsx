import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLegalCases, useCreateLegalCase, useUpdateLegalCase, useDeleteLegalCase, useCaseOrders, useAddCaseOrder, useLawyers, useCreateLawyer, useUpdateLawyer, useDeleteLawyer, useBulkImportCases } from '@/hooks/useLegal';
import { useBranches } from '@/hooks/useBranches';
import { useLoans } from '@/hooks/useLoans';
import { useLoanRecoveries } from '@/hooks/useRecoveries';
import { LegalCase, Lawyer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Search, Pencil, Trash2, Gavel, Calendar, Download, UserPlus, AlertTriangle, Upload, Users, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const CASE_TYPES = ['NI Act', 'Artha Rin', 'PDR', 'Civil', 'Criminal', 'Execution', 'Other'];
const CASE_STATUSES = ['active', 'disposed', 'settled', 'stayed', 'withdrawn'];

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function nextDateBadge(dateStr: string | null) {
  const days = daysUntil(dateStr);
  if (days === null || !dateStr) return null;
  if (days <= 0) return <Badge variant="destructive" className="text-[10px]">Today</Badge>;
  if (days <= 7) return <Badge className="text-[10px] bg-yellow-500 hover:bg-yellow-600 text-black">{dateStr}</Badge>;
  return <span className="text-xs">{dateStr}</span>;
}

const LegalManagement = () => {
  const { user, profile, userRole } = useAuth();
  const branchFilter = userRole === 'manager' ? profile?.branch_id : undefined;
  const { data: cases, isLoading, error } = useLegalCases(branchFilter);
  const { data: branches } = useBranches();
  const { data: loans } = useLoans(branchFilter);
  const { data: lawyers } = useLawyers();
  const createCase = useCreateLegalCase();
  const updateCase = useUpdateLegalCase();
  const deleteCase = useDeleteLegalCase();
  const addOrder = useAddCaseOrder();
  const createLawyer = useCreateLawyer();
  const updateLawyer = useUpdateLawyer();
  const deleteLawyer = useDeleteLawyer();
  const bulkImport = useBulkImportCases();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [branchFilterVal, setBranchFilterVal] = useState('all');
  const [lawyerFilter, setLawyerFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editCase, setEditCase] = useState<LegalCase | null>(null);
  const [detailCase, setDetailCase] = useState<LegalCase | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lawyerPanelOpen, setLawyerPanelOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Form state
  const [caseNumber, setCaseNumber] = useState('');
  const [caseType, setCaseType] = useState('Artha Rin');
  const [courtName, setCourtName] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [caseStatus, setCaseStatus] = useState('active');
  const [plaintiffName, setPlaintiffName] = useState('');
  const [defendantName, setDefendantName] = useState('');
  const [lawyerId, setLawyerId] = useState('');
  const [loanId, setLoanId] = useState('');
  const [branchId, setBranchId] = useState(profile?.branch_id || '');
  const [description, setDescription] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [formNextDate, setFormNextDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  // Order form
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderSummary, setOrderSummary] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [orderType, setOrderType] = useState('');

  // Lawyer form
  const [editLawyer, setEditLawyer] = useState<Lawyer | null>(null);
  const [lawyerFormOpen, setLawyerFormOpen] = useState(false);
  const [lwName, setLwName] = useState('');
  const [lwMobile, setLwMobile] = useState('');
  const [lwEmail, setLwEmail] = useState('');
  const [lwSpec, setLwSpec] = useState('');
  const [lwDeleteId, setLwDeleteId] = useState('');
  const [lwDeleteOpen, setLwDeleteOpen] = useState(false);

  const canManage = userRole === 'admin' || userRole === 'manager';
  const canDelete = userRole === 'admin' || userRole === 'manager';
  const isEmployee = userRole === 'employee';
  const tableNotReady = error && ((error as any)?.code === 'PGRST205' || (error as any)?.message?.includes('Could not find'));

  const filtered = useMemo(() => {
    if (!cases) return [];
    return cases.filter(c => {
      const matchSearch = !search ||
        c.case_number.toLowerCase().includes(search.toLowerCase()) ||
        c.plaintiff_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.defendant_name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchType = typeFilter === 'all' || c.case_type === typeFilter;
      const matchBranch = branchFilterVal === 'all' || c.branch_id === branchFilterVal;
      const matchLawyer = lawyerFilter === 'all' || c.lawyer_id === lawyerFilter;
      return matchSearch && matchStatus && matchType && matchBranch && matchLawyer;
    });
  }, [cases, search, statusFilter, typeFilter, branchFilterVal, lawyerFilter]);

  const stats = useMemo(() => {
    if (!cases) return { total: 0, active: 0, ni: 0, arthaRin: 0, pdr: 0, due7: 0, today: 0 };
    const active = cases.filter(c => c.status === 'active');
    return {
      total: active.length,
      active: active.length,
      ni: active.filter(c => c.case_type === 'NI Act').length,
      arthaRin: active.filter(c => c.case_type === 'Artha Rin').length,
      pdr: active.filter(c => c.case_type === 'PDR').length,
      due7: active.filter(c => { const d = daysUntil(c.next_date); return d !== null && d > 0 && d <= 7; }).length,
      today: active.filter(c => { const d = daysUntil(c.next_date); return d !== null && d <= 0; }).length,
    };
  }, [cases]);

  const openCreate = () => {
    setEditCase(null);
    setCaseNumber(''); setCaseType('Artha Rin'); setCourtName(''); setFilingDate('');
    setCaseStatus('active'); setPlaintiffName(''); setDefendantName('');
    setLawyerId(''); setLoanId(''); setBranchId(profile?.branch_id || ''); setDescription('');
    setClaimAmount(''); setFormNextDate(''); setRemarks('');
    setFormOpen(true);
  };

  const openEdit = (c: LegalCase) => {
    setEditCase(c);
    setCaseNumber(c.case_number); setCaseType(c.case_type); setCourtName(c.court_name || '');
    setFilingDate(c.filing_date || ''); setCaseStatus(c.status); setPlaintiffName(c.plaintiff_name || '');
    setDefendantName(c.defendant_name || ''); setLawyerId(c.lawyer_id || '');
    setLoanId(c.loan_id || ''); setBranchId(c.branch_id || ''); setDescription(c.description || '');
    setClaimAmount(String(c.claim_amount || '')); setFormNextDate(c.next_date || ''); setRemarks(c.remarks || '');
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!caseNumber.trim()) { toast.error('Case number is required'); return; }
    setSaving(true);
    const payload: Partial<LegalCase> = {
      case_number: caseNumber.trim(), case_type: caseType,
      court_name: courtName.trim() || null, filing_date: filingDate || null,
      status: caseStatus, plaintiff_name: plaintiffName.trim() || null,
      defendant_name: defendantName.trim() || null,
      lawyer_id: lawyerId && lawyerId !== 'none' ? lawyerId : null,
      loan_id: loanId && loanId !== 'none' ? loanId : null,
      branch_id: branchId || null, description: description.trim() || null,
      claim_amount: claimAmount ? Number(claimAmount) : null,
      next_date: formNextDate || null, remarks: remarks.trim() || null,
    };
    try {
      if (editCase) {
        await updateCase.mutateAsync({ id: editCase.id, ...payload });
      } else {
        await createCase.mutateAsync({ ...payload, created_by: user?.id });
      }
      setFormOpen(false);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async () => {
    await deleteCase.mutateAsync(deleteId);
    setDeleteDialogOpen(false);
  };

  const handleAddOrder = async () => {
    if (!detailCase || !orderDate || !orderSummary.trim()) { toast.error('Date and summary required'); return; }
    await addOrder.mutateAsync({
      case_id: detailCase.id, order_date: orderDate,
      order_summary: orderSummary.trim(), next_date: nextDate || null,
      order_type: orderType || null, created_by: user?.id,
    });
    setOrderDate(new Date().toISOString().split('T')[0]); setOrderSummary(''); setNextDate(''); setOrderType('');
  };

  // Lawyer management
  const openLawyerCreate = () => {
    setEditLawyer(null); setLwName(''); setLwMobile(''); setLwEmail(''); setLwSpec('');
    setLawyerFormOpen(true);
  };
  const openLawyerEdit = (l: Lawyer) => {
    setEditLawyer(l); setLwName(l.name); setLwMobile(l.mobile || '');
    setLwEmail(l.email || ''); setLwSpec(l.specialization || '');
    setLawyerFormOpen(true);
  };
  const handleSaveLawyer = async () => {
    if (!lwName.trim()) { toast.error('Name required'); return; }
    const data = { name: lwName.trim(), mobile: lwMobile.trim() || null, email: lwEmail.trim() || null, specialization: lwSpec.trim() || null };
    if (editLawyer) await updateLawyer.mutateAsync({ id: editLawyer.id, ...data });
    else await createLawyer.mutateAsync(data);
    setLawyerFormOpen(false);
  };
  const handleDeleteLawyer = async () => {
    await deleteLawyer.mutateAsync(lwDeleteId);
    setLwDeleteOpen(false);
  };

  // Bulk import
  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(ws);
        const cases: Partial<LegalCase>[] = rows.map((r: any) => ({
          case_number: String(r['Case Number'] || r['case_number'] || ''),
          case_type: String(r['Case Type'] || r['case_type'] || 'Artha Rin'),
          court_name: r['Court'] || r['court_name'] || null,
          filing_date: r['Filing Date'] || r['filing_date'] || null,
          status: r['Status'] || 'active',
          plaintiff_name: r['Plaintiff'] || r['plaintiff_name'] || null,
          defendant_name: r['Defendant'] || r['defendant_name'] || null,
          claim_amount: r['Claim Amount'] ? Number(r['Claim Amount']) : null,
          next_date: r['Next Date'] || r['next_date'] || null,
          remarks: r['Remarks'] || r['remarks'] || null,
          branch_id: profile?.branch_id || null,
          created_by: user?.id,
        })).filter((c: any) => c.case_number);
        if (!cases.length) { toast.error('No valid rows found'); return; }
        await bulkImport.mutateAsync(cases);
        setImportOpen(false);
      } catch (err: any) { toast.error(err.message || 'Import failed'); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Case Number', 'Case Type', 'Court', 'Filing Date', 'Status', 'Plaintiff', 'Defendant', 'Claim Amount', 'Next Date', 'Remarks'],
      ['MA-2024-001', 'Artha Rin', 'Artha Rin Adalat', '2024-01-15', 'active', 'Bank', 'John Doe', '500000', '2024-06-15', ''],
    ]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Cases');
    XLSX.writeFile(wb, 'legal_case_template.xlsx');
  };

  // Statement PDF
  const generateStatement = (c: LegalCase, orders: any[], recoveries: any[]) => {
    const doc = new jsPDF();
    const lawyer = lawyers?.find(l => l.id === c.lawyer_id);
    const loan = loans?.find(l => l.id === c.loan_id);
    doc.setFontSize(16); doc.text('Legal Case Statement', 14, 20);
    doc.setFontSize(10);
    let y = 35;
    const line = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold'); doc.text(label + ':', 14, y);
      doc.setFont('helvetica', 'normal'); doc.text(value, 65, y); y += 6;
    };
    line('Case Number', c.case_number);
    line('Case Type', c.case_type);
    line('Court', c.court_name || '-');
    line('Filing Date', c.filing_date || '-');
    line('Status', c.status);
    line('Plaintiff', c.plaintiff_name || '-');
    line('Defendant', c.defendant_name || '-');
    line('Lawyer', lawyer?.name || '-');
    if (lawyer?.mobile) line('Lawyer Mobile', lawyer.mobile);
    line('Claim Amount', c.claim_amount ? `৳${c.claim_amount.toLocaleString()}` : '-');
    if (loan) {
      line('Account No', loan.account_no || '-');
      line('Borrower', loan.borrower_name);
      line('Outstanding', `৳${(loan.outstanding_amount || 0).toLocaleString()}`);
    }
    const totalRecovery = recoveries?.reduce((s: number, r: any) => s + (r.recovered_amount || 0), 0) || 0;
    line('Post-Case Recovery', `৳${totalRecovery.toLocaleString()}`);
    line('Next Date', c.next_date || '-');
    y += 5;
    doc.setFont('helvetica', 'bold'); doc.text('Latest Orders:', 14, y); y += 6;
    doc.setFont('helvetica', 'normal');
    const latest3 = (orders || []).slice(0, 3);
    if (latest3.length === 0) { doc.text('No orders recorded.', 14, y); y += 6; }
    else {
      latest3.forEach((o: any) => {
        doc.text(`${o.order_date} — ${o.order_summary.substring(0, 80)}`, 14, y); y += 5;
        if (o.next_date) { doc.text(`  Next: ${o.next_date}`, 14, y); y += 5; }
      });
    }
    doc.save(`statement_${c.case_number.replace(/\s/g, '_')}.pdf`);
  };

  const exportPDF = () => {
    if (!filtered.length) { toast.error('No cases to export'); return; }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14); doc.text('Legal Cases Report', 14, 15);
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toLocaleString()} | Total: ${filtered.length}`, 14, 21);
    let y = 28;
    const cols = ['Case No', 'Type', 'Court', 'Status', 'Plaintiff', 'Claim', 'Next Date'];
    const cw = 38;
    doc.setFont('helvetica', 'bold');
    cols.forEach((h, i) => doc.text(h, 10 + i * cw, y));
    y += 5; doc.setFont('helvetica', 'normal');
    filtered.forEach(c => {
      if (y > 195) { doc.addPage(); y = 15; }
      const vals = [c.case_number, c.case_type, c.court_name || '-', c.status, c.plaintiff_name || '-', c.claim_amount ? `৳${c.claim_amount.toLocaleString()}` : '-', c.next_date || '-'];
      vals.forEach((v, i) => doc.text(String(v).substring(0, 22), 10 + i * cw, y));
      y += 4.5;
    });
    doc.save(`legal_cases_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="container py-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Mamla / Legal Management</h1>
          <p className="text-sm text-muted-foreground">Manage legal cases, court orders, and lawyers</p>
        </div>
      </div>

      {tableNotReady && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">Legal tables not found. Run the migration SQL in Supabase.</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        <Card className="border-2 border-primary/30"><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Active Cases</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">NI Act</p>
          <p className="text-xl font-bold">{stats.ni}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Artha Rin</p>
          <p className="text-xl font-bold">{stats.arthaRin}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">PDR</p>
          <p className="text-xl font-bold">{stats.pdr}</p>
        </CardContent></Card>
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20"><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Due 7 Days</p>
          <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{stats.due7}</p>
        </CardContent></Card>
        <Card className="border-destructive/30 bg-destructive/5"><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Today</p>
          <p className="text-xl font-bold text-destructive">{stats.today}</p>
        </CardContent></Card>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search case, party, account..." className="pl-10 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CASE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {CASE_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {userRole === 'admin' && branches && (
          <Select value={branchFilterVal} onValueChange={setBranchFilterVal}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {lawyers && lawyers.length > 0 && (
          <Select value={lawyerFilter} onValueChange={setLawyerFilter}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Lawyer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lawyers</SelectItem>
              {lawyers.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex-1" />
        {canManage && (
          <>
            <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add Case</Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5"><Upload className="h-4 w-4" /> Bulk</Button>
          </>
        )}
        <Button size="sm" variant="outline" onClick={() => setLawyerPanelOpen(true)} className="gap-1.5"><Users className="h-4 w-4" /> Lawyers</Button>
        <Button size="sm" variant="outline" onClick={exportPDF} disabled={!filtered.length} className="gap-1.5"><Download className="h-4 w-4" /> PDF</Button>
      </div>

      {/* Case list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !filtered.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {cases?.length === 0 ? 'No legal cases yet.' : 'No cases match your search/filters.'}
        </CardContent></Card>
      ) : isMobile ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Showing {filtered.length} cases</p>
          {filtered.map(c => {
            const lawyer = lawyers?.find(l => l.id === c.lawyer_id);
            return (
              <Card key={c.id} className="card-shadow cursor-pointer hover:border-primary/30 transition-colors" onClick={() => { setDetailCase(c); setDetailOpen(true); }}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{c.case_number}</p>
                      <p className="text-xs text-muted-foreground">{c.case_type} · {c.court_name || '-'}</p>
                    </div>
                    <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="capitalize text-[10px]">{c.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div><span className="text-muted-foreground">Plaintiff:</span> {c.plaintiff_name || '-'}</div>
                    <div><span className="text-muted-foreground">Defendant:</span> {c.defendant_name || '-'}</div>
                    <div><span className="text-muted-foreground">Claim:</span> {c.claim_amount ? `৳${c.claim_amount.toLocaleString()}` : '-'}</div>
                    <div><span className="text-muted-foreground">Lawyer:</span> {lawyer?.name || '-'}</div>
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="text-muted-foreground">Next:</span> {nextDateBadge(c.next_date) || '-'}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1 pt-1 border-t border-border/50" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openEdit(c)}>
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={() => { setDeleteId(c.id); setDeleteDialogOpen(true); }}>
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Case No</TableHead><TableHead>Type</TableHead><TableHead>Court</TableHead>
              <TableHead>Status</TableHead><TableHead>Claim</TableHead><TableHead>Next Date</TableHead>
              <TableHead>Lawyer</TableHead>
              {canManage && <TableHead>Actions</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(c => {
                const lawyer = lawyers?.find(l => l.id === c.lawyer_id);
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDetailCase(c); setDetailOpen(true); }}>
                    <TableCell className="font-mono text-sm font-medium">{c.case_number}</TableCell>
                    <TableCell className="text-sm">{c.case_type}</TableCell>
                    <TableCell className="text-sm">{c.court_name || '-'}</TableCell>
                    <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="capitalize text-xs">{c.status}</Badge></TableCell>
                    <TableCell className="text-sm">{c.claim_amount ? `৳${c.claim_amount.toLocaleString()}` : '-'}</TableCell>
                    <TableCell>{nextDateBadge(c.next_date) || '-'}</TableCell>
                    <TableCell className="text-sm">{lawyer?.name || '-'}</TableCell>
                    {canManage && (
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setDeleteId(c.id); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-4 py-2 text-xs text-muted-foreground border-t">Showing {filtered.length} of {cases?.length || 0} cases</div>
        </Card>
      )}

      {/* Detail Drawer */}
      <CaseDetailDrawer
        legalCase={detailCase} open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailCase(null); }}
        canManage={canManage} isEmployee={isEmployee}
        lawyers={lawyers || []} loans={loans || []}
        orderDate={orderDate} setOrderDate={setOrderDate}
        orderSummary={orderSummary} setOrderSummary={setOrderSummary}
        nextDate={nextDate} setNextDate={setNextDate}
        orderType={orderType} setOrderType={setOrderType}
        onAddOrder={handleAddOrder} addOrderPending={addOrder.isPending}
        onGenerateStatement={generateStatement}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={v => { if (!v) setFormOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editCase ? 'Edit Case' : 'New Legal Case'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Case Number *</Label>
                <Input value={caseNumber} onChange={e => setCaseNumber(e.target.value)} className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Case Type</Label>
                <Select value={caseType} onValueChange={setCaseType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{CASE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Court Name</Label>
                <Input value={courtName} onChange={e => setCourtName(e.target.value)} className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Filing Date</Label>
                <Input type="date" value={filingDate} onChange={e => setFilingDate(e.target.value)} className="h-9" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Plaintiff</Label>
                <Input value={plaintiffName} onChange={e => setPlaintiffName(e.target.value)} className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Defendant</Label>
                <Input value={defendantName} onChange={e => setDefendantName(e.target.value)} className="h-9" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Claim Amount (৳)</Label>
                <Input type="number" value={claimAmount} onChange={e => setClaimAmount(e.target.value)} className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Next Date</Label>
                <Input type="date" value={formNextDate} onChange={e => setFormNextDate(e.target.value)} className="h-9" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                <Select value={caseStatus} onValueChange={setCaseStatus}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{CASE_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Lawyer</Label>
                <Select value={lawyerId} onValueChange={setLawyerId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select lawyer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {lawyers?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Linked Loan</Label>
                <Select value={loanId} onValueChange={setLoanId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Link to loan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {loans?.map(l => <SelectItem key={l.id} value={l.id}>{l.account_no} - {l.borrower_name}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              {userRole === 'admin' && (
                <div className="space-y-1.5"><Label className="text-xs">Branch</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Branch" /></SelectTrigger>
                    <SelectContent>
                      {branches?.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
              )}
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Remarks</Label>
              <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="min-h-[50px]" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[50px]" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editCase ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Case</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this legal case and all its orders.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lawyer Panel */}
      <Sheet open={lawyerPanelOpen} onOpenChange={setLawyerPanelOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Lawyer Management</SheetTitle>
            <SheetDescription>Add, edit, or remove lawyers</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {canManage && (
              <Button size="sm" onClick={openLawyerCreate} className="gap-1.5 w-full"><UserPlus className="h-4 w-4" /> Add Lawyer</Button>
            )}
            {lawyers && lawyers.length > 0 ? lawyers.map(l => (
              <Card key={l.id}>
                <CardContent className="p-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{l.name}</p>
                    {l.mobile && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /><a href={`tel:${l.mobile}`} className="text-primary hover:underline">{l.mobile}</a></p>}
                    {l.email && <p className="text-xs text-muted-foreground">{l.email}</p>}
                    {l.specialization && <Badge variant="outline" className="text-[10px] mt-1">{l.specialization}</Badge>}
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openLawyerEdit(l)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { setLwDeleteId(l.id); setLwDeleteOpen(true); }}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No lawyers added yet.</p>}
          </div>
        </SheetContent>
      </Sheet>

      {/* Lawyer Form Dialog */}
      <Dialog open={lawyerFormOpen} onOpenChange={setLawyerFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editLawyer ? 'Edit Lawyer' : 'Add Lawyer'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={lwName} onChange={e => setLwName(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Mobile</Label><Input value={lwMobile} onChange={e => setLwMobile(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={lwEmail} onChange={e => setLwEmail(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Specialization</Label><Input value={lwSpec} onChange={e => setLwSpec(e.target.value)} className="h-9" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLawyerFormOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveLawyer} disabled={createLawyer.isPending || updateLawyer.isPending}>
                {(createLawyer.isPending || updateLawyer.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editLawyer ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Lawyer Confirmation */}
      <AlertDialog open={lwDeleteOpen} onOpenChange={setLwDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Lawyer</AlertDialogTitle>
            <AlertDialogDescription>Remove this lawyer from the system?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLawyer} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk Import Legal Cases</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Upload an Excel file with case data. Download the template first.</p>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
              <Download className="h-4 w-4" /> Download Template
            </Button>
            <div className="space-y-1.5">
              <Label className="text-xs">Upload Excel File</Label>
              <Input type="file" accept=".xlsx,.xls" onChange={handleBulkUpload} className="h-9" />
            </div>
            {bulkImport.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Importing...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Case Detail Drawer
interface DrawerProps {
  legalCase: LegalCase | null; open: boolean; onClose: () => void;
  canManage: boolean; isEmployee: boolean; lawyers: Lawyer[]; loans: any[];
  orderDate: string; setOrderDate: (v: string) => void;
  orderSummary: string; setOrderSummary: (v: string) => void;
  nextDate: string; setNextDate: (v: string) => void;
  orderType: string; setOrderType: (v: string) => void;
  onAddOrder: () => void; addOrderPending: boolean;
  onGenerateStatement: (c: LegalCase, orders: any[], recoveries: any[]) => void;
}

const CaseDetailDrawer = ({ legalCase, open, onClose, canManage, isEmployee, lawyers, loans,
  orderDate, setOrderDate, orderSummary, setOrderSummary, nextDate, setNextDate,
  orderType, setOrderType, onAddOrder, addOrderPending, onGenerateStatement }: DrawerProps) => {
  const { data: orders } = useCaseOrders(legalCase?.id || null);
  const { data: recoveries } = useLoanRecoveries(legalCase?.loan_id || null);

  if (!legalCase) return null;

  const lawyer = lawyers.find(l => l.id === legalCase.lawyer_id);
  const loan = loans.find((l: any) => l.id === legalCase.loan_id);
  const totalRecovery = recoveries?.reduce((s, r) => s + r.recovered_amount, 0) || 0;

  const Row = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] break-words">{value ?? '-'}</span>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" /> {legalCase.case_number}
          </SheetTitle>
          <SheetDescription>{legalCase.case_type} · {legalCase.court_name || '-'}</SheetDescription>
        </SheetHeader>

        <Button variant="outline" size="sm" className="gap-1.5 mb-4" onClick={() => onGenerateStatement(legalCase, orders || [], recoveries || [])}>
          <Download className="h-3 w-3" /> Generate Statement
        </Button>

        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Case Details</h4>
          <Row label="Case Number" value={legalCase.case_number} />
          <Row label="Type" value={legalCase.case_type} />
          <Row label="Court" value={legalCase.court_name} />
          <Row label="Status" value={legalCase.status} />
          <Row label="Filing Date" value={legalCase.filing_date} />
          <Row label="Claim Amount" value={legalCase.claim_amount ? `৳${legalCase.claim_amount.toLocaleString()}` : null} />
          <Row label="Plaintiff" value={legalCase.plaintiff_name} />
          <Row label="Defendant" value={legalCase.defendant_name} />
          <Row label="Lawyer" value={lawyer?.name} />
          {lawyer?.mobile && <Row label="Lawyer Mobile" value={lawyer.mobile} />}
          <div className="flex justify-between py-1 text-sm">
            <span className="text-muted-foreground">Next Date</span>
            <span>{nextDateBadge(legalCase.next_date) || '-'}</span>
          </div>
          {legalCase.remarks && <Row label="Remarks" value={legalCase.remarks} />}
          {loan && (
            <>
              <Separator className="my-2" />
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Linked Loan</h4>
              <Row label="Account No" value={loan.account_no} />
              <Row label="Borrower" value={loan.borrower_name} />
              <Row label="Outstanding" value={`৳${(loan.outstanding_amount || 0).toLocaleString()}`} />
              <Row label="Post-Case Recovery" value={`৳${totalRecovery.toLocaleString()}`} />
            </>
          )}
        </div>

        <Separator className="my-3" />

        {/* Orders */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Court Orders</h4>
          {orders && orders.length > 0 ? (
            <div className="space-y-2">
              {orders.map((o, i) => (
                <Card key={o.id} className={i < 3 ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}>
                  <CardContent className="p-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <Badge variant="outline" className="text-[10px]">{o.order_type || 'Order'}</Badge>
                      <span className="text-muted-foreground">{o.order_date}</span>
                    </div>
                    <p className="text-sm">{o.order_summary}</p>
                    {o.next_date && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <Calendar className="h-3 w-3" /> Next: {o.next_date}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No orders recorded yet.</p>
          )}

          {/* Add Order - allowed for admin, manager, and employee */}
          {(canManage || isEmployee) && (
            <div className="space-y-2 p-3 rounded-lg border border-dashed border-border">
              <p className="text-xs font-medium">Add Court Order</p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="h-8 text-xs" />
                <Input value={orderType} onChange={e => setOrderType(e.target.value)} className="h-8 text-xs" placeholder="Type (Adjournment)" />
              </div>
              <Textarea value={orderSummary} onChange={e => setOrderSummary(e.target.value)} className="min-h-[50px] text-xs" placeholder="Order summary..." />
              <Input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} className="h-8 text-xs" placeholder="Next date" />
              <Button size="sm" onClick={onAddOrder} disabled={addOrderPending || !orderDate || !orderSummary.trim()} className="w-full h-8 text-xs">
                {addOrderPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Add Order
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LegalManagement;
