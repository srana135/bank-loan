/**
 * PRODUCTION — Loan Management
 * ✅ Loan CRUD, Bulk ops, Import/Export, Filters, Summary, Detail drawer
 * ✅ Sorting, Proposed repayment date feeds, Mobile responsive cards
 */
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoans, useCreateLoan, useUpdateLoan, useDeleteLoan, useBulkDeleteLoans, useBulkAddComment, useAddComment, type LoanFilters, defaultFilters, applyFilters } from '@/hooks/useLoans';
import { useBranches } from '@/hooks/useBranches';
import { useLegalCases } from '@/hooks/useLegal';
import { Loan } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Search, Filter, Download, Upload, Trash2, MessageSquare, X, FileText, MessageCircle, AlertTriangle, Building2, Gavel, ArrowUpDown, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import LoanFilterPanel from '@/components/loans/LoanFilters';
import LoanSummary from '@/components/loans/LoanSummary';
import LoanForm, { type LoanFormData } from '@/components/loans/LoanForm';
import LoanDetailDrawer from '@/components/loans/LoanDetailDrawer';
import LoanImportDialog from '@/components/loans/LoanImportDialog';
import SmsUtility from '@/components/loans/SmsUtility';
import LoanAgingAnalysis from '@/components/loans/LoanAgingAnalysis';
import ClassificationSuggestion from '@/components/loans/ClassificationSuggestion';
import DatabaseSetupBanner from '@/components/DatabaseSetupBanner';
import { useIsMobile } from '@/hooks/use-mobile';

type SortKey = 'account_name' | 'borrower_name' | 'overdue_amount' | 'outstanding_amount' | 'classification' | 'overdue_installment_number' | 'latest_proposed_date';
type SortDir = 'asc' | 'desc';

const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return dir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
};

