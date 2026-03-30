import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLegalCases, useCreateLegalCase, useUpdateLegalCase, useDeleteLegalCase, useCaseOrders, useAddCaseOrder, useLawyers, useCreateLawyer } from '@/hooks/useLegal';
import { useBranches } from '@/hooks/useBranches';
import { useLoans } from '@/hooks/useLoans';
import { LegalCase } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Search, Pencil, Trash2, Eye, Gavel, Calendar, FileText, UserPlus, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import jsPDF from 'jspdf';

const CASE_TYPES = ['Artha Rin', 'NI Act', 'Civil', 'Criminal', 'Writ', 'Execution', 'Other'];
const CASE_STATUSES = ['active', 'disposed', 'settled', 'stayed', 'withdrawn'];

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
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editCase, setEditCase] = useState<LegalCase | null>(null);
  const [detailCase, setDetailCase] = useState<LegalCase | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lawyerDialogOpen, setLawyerDialogOpen] = useState(false);

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
  const [saving, setSaving] = useState(false);

  // Order form
  const [orderDate, setOrderDate] = useState('');
  const [orderSummary, setOrderSummary] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [orderType, setOrderType] = useState('');

  // Lawyer form
  const [newLawyerName, setNewLawyerName] = useState('');
  const [newLawyerMobile, setNewLawyerMobile] = useState('');
  const [newLawyerEmail, setNewLawyerEmail] = useState('');
  const [newLawyerSpec, setNewLawyerSpec] = useState('');

  const canManage = userRole === 'admin' || userRole === 'manager';
  const canDelete = userRole === 'admin' || userRole === 'manager';
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
      return matchSearch && matchStatus && matchType;
    });
  }, [cases, search, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    if (!cases) return { total: 0, active: 0, disposed: 0 };
    return {
      total: cases.length,
      active: cases.filter(c => c.status === 'active').length,
      disposed: cases.filter(c => c.status === 'disposed').length,
    };
  }, [cases]);

  const openCreate = () => {
    setEditCase(null);
    setCaseNumber(''); setCaseType('Artha Rin'); setCourtName(''); setFilingDate('');
    setCaseStatus('active'); setPlaintiffName(''); setDefendantName('');
    setLawyerId(''); setLoanId(''); setBranchId(profile?.branch_id || ''); setDescription('');
    setFormOpen(true);
  };

  const openEdit = (c: LegalCase) => {
    setEditCase(c);
    setCaseNumber(c.case_number); setCaseType(c.case_type); setCourtName(c.court_name || '');
    setFilingDate(c.filing_date || ''); setCaseStatus(c.status); setPlaintiffName(c.plaintiff_name || '');
    setDefendantName(c.defendant_name || ''); setLawyerId(c.lawyer_id || '');
    setLoanId(c.loan_id || ''); setBranchId(c.branch_id || ''); setDescription(c.description || '');
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!caseNumber.trim()) { toast.error('Case number is required'); return; }
    setSaving(true);
    const payload: Partial<LegalCase> = {
      case_number: caseNumber.trim(),
      case_type: caseType,
      court_name: courtName.trim() || null,
      filing_date: filingDate || null,
      status: caseStatus,
      plaintiff_name: plaintiffName.trim() || null,
      defendant_name: defendantName.trim() || null,
      lawyer_id: lawyerId || null,
      loan_id: loanId || null,
      branch_id: branchId || null,
      description: description.trim() || null,
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
      case_id: detailCase.id,
      order_date: orderDate,
      order_summary: orderSummary.trim(),
      next_date: nextDate || null,
      order_type: orderType || null,
      created_by: user?.id,
    });
    setOrderDate(''); setOrderSummary(''); setNextDate(''); setOrderType('');
  };

  const handleAddLawyer = async () => {
    if (!newLawyerName.trim()) { toast.error('Name required'); return; }
    await createLawyer.mutateAsync({
      name: newLawyerName.trim(),
      mobile: newLawyerMobile.trim() || null,
      email: newLawyerEmail.trim() || null,
      specialization: newLawyerSpec.trim() || null,
    });
    setLawyerDialogOpen(false);
    setNewLawyerName(''); setNewLawyerMobile(''); setNewLawyerEmail(''); setNewLawyerSpec('');
  };

  const exportPDF = () => {
    if (!filtered.length) { toast.error('No cases to export'); return; }
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14); doc.text('Legal Cases Report', 14, 15);
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toLocaleString()} | Total: ${filtered.length}`, 14, 21);
    let y = 28;
    const cols = ['Case No', 'Type', 'Court', 'Status', 'Plaintiff', 'Defendant', 'Filing Date'];
    const cw = 38;
    doc.setFont('helvetica', 'bold');
    cols.forEach((h, i) => doc.text(h, 10 + i * cw, y));
    y += 5;
    doc.setFont('helvetica', 'normal');
    filtered.forEach(c => {
      if (y > 195) { doc.addPage(); y = 15; }
      const vals = [c.case_number, c.case_type, c.court_name || '-', c.status, c.plaintiff_name || '-', c.defendant_name || '-', c.filing_date || '-'];
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
          <p className="text-sm text-muted-foreground">Manage legal cases, orders, and lawyer assignments</p>
        </div>
      </div>

      {tableNotReady && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">Legal tables not found. Please run the updated migration SQL in your Supabase dashboard.</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Cases</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </CardContent></Card>
        <Card className="bg-primary/5"><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-primary">{stats.active}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Disposed</p>
          <p className="text-2xl font-bold">{stats.disposed}</p>
        </CardContent></Card>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search case number, parties..." className="pl-10 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {CASE_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CASE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {canManage && (
          <>
            <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> Add Case</Button>
            <Button size="sm" variant="outline" onClick={() => setLawyerDialogOpen(true)} className="gap-1.5">
              <UserPlus className="h-4 w-4" /> Lawyer
            </Button>
          </>
        )}
        <Button size="sm" variant="outline" onClick={exportPDF} disabled={!filtered.length} className="gap-1.5">
          <Download className="h-4 w-4" /> PDF
        </Button>
      </div>

      {/* Case list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !filtered.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {cases?.length === 0 ? <p>No legal cases yet. Click "Add Case" to create one.</p> : <p>No cases match your search/filters.</p>}
        </CardContent></Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {filtered.map(c => (
            <Card key={c.id} className="card-shadow cursor-pointer hover:border-primary/30 transition-colors" onClick={() => { setDetailCase(c); setDetailOpen(true); }}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{c.case_number}</p>
                    <p className="text-xs text-muted-foreground">{c.case_type} · {c.court_name || '-'}</p>
                  </div>
                  <Badge variant={c.status === 'active' ? 'default' : c.status === 'disposed' ? 'secondary' : 'outline'} className="capitalize text-[10px]">{c.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-muted-foreground">Plaintiff:</span> {c.plaintiff_name || '-'}</div>
                  <div><span className="text-muted-foreground">Defendant:</span> {c.defendant_name || '-'}</div>
                  <div><span className="text-muted-foreground">Filed:</span> {c.filing_date || '-'}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Case No</TableHead><TableHead>Type</TableHead><TableHead>Court</TableHead>
              <TableHead>Status</TableHead><TableHead>Plaintiff</TableHead><TableHead>Defendant</TableHead>
              <TableHead>Filed</TableHead>{canManage && <TableHead>Actions</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDetailCase(c); setDetailOpen(true); }}>
                  <TableCell className="font-mono text-sm font-medium">{c.case_number}</TableCell>
                  <TableCell>{c.case_type}</TableCell>
                  <TableCell className="text-sm">{c.court_name || '-'}</TableCell>
                  <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="capitalize text-xs">{c.status}</Badge></TableCell>
                  <TableCell className="text-sm">{c.plaintiff_name || '-'}</TableCell>
                  <TableCell className="text-sm">{c.defendant_name || '-'}</TableCell>
                  <TableCell className="text-xs">{c.filing_date || '-'}</TableCell>
                  {canManage && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        {canDelete && (
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setDeleteId(c.id); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div></Card>
      )}

      {/* Detail Drawer */}
      <CaseDetailDrawer
        legalCase={detailCase} open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailCase(null); }}
        canManage={canManage}
        lawyers={lawyers || []}
        loans={loans || []}
        orderDate={orderDate} setOrderDate={setOrderDate}
        orderSummary={orderSummary} setOrderSummary={setOrderSummary}
        nextDate={nextDate} setNextDate={setNextDate}
        orderType={orderType} setOrderType={setOrderType}
        onAddOrder={handleAddOrder}
        addOrderPending={addOrder.isPending}
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
            <div className="space-y-1.5"><Label className="text-xs">Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} className="min-h-[60px]" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
            <AlertDialogDescription>Are you sure? This will permanently delete this legal case and all its orders.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Lawyer Dialog */}
      <Dialog open={lawyerDialogOpen} onOpenChange={setLawyerDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Lawyer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Name *</Label><Input value={newLawyerName} onChange={e => setNewLawyerName(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Mobile</Label><Input value={newLawyerMobile} onChange={e => setNewLawyerMobile(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={newLawyerEmail} onChange={e => setNewLawyerEmail(e.target.value)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Specialization</Label><Input value={newLawyerSpec} onChange={e => setNewLawyerSpec(e.target.value)} className="h-9" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLawyerDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddLawyer} disabled={createLawyer.isPending}>
                {createLawyer.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Case Detail Drawer sub-component
interface DrawerProps {
  legalCase: LegalCase | null;
  open: boolean;
  onClose: () => void;
  canManage: boolean;
  lawyers: any[];
  loans: any[];
  orderDate: string; setOrderDate: (v: string) => void;
  orderSummary: string; setOrderSummary: (v: string) => void;
  nextDate: string; setNextDate: (v: string) => void;
  orderType: string; setOrderType: (v: string) => void;
  onAddOrder: () => void;
  addOrderPending: boolean;
}

const CaseDetailDrawer = ({ legalCase, open, onClose, canManage, lawyers, loans,
  orderDate, setOrderDate, orderSummary, setOrderSummary, nextDate, setNextDate,
  orderType, setOrderType, onAddOrder, addOrderPending }: DrawerProps) => {
  const { data: orders } = useCaseOrders(legalCase?.id || null);

  if (!legalCase) return null;

  const lawyer = lawyers.find(l => l.id === legalCase.lawyer_id);
  const loan = loans.find(l => l.id === legalCase.loan_id);

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

        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Case Details</h4>
          <Row label="Case Number" value={legalCase.case_number} />
          <Row label="Type" value={legalCase.case_type} />
          <Row label="Court" value={legalCase.court_name} />
          <Row label="Status" value={legalCase.status} />
          <Row label="Filing Date" value={legalCase.filing_date} />
          <Row label="Plaintiff" value={legalCase.plaintiff_name} />
          <Row label="Defendant" value={legalCase.defendant_name} />
          <Row label="Lawyer" value={lawyer?.name} />
          {loan && <Row label="Linked Loan" value={`${loan.account_no} - ${loan.borrower_name}`} />}
          {legalCase.description && <Row label="Description" value={legalCase.description} />}
        </div>

        <Separator className="my-3" />

        {/* Orders */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Court Orders</h4>
          {orders && orders.length > 0 ? (
            <div className="space-y-2">
              {orders.map(o => (
                <Card key={o.id} className="bg-muted/30">
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

          {/* Add Order */}
          {canManage && (
            <div className="space-y-2 p-3 rounded-lg border border-dashed border-border">
              <p className="text-xs font-medium">Add Court Order</p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} className="h-8 text-xs" placeholder="Date" />
                <Input value={orderType} onChange={e => setOrderType(e.target.value)} className="h-8 text-xs" placeholder="Type (e.g. Adjournment)" />
              </div>
              <Textarea value={orderSummary} onChange={e => setOrderSummary(e.target.value)} className="min-h-[50px] text-xs" placeholder="Order summary..." />
              <Input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} className="h-8 text-xs" placeholder="Next date" />
              <Button size="sm" onClick={onAddOrder} disabled={addOrderPending || !orderDate || !orderSummary.trim()} className="w-full h-8 text-xs">
                {addOrderPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
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
