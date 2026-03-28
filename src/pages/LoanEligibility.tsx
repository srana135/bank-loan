import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const eligibilitySchema = z.object({
  customerName: z.string().min(2, 'Required'),
  mobile: z.string().min(5, 'Required'),
  monthlyIncome: z.coerce.number().positive('Required'),
  loanType: z.enum(['cmsme', 'personal', 'home_loan']),
  disbursementDate: z.string().min(1, 'Required'),
});

type EligibilityForm = z.infer<typeof eligibilitySchema>;

const LOAN_TYPE_LABELS: Record<string, string> = { cmsme: 'CMSME', personal: 'Personal', home_loan: 'Home Loan' };

const LoanEligibility = () => {
  const { user, profile, userRole } = useAuth();
  const { data: settings } = useAppSettings();
  const qc = useQueryClient();

  const [eligResult, setEligResult] = useState<{ eligible: boolean; maxAmount: number; maxEMI: number; rate: number; maxTenure: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectId, setRejectId] = useState('');
  const [rejectComment, setRejectComment] = useState('');

  const form = useForm<EligibilityForm>({
    resolver: zodResolver(eligibilitySchema),
    defaultValues: { customerName: '', mobile: '', monthlyIncome: 0, loanType: 'personal', disbursementDate: new Date().toISOString().split('T')[0] },
  });

  const { data: proposals, isLoading } = useQuery({
    queryKey: ['loan-proposals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('loan_proposals').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LoanProposal[];
    },
  });

  const updateProposal = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; rejection_comment?: string; rejection_date?: string }) => {
      const { error } = await supabase.from('loan_proposals').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loan-proposals'] }); toast.success('Proposal updated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const calculate = (data: EligibilityForm) => {
    const rules = settings?.loan_eligibility?.[data.loanType === 'home_loan' ? 'home_loan' : data.loanType] || { dti_ratio: 0.4, max_amount: 2000000, default_rate: 12, max_tenure: 48 };
    const maxEMI = data.monthlyIncome * rules.dti_ratio;
    const monthlyRate = rules.default_rate / 12 / 100;
    const maxAmount = monthlyRate > 0
      ? Math.min(rules.max_amount, (maxEMI * (Math.pow(1 + monthlyRate, rules.max_tenure) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, rules.max_tenure)))
      : 0;
    setEligResult({ eligible: maxAmount > 0, maxAmount: Math.round(maxAmount), maxEMI: Math.round(maxEMI), rate: rules.default_rate, maxTenure: rules.max_tenure });
  };

  const addToProposals = async () => {
    if (!eligResult || !user) return;
    const data = form.getValues();
    const { error } = await supabase.from('loan_proposals').insert({
      customer_name: data.customerName,
      mobile: data.mobile,
      loan_type: data.loanType,
      monthly_income: data.monthlyIncome,
      eligible_amount: eligResult.maxAmount,
      probable_disbursement_date: data.disbursementDate,
      status: 'proposed',
      created_by: user.id,
    });
    if (error) toast.error(error.message);
    else { toast.success('Added to proposals'); qc.invalidateQueries({ queryKey: ['loan-proposals'] }); }
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) { toast.error('Rejection comment required'); return; }
    await updateProposal.mutateAsync({ id: rejectId, status: 'rejected', rejection_comment: rejectComment.trim(), rejection_date: new Date().toISOString().split('T')[0] });
    setRejectDialogOpen(false);
    setRejectComment('');
  };

  const filteredProposals = proposals?.filter(p => statusFilter === 'all' || p.status === statusFilter);

  const exportRejectedPDF = () => {
    const rejected = proposals?.filter(p => p.status === 'rejected');
    if (!rejected?.length) { toast.error('No rejected proposals'); return; }
    const doc = new jsPDF();
    doc.setFontSize(14); doc.text('Rejected Loan Proposals', 14, 15);
    doc.setFontSize(8);
    let y = 25;
    rejected.forEach(p => {
      if (y > 270) { doc.addPage(); y = 15; }
      doc.text(`${p.customer_name} | ${p.mobile} | ${LOAN_TYPE_LABELS[p.loan_type || ''] || p.loan_type} | ৳${(p.eligible_amount || 0).toLocaleString()} | ${p.rejection_comment || ''} | ${p.rejection_date || ''}`, 14, y);
      y += 5;
    });
    doc.save('rejected_proposals.pdf');
  };

  const canManage = userRole === 'admin' || userRole === 'manager';

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
                    <Input {...form.register('mobile')} className="h-9" />
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Monthly Income (৳)</Label>
                    <Input type="number" {...form.register('monthlyIncome')} className="h-9" />
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Loan Type</Label>
                    <Select value={form.watch('loanType')} onValueChange={v => form.setValue('loanType', v as any)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="cmsme">CMSME</SelectItem><SelectItem value="personal">Personal</SelectItem><SelectItem value="home_loan">Home Loan</SelectItem></SelectContent>
                    </Select>
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
                    {eligResult.eligible ? <CheckCircle className="h-8 w-8 text-success" /> : <XCircle className="h-8 w-8 text-destructive" />}
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
                      <p className="text-xs text-muted-foreground">Rate: {eligResult.rate}% | Max Tenure: {eligResult.maxTenure} months</p>
                      <Button onClick={addToProposals} className="w-full">Add to Proposal List</Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="proposals" className="space-y-4">
          <div className="flex items-center gap-3">
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
            <Button variant="outline" size="sm" onClick={exportRejectedPDF} className="gap-1"><Download className="h-3 w-3" /> Rejected PDF</Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : !filteredProposals?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No proposals found.</CardContent></Card>
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

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Proposal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Rejection Comment *</Label>
              <Textarea value={rejectComment} onChange={e => setRejectComment(e.target.value)} placeholder="Reason for rejection" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={updateProposal.isPending}>Reject</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoanEligibility;