const LoanManagement = () => {
  const { user, profile, userRole } = useAuth();
  const branchFilter = userRole === 'manager' ? profile?.branch_id : undefined;
  const { data: allLoans, isLoading, error: loansError } = useLoans(branchFilter);
  const { data: branches } = useBranches();
  const branchFilterForLegal = userRole === 'manager' ? profile?.branch_id : undefined;
  const { data: legalCases } = useLegalCases(branchFilterForLegal);
  const createLoan = useCreateLoan();
  const updateLoan = useUpdateLoan();
  const deleteLoan = useDeleteLoan();
  const bulkDelete = useBulkDeleteLoans();
  const bulkAddComment = useBulkAddComment();
  const addComment = useAddComment();
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<LoanFilters>(defaultFilters);
  const [adminBranchFilter, setAdminBranchFilter] = useState('__all__');
  const [showFilters, setShowFilters] = useState(false);
  const [showSms, setShowSms] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editLoan, setEditLoan] = useState<Loan | null>(null);
  const [detailLoan, setDetailLoan] = useState<Loan | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCommentOpen, setBulkCommentOpen] = useState(false);
  const [bulkCommentText, setBulkCommentText] = useState('');
  const [bulkCommentTarget, setBulkCommentTarget] = useState<'selected' | 'filtered'>('selected');
  const [quickCommentLoanId, setQuickCommentLoanId] = useState<string | null>(null);
  const [quickCommentText, setQuickCommentText] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | ''>('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const canCreate = userRole === 'admin' || userRole === 'manager';
  const canBulk = userRole === 'admin' || userRole === 'manager';

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else {
      setSortKey(key); setSortDir('asc');
    }
  };

  const filteredLoans = useMemo(() => {
    if (!allLoans) return [];
    let loans = applyFilters(allLoans, filters, search);
    if (userRole === 'admin' && adminBranchFilter !== '__all__') {
      loans = loans.filter(l => l.branch_id === adminBranchFilter);
    }
    if (sortKey) {
      loans = [...loans].sort((a, b) => {
        let va: any = (a as any)[sortKey];
        let vb: any = (b as any)[sortKey];
        if (typeof va === 'string') va = va?.toLowerCase() || '';
        if (typeof vb === 'string') vb = vb?.toLowerCase() || '';
        if (va == null) va = sortDir === 'asc' ? Infinity : -Infinity;
        if (vb == null) vb = sortDir === 'asc' ? Infinity : -Infinity;
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return loans;
  }, [allLoans, filters, search, adminBranchFilter, userRole, sortKey, sortDir]);

  const currentDetailLoan = useMemo(() => {
    if (!detailLoan || !allLoans) return detailLoan;
    return allLoans.find(l => l.id === detailLoan.id) || detailLoan;
  }, [detailLoan, allLoans]);

  const loanCaseMap = useMemo(() => {
    const map = new Map<string, { case_number: string; next_date: string | null }>();
    legalCases?.forEach(c => {
      if (c.loan_id && c.status === 'active') map.set(c.loan_id, { case_number: c.case_number, next_date: c.next_date });
    });
    return map;
  }, [legalCases]);

  const branchName = branches?.find(b => b.id === profile?.branch_id)?.branch_name;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === filteredLoans.length ? new Set() : new Set(filteredLoans.map(l => l.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const openCreate = () => { setEditLoan(null); setFormOpen(true); };
  const openEdit = (loan: Loan) => { setEditLoan(loan); setFormOpen(true); };

  const handleFormSubmit = async (data: LoanFormData) => {
    try {
      if (editLoan) {
        await updateLoan.mutateAsync({ id: editLoan.id, ...data, updated_by: user?.id });
      } else {
        await createLoan.mutateAsync({ ...data, created_by: user?.id });
      }
      setFormOpen(false);
      setEditLoan(null);
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try { await deleteLoan.mutateAsync(id); } catch {}
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected loan(s)? This cannot be undone.`)) return;
    await bulkDelete.mutateAsync(Array.from(selectedIds));
    clearSelection();
  };

  const handleBulkComment = async () => {
    if (!bulkCommentText.trim() || !user) return;
    const ids = bulkCommentTarget === 'selected' ? Array.from(selectedIds) : filteredLoans.map(l => l.id);
    if (ids.length === 0) { toast.error('No loans targeted'); return; }
    await bulkAddComment.mutateAsync({
      loanIds: ids, comment_text: bulkCommentText.trim(),
      author_id: user.id, author_name: profile?.full_name || user.email || '', author_role: userRole || 'employee',
    });
    setBulkCommentText('');
    setBulkCommentOpen(false);
  };

  const handleQuickComment = async (loanId: string) => {
    if (!quickCommentText.trim() || !user) return;
    await addComment.mutateAsync({
      loan_id: loanId, comment_text: quickCommentText.trim(),
      author_id: user.id, author_name: profile?.full_name || user.email || '', author_role: userRole || 'employee',
    });
    setQuickCommentText('');
    setQuickCommentLoanId(null);
  };

  const handleExportExcel = () => {
    if (!filteredLoans.length) { toast.error('No loans to export'); return; }
    const ws = XLSX.utils.json_to_sheet(filteredLoans.map(l => ({
      'Account No': l.account_no, 'Account Name': l.account_name, 'Borrower Name': l.borrower_name,
      'Mobile': l.mobile, 'Account Type': l.account_type, 'Status': l.account_status, 'Address': l.address,
      'Installment': l.installment_amount, 'Overdue Inst.': l.overdue_installment_number,
      'Overdue Amt': l.overdue_amount, 'Outstanding': l.outstanding_amount,
      'Classification': l.classification, 'Latest Comment': l.latest_comment, 'Proposed Date': l.latest_proposed_date,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loans');
    XLSX.writeFile(wb, `loans_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!filteredLoans.length) { toast.error('No loans to export'); return; }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Loan Report', 14, 15);
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toLocaleString()} | Total: ${filteredLoans.length}`, 14, 21);
    let y = 28;
    const cols = ['Acc No', 'Borrower', 'Mobile', 'Type', 'Status', 'Install.', 'Overdue', 'Outstand.', 'Class'];
    const cw = 30;
    cols.forEach((h, i) => { doc.setFont('helvetica', 'bold'); doc.text(h, 10 + i * cw, y); });
    y += 5;
    doc.setFont('helvetica', 'normal');
    filteredLoans.forEach(l => {
      if (y > 195) { doc.addPage(); y = 15; }
      const vals = [l.account_no, l.borrower_name, l.mobile, l.account_type, l.account_status,
        String(l.installment_amount || 0), String(l.overdue_amount || 0), String(l.outstanding_amount || 0), l.classification];
      vals.forEach((v, i) => doc.text(String(v || '').substring(0, 18), 10 + i * cw, y));
      y += 4.5;
    });
    doc.save(`loans_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const openLoanDetail = (loan: Loan) => { setDetailLoan(loan); setDetailOpen(true); };

  const activeFilterCount = [filters.accountName, filters.borrowerName, filters.accountType, filters.accountStatus, filters.address]
    .filter(Boolean).length + (filters.classifications.length > 0 ? 1 : 0) + (adminBranchFilter !== '__all__' ? 1 : 0) + (filters.proposedDateFilter ? 1 : 0);

  return (
    <div className="container py-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Loan Management</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-muted-foreground">{profile?.full_name || user?.email}</span>
            {userRole && <Badge variant="secondary" className="capitalize text-[10px] h-4">{userRole}</Badge>}
            {userRole === 'admin' && <span className="text-xs text-muted-foreground">Viewing all branches</span>}
            {userRole === 'manager' && branchName && (
              <Badge variant="outline" className="text-[10px] h-4 gap-1">
                <Building2 className="h-2.5 w-2.5" />Branch: {branchName} (restricted)
              </Badge>
            )}
            {userRole === 'employee' && (
              <>
                {branchName && <Badge variant="outline" className="text-[10px] h-4 gap-1"><Building2 className="h-2.5 w-2.5" />{branchName}</Badge>}
                <span className="text-xs text-muted-foreground">(View & Comment only)</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, account, mobile..." className="pl-10 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant={showFilters ? 'secondary' : 'outline'} size="sm" className="gap-1.5" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" /> Filters
          {activeFilterCount > 0 && <Badge variant="destructive" className="h-4 min-w-4 text-[10px] ml-0.5">{activeFilterCount}</Badge>}
        </Button>
        <Button variant={showSms ? 'secondary' : 'outline'} size="sm" className="gap-1.5" onClick={() => setShowSms(!showSms)}>
          <MessageCircle className="h-4 w-4" /> SMS
        </Button>
        <div className="flex-1" />
        {canCreate && (
          <>
            <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add Loan</Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5"><Upload className="h-4 w-4" /> Import</Button>
          </>
        )}
        <Button size="sm" variant="outline" onClick={handleExportExcel} className="gap-1.5" disabled={!filteredLoans.length}>
          <Download className="h-4 w-4" /> Excel
        </Button>
        <Button size="sm" variant="outline" onClick={handleExportPDF} className="gap-1.5" disabled={!filteredLoans.length}>
          <FileText className="h-4 w-4" /> PDF
        </Button>
      </div>

      {showFilters && (
        <LoanFilterPanel
          filters={filters} onChange={setFilters} loans={allLoans || []}
          branches={branches} showBranchFilter={userRole === 'admin'}
          branchFilter={adminBranchFilter} onBranchFilterChange={setAdminBranchFilter}
        />
      )}
      {showSms && <SmsUtility loans={filteredLoans} />}
      <LoanSummary
        loans={filteredLoans}
        selectedClassifications={filters.classifications}
        onClassificationClick={(cls) => {
          setFilters(prev => {
            const has = prev.classifications.includes(cls);
            return { ...prev, classifications: has ? prev.classifications.filter(c => c !== cls) : [...prev.classifications, cls] };
          });
        }}
        onProposedDateFilter={(f) => setFilters(prev => ({ ...prev, proposedDateFilter: f }))}
        activeProposedDateFilter={filters.proposedDateFilter}
      />

      {selectedIds.size > 0 && (
        <Card className="border-accent/40 bg-accent/5">
          <CardContent className="py-2 px-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            {canBulk && (
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkDelete.isPending} className="gap-1 h-7">
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => { setBulkCommentTarget('selected'); setBulkCommentOpen(true); }} className="gap-1 h-7">
              <MessageSquare className="h-3 w-3" /> Comment ({selectedIds.size})
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setBulkCommentTarget('filtered'); setBulkCommentOpen(true); }} className="gap-1 h-7">
              <MessageSquare className="h-3 w-3" /> Comment All ({filteredLoans.length})
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection} className="gap-1 h-7"><X className="h-3 w-3" /> Clear</Button>
          </CardContent>
        </Card>
      )}

      {loansError && (
        <DatabaseSetupBanner error={(loansError as any)?.message || String(loansError)} />
      )}
      {loansError && !(loansError as any)?.message?.includes('PGRST205') && !(loansError as any)?.message?.includes('Could not find the table') && (
        <Card className="border-destructive/30">
          <CardContent className="py-6 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-destructive font-medium">Failed to load loans</p>
            <p className="text-sm text-muted-foreground">Please check your connection and permissions, then refresh.</p>
          </CardContent>
        </Card>
      )}

      {!loansError && (isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filteredLoans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {allLoans?.length === 0
              ? <div><p className="text-lg font-medium mb-1">No loans yet</p><p className="text-sm">{canCreate ? 'Click "Add Loan" or "Import" to get started.' : 'No loan data available for your branch.'}</p></div>
              : <p>No loans match current search or filters. Try adjusting your criteria.</p>}
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">Showing {filteredLoans.length} of {allLoans?.length || 0} loans</div>
          {filteredLoans.map(loan => {
            const lc = loanCaseMap.get(loan.id);
            return (
            <Card key={loan.id} className="card-shadow cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openLoanDetail(loan)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{loan.borrower_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{loan.account_no}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 ml-2">
                    <Badge variant={['DF', 'BL'].includes(loan.classification || '') ? 'destructive' : loan.classification === 'SMA' ? 'secondary' : 'default'} className="text-[10px]">
                      {loan.classification || '-'}
                    </Badge>
                    {(loan.overdue_installment_number || 0) > 0 && (
                      <Badge variant="destructive" className="text-[10px]">OD: {loan.overdue_installment_number}</Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Account:</span> <span className="font-medium">{loan.account_name || '-'}</span></div>
                  <div><span className="text-muted-foreground">Mobile:</span> <a href={`tel:${loan.mobile}`} className="text-primary font-medium" onClick={e => e.stopPropagation()}>{loan.mobile || '-'}</a></div>
                  <div><span className="text-muted-foreground">Outstanding:</span> <span className="font-semibold">৳{(loan.outstanding_amount || 0).toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Overdue:</span> <span className="font-medium text-destructive">৳{(loan.overdue_amount || 0).toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Installment:</span> <span className="font-medium">৳{(loan.installment_amount || 0).toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{loan.account_type || '-'}</span></div>
                  {loan.disbursed_loan_amount && (
                    <div><span className="text-muted-foreground">Sanctioned:</span> <span className="font-medium">৳{loan.disbursed_loan_amount.toLocaleString()}</span></div>
                  )}
                  {loan.latest_proposed_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-primary" />
                      <span className="text-primary font-medium">{loan.latest_proposed_date}</span>
                    </div>
                  )}
                </div>
                {lc && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Gavel className="h-3 w-3 text-primary" />
                    <span className="font-mono font-medium">{lc.case_number}</span>
                    {lc.next_date && (
                      <Badge variant={(() => { const d = Math.ceil((new Date(lc.next_date).getTime() - new Date().setHours(0,0,0,0)) / 86400000); return d <= 0 ? 'destructive' : 'outline'; })()}
                        className={`text-[10px] ${(() => { const d = Math.ceil((new Date(lc.next_date).getTime() - new Date().setHours(0,0,0,0)) / 86400000); return d > 0 && d <= 7 ? 'bg-yellow-500 text-black border-yellow-500' : ''; })()}`}>
                        {lc.next_date}
                      </Badge>
                    )}
                  </div>
                )}
                {loan.latest_comment && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded space-y-0.5">
                    <p className="truncate">💬 {loan.latest_comment}</p>
                    <p className="text-[10px] text-muted-foreground/70">{new Date(loan.updated_at).toLocaleString('bn-BD', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-border/50" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => { setQuickCommentLoanId(loan.id); setQuickCommentText(''); }}>
                    <MessageCircle className="h-3.5 w-3.5" /> Comment
                  </Button>
                  {canBulk && (
                    <div className="flex items-center gap-2">
                      <Checkbox checked={selectedIds.has(loan.id)} onCheckedChange={() => toggleSelect(loan.id)} />
                      <span className="text-xs text-muted-foreground">Select</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canBulk && (
                    <TableHead className="w-10">
                      <Checkbox checked={selectedIds.size === filteredLoans.length && filteredLoans.length > 0} onCheckedChange={toggleSelectAll} />
                    </TableHead>
                  )}
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('account_name')}>
                    <span className="flex items-center">Account Name <SortIcon active={sortKey === 'account_name'} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead>Account No</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('borrower_name')}>
                    <span className="flex items-center">Borrower <SortIcon active={sortKey === 'borrower_name'} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('overdue_installment_number')}>
                    <span className="flex items-center justify-end">Overdue <SortIcon active={sortKey === 'overdue_installment_number'} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('outstanding_amount')}>
                    <span className="flex items-center">Outstanding <SortIcon active={sortKey === 'outstanding_amount'} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('classification')}>
                    <span className="flex items-center">Class <SortIcon active={sortKey === 'classification'} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Legal</TableHead>
                  <TableHead className="hidden md:table-cell">Latest Comment</TableHead>
                  <TableHead className="hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort('latest_proposed_date')}>
                    <span className="flex items-center">Proposed <SortIcon active={sortKey === 'latest_proposed_date'} dir={sortDir} /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map(loan => {
                  const lc = loanCaseMap.get(loan.id);
                  const days = lc?.next_date ? Math.ceil((new Date(lc.next_date).getTime() - new Date().setHours(0,0,0,0)) / 86400000) : null;
                  return (
                  <TableRow key={loan.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openLoanDetail(loan)}>
                    {canBulk && (
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(loan.id)} onCheckedChange={() => toggleSelect(loan.id)} />
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-sm">{loan.account_name || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{loan.account_no}</TableCell>
                    <TableCell className="text-sm">{loan.borrower_name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={(loan.overdue_installment_number || 0) > 0 ? 'destructive' : 'secondary'} className="text-xs">
                        {loan.overdue_installment_number || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">৳{(loan.outstanding_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={['DF', 'BL'].includes(loan.classification || '') ? 'destructive' : loan.classification === 'SMA' ? 'secondary' : 'default'} className="text-xs">
                        {loan.classification || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {lc ? (
                        <div className="flex items-center gap-1">
                          <Gavel className="h-3 w-3 text-primary" />
                          <span className="text-xs font-mono">{lc.case_number}</span>
                          {lc.next_date && (
                            <Badge variant={days !== null && days <= 0 ? 'destructive' : 'outline'}
                              className={`text-[10px] ${days !== null && days > 0 && days <= 7 ? 'bg-yellow-500 text-black border-yellow-500' : ''}`}>
                              {lc.next_date}
                            </Badge>
                          )}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[180px] truncate text-xs text-muted-foreground">
                      {loan.latest_comment || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      {loan.latest_proposed_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-primary" />
                          <span className="text-primary font-medium">{loan.latest_proposed_date}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 py-2 text-xs text-muted-foreground border-t">
            Showing {filteredLoans.length} of {allLoans?.length || 0} loans
          </div>
        </Card>
      ))}

      <LoanDetailDrawer loan={currentDetailLoan} open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailLoan(null); }}
        onEdit={openEdit} onDelete={handleDelete} userRole={userRole} branches={branches || []} />

      <Dialog open={formOpen} onOpenChange={v => { if (!v) { setFormOpen(false); setEditLoan(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editLoan ? 'Edit Loan' : 'Create New Loan'}</DialogTitle></DialogHeader>
          <LoanForm loan={editLoan} branches={branches || []} defaultBranchId={profile?.branch_id}
            isAdmin={userRole === 'admin'} saving={createLoan.isPending || updateLoan.isPending}
            onSubmit={handleFormSubmit} onCancel={() => { setFormOpen(false); setEditLoan(null); }} />
        </DialogContent>
      </Dialog>

      <LoanImportDialog open={importOpen} onClose={() => setImportOpen(false)} defaultBranchId={profile?.branch_id} />

      <Dialog open={bulkCommentOpen} onOpenChange={setBulkCommentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkCommentTarget === 'selected'
                ? `Add Comment to ${selectedIds.size} Selected Loan(s)`
                : `Add Comment to ${filteredLoans.length} Filtered Loan(s)`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea placeholder="Enter comment..." value={bulkCommentText} onChange={e => setBulkCommentText(e.target.value)} className="min-h-[80px]" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkCommentOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkComment} disabled={bulkAddComment.isPending || !bulkCommentText.trim()}>
                {bulkAddComment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!quickCommentLoanId} onOpenChange={v => { if (!v) { setQuickCommentLoanId(null); setQuickCommentText(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Add Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea placeholder="Write your comment..." value={quickCommentText} onChange={e => setQuickCommentText(e.target.value)} className="min-h-[80px]" autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setQuickCommentLoanId(null); setQuickCommentText(''); }}>Cancel</Button>
              <Button size="sm" onClick={() => quickCommentLoanId && handleQuickComment(quickCommentLoanId)} disabled={addComment.isPending || !quickCommentText.trim()}>
                {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoanManagement;
