import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoans, useCreateLoan, useUpdateLoan, useDeleteLoan, useBulkDeleteLoans, useBulkAddComment, type LoanFilters, defaultFilters, applyFilters } from '@/hooks/useLoans';
import { useBranches } from '@/hooks/useBranches';
import { Loan } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Search, Filter, Download, Upload, Trash2, MessageSquare, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import LoanFilterPanel from '@/components/loans/LoanFilters';
import LoanSummary from '@/components/loans/LoanSummary';
import LoanForm, { type LoanFormData } from '@/components/loans/LoanForm';
import LoanDetailDrawer from '@/components/loans/LoanDetailDrawer';
import LoanImportDialog from '@/components/loans/LoanImportDialog';

const LoanManagement = () => {
  const { user, profile, userRole } = useAuth();
  const branchFilter = userRole === 'manager' ? profile?.branch_id : undefined;
  const { data: allLoans, isLoading } = useLoans(branchFilter);
  const { data: branches } = useBranches();
  const createLoan = useCreateLoan();
  const updateLoan = useUpdateLoan();
  const deleteLoan = useDeleteLoan();
  const bulkDelete = useBulkDeleteLoans();
  const bulkAddComment = useBulkAddComment();

  // State
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<LoanFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editLoan, setEditLoan] = useState<Loan | null>(null);

  const [detailLoan, setDetailLoan] = useState<Loan | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [importOpen, setImportOpen] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCommentOpen, setBulkCommentOpen] = useState(false);
  const [bulkCommentText, setBulkCommentText] = useState('');
  const [bulkCommentTarget, setBulkCommentTarget] = useState<'selected' | 'filtered'>('selected');

  const canCreate = userRole === 'admin' || userRole === 'manager';
  const canBulk = userRole === 'admin' || userRole === 'manager';

  // Filtered loans
  const filteredLoans = useMemo(() => {
    if (!allLoans) return [];
    return applyFilters(allLoans, filters, search);
  }, [allLoans, filters, search]);

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLoans.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLoans.map(l => l.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // CRUD handlers
  const openCreate = () => {
    setEditLoan(null);
    setFormOpen(true);
  };

  const openEdit = (loan: Loan) => {
    setEditLoan(loan);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: LoanFormData) => {
    if (editLoan) {
      await updateLoan.mutateAsync({ id: editLoan.id, ...data, updated_by: user?.id });
    } else {
      await createLoan.mutateAsync({ ...data, created_by: user?.id });
    }
    setFormOpen(false);
    setEditLoan(null);
  };

  const handleDelete = async (id: string) => {
    await deleteLoan.mutateAsync(id);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected loan(s)? This cannot be undone.`)) return;
    await bulkDelete.mutateAsync(Array.from(selectedIds));
    clearSelection();
  };

  const handleBulkComment = async () => {
    if (!bulkCommentText.trim() || !user) return;
    const ids = bulkCommentTarget === 'selected'
      ? Array.from(selectedIds)
      : filteredLoans.map(l => l.id);
    if (ids.length === 0) { toast.error('No loans targeted'); return; }
    await bulkAddComment.mutateAsync({
      loanIds: ids,
      comment_text: bulkCommentText.trim(),
      author_id: user.id,
      author_name: profile?.full_name || user.email || '',
      author_role: userRole || 'employee',
    });
    setBulkCommentText('');
    setBulkCommentOpen(false);
  };

  // Export
  const handleExportExcel = () => {
    if (!filteredLoans.length) return;
    const ws = XLSX.utils.json_to_sheet(filteredLoans.map(l => ({
      'Account No': l.account_no, 'Account Name': l.account_name, 'Borrower Name': l.borrower_name,
      'Mobile': l.mobile, 'Account Type': l.account_type, 'Status': l.account_status,
      'Installment': l.installment_amount, 'Overdue Inst.': l.overdue_installment_number,
      'Overdue Amt': l.overdue_amount, 'Outstanding': l.outstanding_amount,
      'Classification': l.classification, 'Latest Comment': l.latest_comment,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loans');
    XLSX.writeFile(wb, 'loans_export.xlsx');
  };

  const handleExportPDF = () => {
    if (!filteredLoans.length) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Loan Report', 14, 15);
    doc.setFontSize(7);
    let y = 25;
    const cols = ['Acc No', 'Borrower', 'Mobile', 'Type', 'Status', 'Install.', 'Overdue', 'Outstand.', 'Class'];
    const cw = 30;
    cols.forEach((h, i) => { doc.setFont('helvetica', 'bold'); doc.text(h, 10 + i * cw, y); });
    y += 5;
    doc.setFont('helvetica', 'normal');
    filteredLoans.forEach(l => {
      if (y > 195) { doc.addPage(); y = 15; }
      const vals = [l.account_no, l.borrower_name, l.mobile, l.account_type, l.account_status,
        String(l.installment_amount), String(l.overdue_amount), String(l.outstanding_amount), l.classification];
      vals.forEach((v, i) => doc.text(String(v || '').substring(0, 18), 10 + i * cw, y));
      y += 4.5;
    });
    doc.save('loans_report.pdf');
  };

  const openLoanDetail = (loan: Loan) => {
    setDetailLoan(loan);
    setDetailOpen(true);
  };

  return (
    <div className="container py-6 space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Loan Management</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.full_name || user?.email}
            {userRole && <Badge variant="secondary" className="ml-2 capitalize text-xs">{userRole}</Badge>}
            {profile?.branch_id && branches && (
              <span className="ml-2">— {branches.find(b => b.id === profile.branch_id)?.branch_name}</span>
            )}
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search loans..." className="pl-10 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Button variant={showFilters ? 'secondary' : 'outline'} size="sm" className="gap-1.5" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" /> Filters
          {(filters.classifications.length > 0 || filters.accountName || filters.borrowerName || filters.accountType || filters.accountStatus || filters.address) && (
            <Badge variant="destructive" className="h-5 min-w-5 text-xs ml-1">!</Badge>
          )}
        </Button>

        <div className="flex-1" />

        {canCreate && (
          <>
            <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add Loan</Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5"><Upload className="h-4 w-4" /> Import</Button>
          </>
        )}
        <Button size="sm" variant="outline" onClick={handleExportExcel} className="gap-1.5"><Download className="h-4 w-4" /> Excel</Button>
        <Button size="sm" variant="outline" onClick={handleExportPDF} className="gap-1.5"><FileText className="h-4 w-4" /> PDF</Button>
      </div>

      {/* Filter panel */}
      {showFilters && <LoanFilterPanel filters={filters} onChange={setFilters} loans={allLoans || []} />}

      {/* Summary */}
      <LoanSummary loans={filteredLoans} selectedClassifications={filters.classifications} />

      {/* Bulk selection toolbar */}
      {selectedIds.size > 0 && (
        <Card className="border-accent/40 bg-accent/5">
          <CardContent className="py-2 px-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            {canBulk && (
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkDelete.isPending} className="gap-1">
                <Trash2 className="h-3 w-3" /> Delete Selected
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => { setBulkCommentTarget('selected'); setBulkCommentOpen(true); }} className="gap-1">
              <MessageSquare className="h-3 w-3" /> Comment Selected
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setBulkCommentTarget('filtered'); setBulkCommentOpen(true); }} className="gap-1">
              <MessageSquare className="h-3 w-3" /> Comment All Filtered ({filteredLoans.length})
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection} className="gap-1"><X className="h-3 w-3" /> Clear</Button>
          </CardContent>
        </Card>
      )}

      {/* Loan list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filteredLoans.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {allLoans?.length === 0
              ? <div><p className="text-lg font-medium mb-1">No loans yet</p><p className="text-sm">{canCreate ? 'Click "Add Loan" or "Import" to get started.' : 'No loan data available.'}</p></div>
              : <p>No loans match current filters.</p>
            }
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {canBulk && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedIds.size === filteredLoans.length && filteredLoans.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Account Name</TableHead>
                  <TableHead>Account No</TableHead>
                  <TableHead className="text-right">Overdue Inst.</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead className="hidden md:table-cell">Latest Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map(loan => (
                  <TableRow
                    key={loan.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openLoanDetail(loan)}
                  >
                    {canBulk && (
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(loan.id)}
                          onCheckedChange={() => toggleSelect(loan.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{loan.account_name || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{loan.account_no}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={loan.overdue_installment_number > 0 ? 'destructive' : 'secondary'}>
                        {loan.overdue_installment_number}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={['DF', 'BL'].includes(loan.classification || '') ? 'destructive' : loan.classification === 'SMA' ? 'secondary' : 'default'}>
                        {loan.classification}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate text-xs text-muted-foreground">
                      {loan.latest_comment || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Detail drawer */}
      <LoanDetailDrawer
        loan={detailLoan}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailLoan(null); }}
        onEdit={openEdit}
        onDelete={handleDelete}
        userRole={userRole}
        branches={branches || []}
      />

      {/* Create/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={v => { if (!v) { setFormOpen(false); setEditLoan(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editLoan ? 'Edit Loan' : 'Create New Loan'}</DialogTitle>
          </DialogHeader>
          <LoanForm
            loan={editLoan}
            branches={branches || []}
            defaultBranchId={profile?.branch_id}
            isAdmin={userRole === 'admin'}
            saving={createLoan.isPending || updateLoan.isPending}
            onSubmit={handleFormSubmit}
            onCancel={() => { setFormOpen(false); setEditLoan(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <LoanImportDialog open={importOpen} onClose={() => setImportOpen(false)} defaultBranchId={profile?.branch_id} />

      {/* Bulk comment dialog */}
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
            <Textarea
              placeholder="Enter comment for all targeted loans..."
              value={bulkCommentText}
              onChange={e => setBulkCommentText(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkCommentOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkComment} disabled={bulkAddComment.isPending || !bulkCommentText.trim()}>
                {bulkAddComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Comment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoanManagement;
