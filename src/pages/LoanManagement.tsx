import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoans, useCreateLoan, useUpdateLoan, useDeleteLoan, useLoanComments, useAddComment } from '@/hooks/useLoans';
import { useBranches } from '@/hooks/useBranches';
import { supabase } from '@/lib/supabase';
import { Loan } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, MessageSquare, Upload, Download, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

const loanSchema = z.object({
  account_no: z.string().min(1, 'Account No required'),
  account_name: z.string().optional(),
  borrower_name: z.string().min(1, 'Borrower name required'),
  mobile: z.string().optional(),
  account_type: z.string().optional(),
  account_status: z.string().optional(),
  address: z.string().optional(),
  installment_amount: z.coerce.number().min(0),
  overdue_installment_number: z.coerce.number().min(0),
  overdue_amount: z.coerce.number().min(0),
  outstanding_amount: z.coerce.number().min(0),
  classification: z.string().optional(),
  guarantor_1_name: z.string().optional(),
  guarantor_1_mobile: z.string().optional(),
  guarantor_2_name: z.string().optional(),
  guarantor_2_mobile: z.string().optional(),
  branch_id: z.string().optional(),
});

type LoanFormData = z.infer<typeof loanSchema>;

const LoanManagement = () => {
  const { user, profile, userRole } = useAuth();
  const branchFilter = userRole === 'manager' ? profile?.branch_id : undefined;
  const { data: loans, isLoading } = useLoans(branchFilter);
  const { data: branches } = useBranches();
  const createLoan = useCreateLoan();
  const updateLoan = useUpdateLoan();
  const deleteLoan = useDeleteLoan();
  const addComment = useAddComment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLoan, setEditLoan] = useState<Loan | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  const { data: comments } = useLoanComments(selectedLoanId);

  const canCreate = userRole === 'admin' || userRole === 'manager';
  const canEdit = userRole === 'admin' || userRole === 'manager';
  const canDelete = userRole === 'admin' || userRole === 'manager';

  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      account_no: '', borrower_name: '', installment_amount: 0,
      overdue_installment_number: 0, overdue_amount: 0, outstanding_amount: 0,
    },
  });

  const openCreate = () => {
    setEditLoan(null);
    form.reset({
      account_no: '', account_name: '', borrower_name: '', mobile: '',
      account_type: '', account_status: 'active', address: '',
      installment_amount: 0, overdue_installment_number: 0, overdue_amount: 0,
      outstanding_amount: 0, classification: 'UC', guarantor_1_name: '',
      guarantor_1_mobile: '', guarantor_2_name: '', guarantor_2_mobile: '',
      branch_id: profile?.branch_id || '',
    });
    setDialogOpen(true);
  };

  const openEdit = (loan: Loan) => {
    setEditLoan(loan);
    form.reset({
      account_no: loan.account_no || '',
      account_name: loan.account_name || '',
      borrower_name: loan.borrower_name,
      mobile: loan.mobile || '',
      account_type: loan.account_type || '',
      account_status: loan.account_status || 'active',
      address: loan.address || '',
      installment_amount: loan.installment_amount,
      overdue_installment_number: loan.overdue_installment_number,
      overdue_amount: loan.overdue_amount,
      outstanding_amount: loan.outstanding_amount,
      classification: loan.classification || 'UC',
      guarantor_1_name: loan.guarantor_1_name || '',
      guarantor_1_mobile: loan.guarantor_1_mobile || '',
      guarantor_2_name: loan.guarantor_2_name || '',
      guarantor_2_mobile: loan.guarantor_2_mobile || '',
      branch_id: loan.branch_id || '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: LoanFormData) => {
    const payload = {
      ...data,
      branch_id: data.branch_id || (profile?.branch_id ?? null),
    };
    if (editLoan) {
      await updateLoan.mutateAsync({ id: editLoan.id, ...payload, updated_by: user?.id });
    } else {
      await createLoan.mutateAsync({ ...payload, created_by: user?.id });
    }
    setDialogOpen(false);
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedLoanId || !user) return;
    await addComment.mutateAsync({
      loan_id: selectedLoanId,
      comment_text: commentText.trim(),
      author_id: user.id,
      author_name: profile?.full_name || user.email || '',
      author_role: userRole || 'employee',
    });
    setCommentText('');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        let success = 0, failed = 0;
        const errors: any[] = [];
        for (const row of rows) {
          const { error } = await supabase.from('loans').upsert({
            account_no: String(row['Account No'] || row['account_no'] || ''),
            borrower_name: String(row['Borrower Name'] || row['borrower_name'] || ''),
            account_name: String(row['Account Name'] || row['account_name'] || ''),
            mobile: String(row['Mobile'] || row['mobile'] || ''),
            account_type: String(row['Account Type'] || row['account_type'] || ''),
            account_status: String(row['Account Status'] || row['account_status'] || 'active'),
            address: String(row['Address'] || row['address'] || ''),
            installment_amount: Number(row['Installment'] || row['installment_amount'] || 0),
            overdue_installment_number: Number(row['Overdue Installments'] || row['overdue_installment_number'] || 0),
            overdue_amount: Number(row['Overdue Amount'] || row['overdue_amount'] || 0),
            outstanding_amount: Number(row['Outstanding'] || row['outstanding_amount'] || 0),
            classification: String(row['Classification'] || row['classification'] || 'UC'),
            guarantor_1_name: String(row['Guarantor 1'] || row['guarantor_1_name'] || ''),
            guarantor_1_mobile: String(row['Guarantor 1 Mobile'] || row['guarantor_1_mobile'] || ''),
            guarantor_2_name: String(row['Guarantor 2'] || row['guarantor_2_name'] || ''),
            guarantor_2_mobile: String(row['Guarantor 2 Mobile'] || row['guarantor_2_mobile'] || ''),
            branch_id: profile?.branch_id || null,
            created_by: user?.id,
          }, { onConflict: 'account_no' });
          if (error) { failed++; errors.push({ account_no: row['Account No'], error: error.message }); }
          else success++;
        }
        await supabase.from('import_logs').insert({
          import_type: 'loans',
          file_name: file.name,
          total_rows: rows.length,
          success_rows: success,
          failed_rows: failed,
          error_summary: errors.length > 0 ? errors : null,
          imported_by: user?.id,
        });
        toast.success(`Import complete: ${success} success, ${failed} failed`);
      } catch (err: any) {
        toast.error('Import failed: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleExportExcel = () => {
    if (!filteredLoans?.length) return;
    const ws = XLSX.utils.json_to_sheet(filteredLoans.map(l => ({
      'Account No': l.account_no, 'Borrower Name': l.borrower_name, 'Mobile': l.mobile,
      'Account Type': l.account_type, 'Status': l.account_status,
      'Installment': l.installment_amount, 'Overdue': l.overdue_amount,
      'Outstanding': l.outstanding_amount, 'Classification': l.classification,
      'Latest Comment': l.latest_comment,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loans');
    XLSX.writeFile(wb, 'loans_export.xlsx');
  };

  const handleExportPDF = () => {
    if (!filteredLoans?.length) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Loan Report', 14, 15);
    doc.setFontSize(8);
    let y = 25;
    const headers = ['Account No', 'Borrower', 'Mobile', 'Type', 'Status', 'Installment', 'Overdue', 'Outstanding', 'Class'];
    headers.forEach((h, i) => doc.text(h, 14 + i * 30, y));
    y += 6;
    filteredLoans.forEach(l => {
      if (y > 190) { doc.addPage(); y = 15; }
      const vals = [l.account_no, l.borrower_name, l.mobile, l.account_type, l.account_status,
        String(l.installment_amount), String(l.overdue_amount), String(l.outstanding_amount), l.classification];
      vals.forEach((v, i) => doc.text(String(v || '').substring(0, 15), 14 + i * 30, y));
      y += 5;
    });
    doc.save('loans_report.pdf');
  };

  const filteredLoans = loans?.filter(l => {
    const matchesSearch = !search || 
      l.borrower_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.account_no?.toLowerCase().includes(search.toLowerCase()) ||
      l.mobile?.includes(search);
    const matchesStatus = statusFilter === 'all' || l.account_status === statusFilter;
    const matchesClass = classFilter === 'all' || l.classification === classFilter;
    return matchesSearch && matchesStatus && matchesClass;
  });

  return (
    <div className="container py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Loan Management</h1>
          <p className="text-muted-foreground mt-1">
            Welcome, {profile?.full_name || user?.email}
            {userRole && <Badge variant="secondary" className="ml-2 capitalize">{userRole}</Badge>}
            {profile?.branch_id && branches && (
              <span className="ml-2 text-xs text-muted-foreground">
                Branch: {branches.find(b => b.id === profile.branch_id)?.branch_name || 'N/A'}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <>
              <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Loan</Button>
              <label>
                <Button variant="outline" className="gap-2 cursor-pointer" asChild>
                  <span><Upload className="h-4 w-4" /> Import Excel</span>
                </Button>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
              </label>
            </>
          )}
          <Button variant="outline" className="gap-2" onClick={handleExportExcel}><Download className="h-4 w-4" /> Excel</Button>
          <Button variant="outline" className="gap-2" onClick={handleExportPDF}><FileText className="h-4 w-4" /> PDF</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, account no, or mobile..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="defaulted">Defaulted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Classification" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="UC">UC</SelectItem>
            <SelectItem value="SMA">SMA</SelectItem>
            <SelectItem value="SS">SS</SelectItem>
            <SelectItem value="DF">DF</SelectItem>
            <SelectItem value="BL">BL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loans Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !filteredLoans?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No loan records found.</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account No</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Installment</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map(loan => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-mono text-xs">{loan.account_no}</TableCell>
                    <TableCell className="font-medium">{loan.borrower_name}</TableCell>
                    <TableCell>{loan.mobile}</TableCell>
                    <TableCell>{loan.account_type}</TableCell>
                    <TableCell>
                      <Badge variant={loan.account_status === 'active' ? 'default' : 'secondary'} className="capitalize">
                        {loan.account_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{loan.installment_amount?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{loan.overdue_amount?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{loan.outstanding_amount?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={loan.classification === 'UC' ? 'default' : 'destructive'}>{loan.classification}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setSelectedLoanId(loan.id); setCommentDialogOpen(true); }}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button size="icon" variant="ghost" onClick={() => openEdit(loan)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('Delete this loan?')) deleteLoan.mutate(loan.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editLoan ? 'Edit Loan' : 'Create Loan'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account No *</Label>
                <Input {...form.register('account_no')} />
                {form.formState.errors.account_no && <p className="text-sm text-destructive">{form.formState.errors.account_no.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input {...form.register('account_name')} />
              </div>
              <div className="space-y-2">
                <Label>Borrower Name *</Label>
                <Input {...form.register('borrower_name')} />
                {form.formState.errors.borrower_name && <p className="text-sm text-destructive">{form.formState.errors.borrower_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input {...form.register('mobile')} />
              </div>
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Input {...form.register('account_type')} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Input {...form.register('account_status')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input {...form.register('address')} />
              </div>
              <div className="space-y-2">
                <Label>Installment Amount</Label>
                <Input type="number" {...form.register('installment_amount')} />
              </div>
              <div className="space-y-2">
                <Label>Overdue Installments</Label>
                <Input type="number" {...form.register('overdue_installment_number')} />
              </div>
              <div className="space-y-2">
                <Label>Overdue Amount</Label>
                <Input type="number" {...form.register('overdue_amount')} />
              </div>
              <div className="space-y-2">
                <Label>Outstanding Amount</Label>
                <Input type="number" {...form.register('outstanding_amount')} />
              </div>
              <div className="space-y-2">
                <Label>Classification</Label>
                <select {...form.register('classification')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="UC">UC</option>
                  <option value="SMA">SMA</option>
                  <option value="SS">SS</option>
                  <option value="DF">DF</option>
                  <option value="BL">BL</option>
                </select>
              </div>
              {userRole === 'admin' && branches && (
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <select {...form.register('branch_id')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Guarantor 1 Name</Label>
                <Input {...form.register('guarantor_1_name')} />
              </div>
              <div className="space-y-2">
                <Label>Guarantor 1 Mobile</Label>
                <Input {...form.register('guarantor_1_mobile')} />
              </div>
              <div className="space-y-2">
                <Label>Guarantor 2 Name</Label>
                <Input {...form.register('guarantor_2_name')} />
              </div>
              <div className="space-y-2">
                <Label>Guarantor 2 Mobile</Label>
                <Input {...form.register('guarantor_2_mobile')} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createLoan.isPending || updateLoan.isPending}>
                {(createLoan.isPending || updateLoan.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : editLoan ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loan Comments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Textarea placeholder="Add a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} className="flex-1" />
              <Button onClick={handleAddComment} disabled={addComment.isPending || !commentText.trim()}>
                {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
            {comments?.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No comments yet.</p>}
            {comments?.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{c.author_name}</span>
                    <Badge variant="outline" className="text-xs capitalize">{c.author_role}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{c.comment_text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoanManagement;
