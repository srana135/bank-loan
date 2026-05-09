/**
 * Loan Eligibility Calculator & Proposal Management
 * - Eligibility calculator using DTI rules from app_settings
 * - Save proposals to loan_proposals table
 * - Status flow: Proposed → In Progress → Disbursement / Rejected
 * - Delete: Admin/Manager only
 * - Rejection requires comment and date
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoanProposal } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, CheckCircle, XCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { useIsMobile } from '@/hooks/use-mobile';

const eligibilitySchema = z.object({
  customerName: z.string().trim().min(2, 'Name is required'),
  mobile: z.string().trim().min(5, 'Mobile is required'),
  monthlyIncome: z.coerce.number().positive('Income must be positive'),
  loanType: z.enum(['cmsme', 'personal', 'home_loan']),
  disbursementDate: z.string().min(1, 'Date is required'),
  interestRate: z.coerce.number().min(0.1, 'Rate must be > 0').max(50, 'Rate too high'),
  tenure: z.coerce.number().int().min(1, 'Min 1 month').max(600, 'Max 600 months'),
});

type EligibilityForm = z.infer<typeof eligibilitySchema>;

const LOAN_TYPE_LABELS: Record<string, string> = { cmsme: 'CMSME', personal: 'Personal', home_loan: 'Home Loan' };

const DEFAULT_RULES: Record<string, { dti_ratio: number; max_amount: number; default_rate: number; max_tenure: number }> = {
  cmsme: { dti_ratio: 0.5, max_amount: 5000000, default_rate: 9, max_tenure: 60 },
  personal: { dti_ratio: 0.4, max_amount: 2000000, default_rate: 12, max_tenure: 48 },
  home_loan: { dti_ratio: 0.45, max_amount: 10000000, default_rate: 9.5, max_tenure: 240 },
};

const LoanEligibility = () => {
  const { user, userRole } = useAuth();
  const { data: settings } = useAppSettings();
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  const [eligResult, setEligResult] = useState<{ eligible: boolean; maxAmount: number; maxEMI: number; rate: number; maxTenure: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectId, setRejectId] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [proposedAmount, setProposedAmount] = useState<string>('');

  const form = useForm<EligibilityForm>({
    resolver: zodResolver(eligibilitySchema),
    defaultValues: {
      customerName: '', mobile: '', monthlyIncome: 0, loanType: 'personal',
      disbursementDate: new Date().toISOString().split('T')[0],
      interestRate: DEFAULT_RULES.personal.default_rate,
      tenure: DEFAULT_RULES.personal.max_tenure,
    },
  });

  const watchedLoanType = form.watch('loanType');
  useEffect(() => {
    const rules = settings?.loan_eligibility?.[watchedLoanType] || DEFAULT_RULES[watchedLoanType];
    if (rules) {
      form.setValue('interestRate', rules.default_rate);
      form.setValue('tenure', rules.max_tenure);
    }
  }, [watchedLoanType, settings]);

  const { data: proposals, isLoading, error: proposalsError } = useQuery({
    queryKey: ['loan-proposals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('loan_proposals').select('*').order('created_at', { ascending: false });
      if (error) {
        if (error.code === 'PGRST205') return [] as LoanProposal[];
        throw error;
      }
      return (data || []) as LoanProposal[];
    },
    retry: 1,
  });

  const updateProposal = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; rejection_comment?: string; rejection_date?: string }) => {
      const { error } = await supabase.from('loan_proposals').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loan-proposals'] }); toast.success('Proposal updated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProposal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loan_proposals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loan-proposals'] }); toast.success('Proposal deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const calculate = (data: EligibilityForm) => {
    const typeKey = data.loanType;
    const rules = settings?.loan_eligibility?.[typeKey] || DEFAULT_RULES[typeKey];
    const maxEMI = data.monthlyIncome * rules.dti_ratio;
    const rate = data.interestRate;
    const tenure = data.tenure;
    const monthlyRate = rate / 12 / 100;
    const maxAmount = monthlyRate > 0
      ? Math.min(rules.max_amount, (maxEMI * (Math.pow(1 + monthlyRate, tenure) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, tenure)))
      : 0;
    setEligResult({ eligible: maxAmount > 0, maxAmount: Math.round(maxAmount), maxEMI: Math.round(maxEMI), rate, maxTenure: tenure });
  };

  const addToProposals = async () => {
    if (!eligResult || !user) return;
    const data = form.getValues();
    const propAmt = proposedAmount ? Number(proposedAmount) : null;
    if (propAmt !== null && (!Number.isFinite(propAmt) || propAmt <= 0)) {
      toast.error('প্রস্তাবিত পরিমাণ সঠিক হতে হবে');
      return;
    }
    if (propAmt !== null && propAmt > eligResult.maxAmount) {
      toast.error('প্রস্তাবিত পরিমাণ এলিজিবল পরিমাণের বেশি হতে পারে না');
      return;
    }
    const { error } = await supabase.from('loan_proposals').insert({
      customer_name: data.customerName,
      mobile: data.mobile,
      loan_type: data.loanType,
      monthly_income: data.monthlyIncome,
      eligible_amount: eligResult.maxAmount,
      proposed_amount: propAmt,
      probable_disbursement_date: data.disbursementDate,
      status: 'proposed',
      created_by: user.id,
    });
    if (error) toast.error(error.message);
    else { toast.success('Added to proposals'); setProposedAmount(''); qc.invalidateQueries({ queryKey: ['loan-proposals'] }); }
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) { toast.error('Rejection comment is required'); return; }
    await updateProposal.mutateAsync({ id: rejectId, status: 'rejected', rejection_comment: rejectComment.trim(), rejection_date: new Date().toISOString().split('T')[0] });
    setRejectDialogOpen(false);
    setRejectComment('');
  };

  const handleDelete = async () => {
    await deleteProposal.mutateAsync(deleteId);
    setDeleteDialogOpen(false);
    setDeleteId('');
  };

  const filteredProposals = proposals?.filter(p => statusFilter === 'all' || p.status === statusFilter);

  const exportRejectedPDF = () => {
    const rejected = proposals?.filter(p => p.status === 'rejected');
    if (!rejected?.length) { toast.error('No rejected proposals to export'); return; }
    const doc = new jsPDF();
    doc.setFontSize(14); doc.text('Rejected Loan Proposals', 14, 15);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 21);
    let y = 30;
    const headers = ['Customer', 'Mobile', 'Type', 'Amount', 'Reason', 'Date'];
    const cw = [30, 25, 20, 25, 55, 25];
    doc.setFont('helvetica', 'bold');
    headers.forEach((h, i) => doc.text(h, 14 + cw.slice(0, i).reduce((a, b) => a + b, 0), y));
    y += 5;
    doc.setFont('helvetica', 'normal');
    rejected.forEach(p => {
      if (y > 280) { doc.addPage(); y = 15; }
      const vals = [
        (p.customer_name || '').substring(0, 18),
        (p.mobile || '').substring(0, 14),
        LOAN_TYPE_LABELS[p.loan_type || ''] || p.loan_type || '',
        `${(p.eligible_amount || 0).toLocaleString()}`,
        (p.rejection_comment || '').substring(0, 35),
        p.rejection_date || '',
      ];
      vals.forEach((v, i) => doc.text(v, 14 + cw.slice(0, i).reduce((a, b) => a + b, 0), y));
      y += 5;
    });
    doc.save('rejected_proposals.pdf');
    toast.success('PDF exported');
  };

  const exportDisbursementPDF = () => {
    const disbursed = proposals?.filter(p => p.status === 'disbursement');
    if (!disbursed?.length) { toast.error('No disbursement proposals to export'); return; }
    const doc = new jsPDF();
    doc.setFontSize(14); doc.text('Disbursement Loan Proposals', 14, 15);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 21);
    let y = 30;
    const headers = ['Customer', 'Mobile', 'Type', 'Income', 'Eligible Amount', 'Date'];
    const cw = [30, 25, 20, 25, 30, 25];
    doc.setFont('helvetica', 'bold');
    headers.forEach((h, i) => doc.text(h, 14 + cw.slice(0, i).reduce((a, b) => a + b, 0), y));
    y += 5;
    doc.setFont('helvetica', 'normal');
    disbursed.forEach(p => {
      if (y > 280) { doc.addPage(); y = 15; }
      const vals = [
        (p.customer_name || '').substring(0, 18),
        (p.mobile || '').substring(0, 14),
        LOAN_TYPE_LABELS[p.loan_type || ''] || p.loan_type || '',
        `${(p.monthly_income || 0).toLocaleString()}`,
        `${(p.eligible_amount || 0).toLocaleString()}`,
        p.probable_disbursement_date || '',
      ];
      vals.forEach((v, i) => doc.text(v, 14 + cw.slice(0, i).reduce((a, b) => a + b, 0), y));
      y += 5;
    });
    doc.save('disbursement_proposals.pdf');
    toast.success('PDF exported');
  };

  const canManage = userRole === 'admin' || userRole === 'manager';
  const tableNotReady = proposalsError && (proposalsError as any)?.code === 'PGRST205';

  return (
    <div className="container py-6 space-y-6">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Loan Eligibility</h1>
      <Tabs defaultValue="calculator">
        <TabsList><TabsTrigger value="calculator">Calculator</TabsTrigger><TabsTrigger value="proposals">Proposals</TabsTrigger></TabsList>

        <TabsContent value="calculator">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-shadow">
              <CardHeader><CardTitle className="font-heading text-lg">Check Eligibility</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(calculate)} className="space-y-3">
                  <div className="space-y-1.5"><Label className="text-xs">Customer Name</Label>
                    <Input {...form.register('customerName')} className="h-9" />
                    {form.formState.errors.customerName && <p className="text-xs text-destructive">{form.formState.errors.customerName.message}</p>}
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Mobile</Label>
                    <Input {...form.register('mobile')} className="h-9" placeholder="01XXXXXXXXX" />
                    {form.formState.errors.mobile && <p className="text-xs text-destructive">{form.formState.errors.mobile.message}</p>}
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Monthly Income (৳)</Label>
                    <Input type="number" {...form.register('monthlyIncome')} className="h-9" />
                    {form.formState.errors.monthlyIncome && <p className="text-xs text-destructive">{form.formState.errors.monthlyIncome.message}</p>}
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Loan Type</Label>
                    <Select value={form.watch('loanType')} onValueChange={v => form.setValue('loanType', v as any)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="cmsme">CMSME</SelectItem><SelectItem value="personal">Personal</SelectItem><SelectItem value="home_loan">Home Loan</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Interest Rate (%)</Label>
                      <Input type="number" step="0.1" {...form.register('interestRate')} className="h-9" />
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Tenure (Months)</Label>
                      <Input type="number" {...form.register('tenure')} className="h-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Probable Disbursement Date</Label>
                    <Input type="date" {...form.register('disbursementDate')} className="h-9" />
                  </div>
                  <Button type="submit" className="w-full">Check Eligibility</Button>
                </form>
              </CardContent>
            </Card>

            {eligResult && (
              <Card className="card-shadow">
                <CardHeader><CardTitle className="font-heading text-lg">Result</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                    {eligResult.eligible ? <CheckCircle className="h-8 w-8 text-green-600" /> : <XCircle className="h-8 w-8 text-destructive" />}
                    <div>
                      <p className="font-semibold">{eligResult.eligible ? 'Eligible!' : 'Not Eligible'}</p>
                      <p className="text-xs text-muted-foreground">Based on DTI ratio for {LOAN_TYPE_LABELS[form.getValues('loanType')]}</p>
                    </div>
                  </div>
                  {eligResult.eligible && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-primary/5"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Max Loan</p><p className="text-lg font-bold text-primary">৳{eligResult.maxAmount.toLocaleString()}</p></CardContent></Card>
                        <Card className="bg-accent/10"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Max EMI</p><p className="text-lg font-bold">৳{eligResult.maxEMI.toLocaleString()}</p></CardContent></Card>
                      </div>
                      <p className="text-xs text-muted-foreground">Rate: {eligResult.rate}% | Tenure: {eligResult.maxTenure} months</p>
                      <Button onClick={addToProposals} className="w-full">Add to Proposal List</Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="proposals" className="space-y-4">
          {tableNotReady && (
            <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="py-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">The loan_proposals table has not been created yet. Please run the migration SQL in your Supabase dashboard.</p>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="proposed">Proposed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="disbursement">Disbursement</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportRejectedPDF} className="gap-1" disabled={!proposals?.some(p => p.status === 'rejected')}>
              <Download className="h-3 w-3" /> Rejected PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportDisbursementPDF} className="gap-1" disabled={!proposals?.some(p => p.status === 'disbursement')}>
              <Download className="h-3 w-3" /> Disbursement PDF
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : !filteredProposals?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No proposals found.</CardContent></Card>
          ) : isMobile ? (
            <div className="space-y-3">
              {filteredProposals.map(p => (
                <Card key={p.id} className="card-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{p.customer_name}</p>
                        <a href={`tel:${p.mobile}`} className="text-xs text-primary hover:underline">{p.mobile}</a>
                      </div>
                      <Badge variant={p.status === 'rejected' ? 'destructive' : p.status === 'disbursement' ? 'default' : 'secondary'} className="capitalize text-[10px]">
                        {p.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{LOAN_TYPE_LABELS[p.loan_type || ''] || p.loan_type}</span></div>
                      <div><span className="text-muted-foreground">Income:</span> <span className="font-medium">৳{(p.monthly_income || 0).toLocaleString()}</span></div>
                      <div><span className="text-muted-foreground">Eligible:</span> <span className="font-medium text-primary">৳{(p.eligible_amount || 0).toLocaleString()}</span></div>
                      <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{p.probable_disbursement_date}</span></div>
                    </div>
                    {canManage && (
                      <div className="flex gap-2 pt-1">
                        {p.status !== 'disbursement' && p.status !== 'rejected' && (
                          <>
                            {p.status === 'proposed' && <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => updateProposal.mutate({ id: p.id, status: 'in_progress' })}>Progress</Button>}
                            {p.status === 'in_progress' && <Button size="sm" variant="default" className="flex-1 h-8 text-xs" onClick={() => updateProposal.mutate({ id: p.id, status: 'disbursement' })}>Disburse</Button>}
                            <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" onClick={() => { setRejectId(p.id); setRejectDialogOpen(true); }}>Reject</Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" className="h-8 text-xs text-destructive" onClick={() => { setDeleteId(p.id); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {p.status === 'rejected' && p.rejection_comment && (
                      <p className="text-xs text-destructive bg-destructive/5 p-2 rounded">Reason: {p.rejection_comment}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Customer</TableHead><TableHead>Mobile</TableHead><TableHead>Type</TableHead>
                  <TableHead className="text-right">Income</TableHead><TableHead className="text-right">Eligible</TableHead>
                  <TableHead>Date</TableHead><TableHead>Status</TableHead>{canManage && <TableHead>Actions</TableHead>}
                </TableRow></TableHeader>
                <TableBody>
                  {filteredProposals.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.customer_name}</TableCell>
                      <TableCell><a href={`tel:${p.mobile}`} className="text-primary hover:underline">{p.mobile}</a></TableCell>
                      <TableCell>{LOAN_TYPE_LABELS[p.loan_type || ''] || p.loan_type}</TableCell>
                      <TableCell className="text-right">৳{(p.monthly_income || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">৳{(p.eligible_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{p.probable_disbursement_date}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'rejected' ? 'destructive' : p.status === 'disbursement' ? 'default' : 'secondary'} className="capitalize">
                          {p.status?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-1">
                            {p.status !== 'disbursement' && p.status !== 'rejected' && (
                              <>
                                {p.status === 'proposed' && <Button size="sm" variant="outline" onClick={() => updateProposal.mutate({ id: p.id, status: 'in_progress' })}>Progress</Button>}
                                {p.status === 'in_progress' && <Button size="sm" variant="default" onClick={() => updateProposal.mutate({ id: p.id, status: 'disbursement' })}>Disburse</Button>}
                                <Button size="sm" variant="destructive" onClick={() => { setRejectId(p.id); setRejectDialogOpen(true); }}>Reject</Button>
                              </>
                            )}
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setDeleteId(p.id); setDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div></Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Proposal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Rejection Comment *</Label>
              <Textarea value={rejectComment} onChange={e => setRejectComment(e.target.value)} placeholder="Reason for rejection" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={updateProposal.isPending || !rejectComment.trim()}>
                {updateProposal.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this proposal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteProposal.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LoanEligibility;