import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLegalCases, useCreateLegalCase, useUpdateLegalCase, useDeleteLegalCase, useCaseOrders, useAddCaseOrder, useUpdateCaseOrder, useDeleteCaseOrder, useLawyers, useCreateLawyer, useUpdateLawyer, useDeleteLawyer, useBulkImportCases } from '@/hooks/useLegal';
import { useLegalNotices, useCreateLegalNotice, useUpdateLegalNotice, useDeleteLegalNotice } from '@/hooks/useLegalNotices';
import { useBranches } from '@/hooks/useBranches';
import { useLoans } from '@/hooks/useLoans';
import { useProfiles } from '@/hooks/useUsers';
import { useLoanRecoveries } from '@/hooks/useRecoveries';
import { LegalCase, Lawyer, LegalNotice, Profile } from '@/types';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Plus, Search, Pencil, Trash2, Gavel, Calendar, Download, UserPlus, AlertTriangle, Upload, Users, Phone, ArrowUpDown, ArrowUp, ArrowDown, FileWarning, CalendarDays, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const CASE_TYPES = ['NI Act', 'Artha Rin', 'PDR', 'Civil', 'Criminal', 'Execution', 'Other'];
const CASE_STATUSES = ['active', 'disposed', 'settled', 'stayed', 'withdrawn'];
const NOTICE_TYPES = ['Legal Notice', 'Demand Notice', 'Final Notice', 'Recall Notice', 'NI Act Notice', 'Artha Rin Notice', 'Other'];

type SortKey = 'case_number' | 'case_type' | 'claim_amount' | 'next_date' | 'status';
type SortDir = 'asc' | 'desc';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  // Parse dateStr as local date to avoid UTC offset issues
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function nextDateBadge(dateStr: string | null) {
  const days = daysUntil(dateStr);
  if (days === null || !dateStr) return null;
  if (days <= 0) return <Badge variant="destructive" className="text-[10px]">Today</Badge>;
  if (days <= 7) return <Badge className="text-[10px] bg-yellow-500 hover:bg-yellow-600 text-black">{dateStr}</Badge>;
  return <span className="text-xs">{dateStr}</span>;
}

const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
  if (!active) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return dir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
};

// Searchable combobox for selecting loans
const LoanCombobox = ({ value, onChange, loans }: { value: string; onChange: (v: string) => void; loans: any[] }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return loans?.slice(0, 50) || [];
    const s = search.toLowerCase();
    return (loans || []).filter(l =>
      l.account_no?.toLowerCase().includes(s) || l.borrower_name?.toLowerCase().includes(s) || l.account_name?.toLowerCase().includes(s)
    ).slice(0, 50);
  }, [loans, search]);
  const selected = loans?.find(l => l.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="h-9 w-full justify-between text-xs font-normal">
          {selected ? `${selected.account_no} - ${selected.borrower_name}` : 'Select loan...'}
          <ChevronsUpDown className="h-3 w-3 ml-1 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search account, borrower..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No loan found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="none" onSelect={() => { onChange('none'); setOpen(false); }}>
                <span className="text-muted-foreground">None</span>
              </CommandItem>
              {filtered.map(l => (
                <CommandItem key={l.id} value={l.id} onSelect={() => { onChange(l.id); setOpen(false); }}>
                  <Check className={cn('h-3 w-3 mr-2', value === l.id ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono">{l.account_no}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{l.borrower_name} · {l.account_name || '-'}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Searchable combobox for selecting officers
const OfficerCombobox = ({ value, onChange, profiles }: { value: string; onChange: (v: string) => void; profiles: Profile[] }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const active = profiles.filter(p => p.is_active);
    if (!search) return active.slice(0, 30);
    const s = search.toLowerCase();
    return active.filter(p => p.full_name?.toLowerCase().includes(s) || p.email?.toLowerCase().includes(s)).slice(0, 30);
  }, [profiles, search]);
  const selected = profiles.find(p => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="h-9 w-full justify-between text-xs font-normal">
          {selected ? selected.full_name || selected.email : 'Select officer...'}
          <ChevronsUpDown className="h-3 w-3 ml-1 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search officer name..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>No officer found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="none" onSelect={() => { onChange('none'); setOpen(false); }}>
                <span className="text-muted-foreground">None</span>
              </CommandItem>
              {filtered.map(p => (
                <CommandItem key={p.id} value={p.id} onSelect={() => { onChange(p.id); setOpen(false); }}>
                  <Check className={cn('h-3 w-3 mr-2', value === p.id ? 'opacity-100' : 'opacity-0')} />
                  <div>
                    <p className="text-xs">{p.full_name || p.email}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{p.role} · {p.mobile || '-'}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const LegalManagement = () => {
  const { user, profile, userRole } = useAuth();
  const branchFilter = userRole === 'manager' ? profile?.branch_id : undefined;
  const { data: cases, isLoading, error } = useLegalCases(branchFilter);
  const { data: branches } = useBranches();
  const { data: loans } = useLoans(branchFilter);
  const { data: lawyers } = useLawyers();
  const { data: profiles } = useProfiles();
  const { data: notices, isLoading: noticesLoading } = useLegalNotices(branchFilter);
  const createCase = useCreateLegalCase();
  const updateCase = useUpdateLegalCase();
  const deleteCase = useDeleteLegalCase();
  const addOrder = useAddCaseOrder();
  const createLawyer = useCreateLawyer();
  const updateLawyer = useUpdateLawyer();
  const deleteLawyer = useDeleteLawyer();
  const bulkImport = useBulkImportCases();
  const createNotice = useCreateLegalNotice();
  const updateNotice = useUpdateLegalNotice();
  const deleteNotice = useDeleteLegalNotice();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState('cases');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [branchFilterVal, setBranchFilterVal] = useState('all');
  const [lawyerFilter, setLawyerFilter] = useState('all');
  const [statsFilter, setStatsFilter] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editCase, setEditCase] = useState<LegalCase | null>(null);
  const [detailCase, setDetailCase] = useState<LegalCase | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lawyerPanelOpen, setLawyerPanelOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | ''>('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Auto-open a case from ?case=<id> query param (e.g. linked from Loan Management)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const caseId = searchParams.get('case');
    if (caseId && cases) {
      const found = cases.find(c => c.id === caseId);
      if (found) {
        setDetailCase(found);
        setDetailOpen(true);
        // clean URL after opening
        searchParams.delete('case');
        setSearchParams(searchParams, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases]);

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
  const [officerId, setOfficerId] = useState('');
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

  // Notice form state
  const [noticeFormOpen, setNoticeFormOpen] = useState(false);
  const [editNotice, setEditNotice] = useState<LegalNotice | null>(null);
  const [nLoanId, setNLoanId] = useState('');
  const [nBorrowerName, setNBorrowerName] = useState('');
  const [nOrgName, setNOrgName] = useState('');
  const [nAccountNo, setNAccountNo] = useState('');
  const [nNoticeType, setNNoticeType] = useState('Legal Notice');
  const [nSentDate, setNSentDate] = useState('');
  const [nReceiptStatus, setNReceiptStatus] = useState<'pending' | 'received' | 'returned'>('pending');
  const [nReceiptDate, setNReceiptDate] = useState('');
  const [nDeadline, setNDeadline] = useState('');
  const [nRemarks, setNRemarks] = useState('');
  const [nBranchId, setNBranchId] = useState('');
  const [noticeDeleteId, setNoticeDeleteId] = useState('');
  const [noticeDeleteOpen, setNoticeDeleteOpen] = useState(false);
  const [noticeSearch, setNoticeSearch] = useState('');
  const [noticeSortKey, setNoticeSortKey] = useState<string>('');
  const [noticeSortDir, setNoticeSortDir] = useState<SortDir>('asc');
  const canManage = userRole === 'admin' || userRole === 'manager';
  const canDelete = userRole === 'admin' || userRole === 'manager';
  const isEmployee = userRole === 'employee';
  const tableNotReady = error && ((error as any)?.code === 'PGRST205' || (error as any)?.message?.includes('Could not find'));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else {
      setSortKey(key); setSortDir('asc');
    }
  };

  // Loan lookup helper
  const loanMap = useMemo(() => {
    const m = new Map<string, any>();
    loans?.forEach(l => m.set(l.id, l));
    return m;
  }, [loans]);

  const officerMap = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles?.forEach(p => m.set(p.id, p));
    return m;
  }, [profiles]);

  const filtered = useMemo(() => {
    if (!cases) return [];
    let result = cases.filter(c => {
      const loan = c.loan_id ? loanMap.get(c.loan_id) : null;
      const matchSearch = !search || [
        c.case_number, c.plaintiff_name, c.defendant_name,
        loan?.account_no, loan?.borrower_name, loan?.account_name
      ].some(v => v?.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchType = typeFilter === 'all' || c.case_type === typeFilter;
      const matchBranch = branchFilterVal === 'all' || c.branch_id === branchFilterVal;
      const matchLawyer = lawyerFilter === 'all' || c.lawyer_id === lawyerFilter;
      return matchSearch && matchStatus && matchType && matchBranch && matchLawyer;
    });

    // Stats filter
    if (statsFilter) {
      if (statsFilter === 'due7') {
        result = result.filter(c => { const d = daysUntil(c.next_date); return d !== null && d > 0 && d <= 7; });
      } else if (statsFilter === 'today') {
        result = result.filter(c => { const d = daysUntil(c.next_date); return d !== null && d <= 0; });
      } else {
        result = result.filter(c => c.case_type === statsFilter && c.status === 'active');
      }
    }

    // Sort
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let va: any = (a as any)[sortKey];
        let vb: any = (b as any)[sortKey];
        if (typeof va === 'string') va = va?.toLowerCase() || '';
        if (typeof vb === 'string') vb = vb?.toLowerCase() || '';
        if (va == null) va = sortDir === 'asc' ? '\uffff' : '';
        if (vb == null) vb = sortDir === 'asc' ? '\uffff' : '';
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [cases, search, statusFilter, typeFilter, branchFilterVal, lawyerFilter, statsFilter, sortKey, sortDir, loanMap]);

  // Stats should reflect dropdown filters (status, type, branch, lawyer) but NOT statsFilter
  const stats = useMemo(() => {
    if (!cases) return { total: 0, active: 0, ni: 0, niClaim: 0, arthaRin: 0, arthaRinClaim: 0, pdr: 0, pdrClaim: 0, due7: 0, today: 0, totalClaim: 0 };
    // Apply dropdown filters first
    let base = cases.filter(c => {
      const loan = c.loan_id ? loanMap.get(c.loan_id) : null;
      const matchSearch = !search || [
        c.case_number, c.plaintiff_name, c.defendant_name,
        loan?.account_no, loan?.borrower_name, loan?.account_name
      ].some(v => v?.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchType = typeFilter === 'all' || c.case_type === typeFilter;
      const matchBranch = branchFilterVal === 'all' || c.branch_id === branchFilterVal;
      const matchLawyer = lawyerFilter === 'all' || c.lawyer_id === lawyerFilter;
      return matchSearch && matchStatus && matchType && matchBranch && matchLawyer;
    });
    const active = base.filter(c => c.status === 'active');
    const niCases = active.filter(c => c.case_type === 'NI Act');
    const arCases = active.filter(c => c.case_type === 'Artha Rin');
    const pdrCases = active.filter(c => c.case_type === 'PDR');
    const sumClaim = (arr: LegalCase[]) => arr.reduce((s, c) => s + (c.claim_amount || 0), 0);
    return {
      total: active.length,
      active: active.length,
      ni: niCases.length, niClaim: sumClaim(niCases),
      arthaRin: arCases.length, arthaRinClaim: sumClaim(arCases),
      pdr: pdrCases.length, pdrClaim: sumClaim(pdrCases),
      due7: active.filter(c => { const d = daysUntil(c.next_date); return d !== null && d > 0 && d <= 7; }).length,
      today: active.filter(c => { const d = daysUntil(c.next_date); return d !== null && d <= 0; }).length,
      totalClaim: sumClaim(active),
    };
  }, [cases, search, statusFilter, typeFilter, branchFilterVal, lawyerFilter, loanMap]);

  // Notice stats
  const noticeStats = useMemo(() => {
    if (!notices) return { total: 0, pending: 0, received: 0, returned: 0, due7: 0 };
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const todayStr = localDateStr(now);
    const end7 = new Date(now.getTime() + 7 * 86400000);
    const in7 = localDateStr(end7);
    return {
      total: notices.length,
      pending: notices.filter(n => n.receipt_status === 'pending').length,
      received: notices.filter(n => n.receipt_status === 'received').length,
      returned: notices.filter(n => n.receipt_status === 'returned').length,
      due7: notices.filter(n => n.case_filing_deadline && n.case_filing_deadline >= todayStr && n.case_filing_deadline <= in7).length,
    };
  }, [notices]);

  const toggleNoticeSort = (key: string) => {
    if (noticeSortKey === key) {
      if (noticeSortDir === 'asc') setNoticeSortDir('desc');
      else { setNoticeSortKey(''); setNoticeSortDir('asc'); }
    } else {
      setNoticeSortKey(key); setNoticeSortDir('asc');
    }
  };

  const branchMap = useMemo(() => {
    const m = new Map<string, string>();
    branches?.forEach(b => m.set(b.id, b.branch_name));
    return m;
  }, [branches]);

  const filteredNotices = useMemo(() => {
    if (!notices) return [];
    let result = notices;
    if (noticeSearch) {
      const s = noticeSearch.toLowerCase();
      result = result.filter(n =>
        n.borrower_name?.toLowerCase().includes(s) ||
        n.organization_name?.toLowerCase().includes(s) ||
        n.account_no?.toLowerCase().includes(s) ||
        n.notice_type?.toLowerCase().includes(s)
      );
    }
    if (noticeSortKey) {
      result = [...result].sort((a, b) => {
        let va: any = (a as any)[noticeSortKey];
        let vb: any = (b as any)[noticeSortKey];
        if (typeof va === 'string') va = va?.toLowerCase() || '';
        if (typeof vb === 'string') vb = vb?.toLowerCase() || '';
        if (va == null) va = noticeSortDir === 'asc' ? '\uffff' : '';
        if (vb == null) vb = noticeSortDir === 'asc' ? '\uffff' : '';
        if (va < vb) return noticeSortDir === 'asc' ? -1 : 1;
        if (va > vb) return noticeSortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [notices, noticeSearch, noticeSortKey, noticeSortDir]);

  const openCreate = () => {
    setEditCase(null);
    setCaseNumber(''); setCaseType('Artha Rin'); setCourtName(''); setFilingDate('');
    setCaseStatus('active'); setPlaintiffName(''); setDefendantName('');
    setLawyerId(''); setLoanId(''); setOfficerId(''); setBranchId(profile?.branch_id || ''); setDescription('');
    setClaimAmount(''); setFormNextDate(''); setRemarks('');
    setFormOpen(true);
  };

  const openEdit = (c: LegalCase) => {
    setEditCase(c);
    setCaseNumber(c.case_number); setCaseType(c.case_type); setCourtName(c.court_name || '');
    setFilingDate(c.filing_date || ''); setCaseStatus(c.status); setPlaintiffName(c.plaintiff_name || '');
    setDefendantName(c.defendant_name || ''); setLawyerId(c.lawyer_id || '');
    setLoanId(c.loan_id || ''); setOfficerId(c.officer_id || ''); setBranchId(c.branch_id || ''); setDescription(c.description || '');
    setClaimAmount(String(c.claim_amount || '')); setFormNextDate(c.next_date || ''); setRemarks(c.remarks || '');
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!caseNumber.trim()) { toast.error('Case number is required'); return; }
    setSaving(true);
    const payload: any = {
      case_number: caseNumber.trim(), case_type: caseType,
      court_name: courtName.trim() || null, filing_date: filingDate || null,
      status: caseStatus, plaintiff_name: plaintiffName.trim() || null,
      defendant_name: defendantName.trim() || null,
      lawyer_id: lawyerId && lawyerId !== 'none' ? lawyerId : null,
      loan_id: loanId && loanId !== 'none' ? loanId : null,
      officer_id: officerId && officerId !== 'none' ? officerId : null,
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
    await deleteCase.mutateAsync({ id: deleteId, _userId: user?.id, _userName: profile?.full_name });
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
  const openLawyerCreate = () => { setEditLawyer(null); setLwName(''); setLwMobile(''); setLwEmail(''); setLwSpec(''); setLawyerFormOpen(true); };
  const openLawyerEdit = (l: Lawyer) => { setEditLawyer(l); setLwName(l.name); setLwMobile(l.mobile || ''); setLwEmail(l.email || ''); setLwSpec(l.specialization || ''); setLawyerFormOpen(true); };
  const handleSaveLawyer = async () => {
    if (!lwName.trim()) { toast.error('Name required'); return; }
    const data = { name: lwName.trim(), mobile: lwMobile.trim() || null, email: lwEmail.trim() || null, specialization: lwSpec.trim() || null };
    if (editLawyer) await updateLawyer.mutateAsync({ id: editLawyer.id, ...data });
    else await createLawyer.mutateAsync(data);
    setLawyerFormOpen(false);
  };
  const handleDeleteLawyer = async () => { await deleteLawyer.mutateAsync({ id: lwDeleteId, _userId: user?.id, _userName: profile?.full_name }); setLwDeleteOpen(false); };

  // Notice management
  const openCreateNotice = () => {
    setEditNotice(null);
    setNLoanId(''); setNBorrowerName(''); setNOrgName(''); setNAccountNo('');
    setNNoticeType('Legal Notice'); setNSentDate(''); setNReceiptStatus('pending');
    setNReceiptDate(''); setNDeadline(''); setNRemarks(''); setNBranchId(profile?.branch_id || '');
    setNoticeFormOpen(true);
  };
  const openEditNotice = (n: LegalNotice) => {
    setEditNotice(n);
    setNLoanId(n.loan_id || ''); setNBorrowerName(n.borrower_name || ''); setNOrgName(n.organization_name || '');
    setNAccountNo(n.account_no || ''); setNNoticeType(n.notice_type); setNSentDate(n.sent_date || '');
    setNReceiptStatus(n.receipt_status); setNReceiptDate(n.receipt_date || '');
    setNDeadline(n.case_filing_deadline || ''); setNRemarks(n.remarks || ''); setNBranchId(n.branch_id || '');
    setNoticeFormOpen(true);
  };
  const handleSaveNotice = async () => {
    if (!nBorrowerName.trim() && !nAccountNo.trim()) { toast.error('Borrower name or account no required'); return; }
    const payload: Partial<LegalNotice> = {
      loan_id: nLoanId && nLoanId !== 'none' ? nLoanId : null,
      borrower_name: nBorrowerName.trim() || null, organization_name: nOrgName.trim() || null,
      account_no: nAccountNo.trim() || null, notice_type: nNoticeType,
      sent_date: nSentDate || null, receipt_status: nReceiptStatus,
      receipt_date: nReceiptDate || null, case_filing_deadline: nDeadline || null,
      branch_id: nBranchId && nBranchId !== 'none' ? nBranchId : (profile?.branch_id || null), remarks: nRemarks.trim() || null,
    };
    if (editNotice) await updateNotice.mutateAsync({ id: editNotice.id, ...payload });
    else await createNotice.mutateAsync({ ...payload, created_by: user?.id });
    setNoticeFormOpen(false);
  };
  const handleDeleteNotice = async () => { await deleteNotice.mutateAsync({ id: noticeDeleteId, _userId: user?.id, _userName: profile?.full_name }); setNoticeDeleteOpen(false); };

  // When loan is selected in notice form, auto-fill
  const handleNoticeLoanSelect = (id: string) => {
    setNLoanId(id);
    if (id && id !== 'none') {
      const loan = loanMap.get(id);
      if (loan) {
        setNBorrowerName(loan.borrower_name || '');
        setNOrgName(loan.account_name || '');
        setNAccountNo(loan.account_no || '');
      }
    }
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
        const caseData: Partial<LegalCase>[] = rows.map((r: any) => ({
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
        if (!caseData.length) { toast.error('No valid rows found'); return; }
        await bulkImport.mutateAsync({ cases: caseData, _userId: user?.id, _userName: profile?.full_name });
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

  // Statement PDF - Fixed
  const generateStatement = (c: LegalCase, orders: any[], recoveries: any[]) => {
    const doc = new jsPDF();
    const lawyer = lawyers?.find(l => l.id === c.lawyer_id);
    const loan = loanMap.get(c.loan_id || '');
    const officer = c.officer_id ? officerMap.get(c.officer_id) : null;
    doc.setFontSize(16); doc.text('Legal Case Statement', 14, 20);
    doc.setFontSize(10);
    let y = 35;
    const line = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold'); doc.text(label + ':', 14, y);
      doc.setFont('helvetica', 'normal'); doc.text(value || '-', 65, y); y += 6;
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
    if (officer) line('Officer', officer.full_name || '-');
    if (officer?.mobile) line('Officer Mobile', officer.mobile || '-');
    line('Claim Amount', c.claim_amount != null ? `Tk ${c.claim_amount.toLocaleString()}` : '-');
    if (loan) {
      line('Account No', loan.account_no || '-');
      line('Borrower', loan.borrower_name || '-');
      line('Organization', loan.account_name || '-');
      const outstanding = loan.outstanding_amount != null ? loan.outstanding_amount : 0;
      line('Outstanding Amount', `Tk ${outstanding.toLocaleString()}`);
    }
    const totalRecovery = (recoveries || []).reduce((s: number, r: any) => s + (Number(r.recovered_amount) || 0), 0);
    line('Post-Case Recovery', `Tk ${totalRecovery.toLocaleString()}`);
    line('Next Date', c.next_date || '-');
    y += 5;
    doc.setFont('helvetica', 'bold'); doc.text('Latest Orders:', 14, y); y += 6;
    doc.setFont('helvetica', 'normal');
    const latest3 = (orders || []).slice(0, 3);
    if (latest3.length === 0) { doc.text('No orders recorded.', 14, y); y += 6; }
    else {
      latest3.forEach((o: any) => {
        doc.text(`${o.order_date} - ${(o.order_summary || '').substring(0, 80)}`, 14, y); y += 5;
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
    const cols = ['Case No', 'Type', 'Account', 'Borrower', 'Claim', 'Next Date', 'Status', 'Latest Order', 'Order Date'];
    const widths = [28, 22, 22, 30, 26, 22, 18, 60, 22];
    const xs: number[] = []; { let x = 10; widths.forEach(w => { xs.push(x); x += w; }); }
    doc.setFont('helvetica', 'bold');
    cols.forEach((h, i) => doc.text(h, xs[i], y));
    y += 5; doc.setFont('helvetica', 'normal');
    filtered.forEach(c => {
      if (y > 195) { doc.addPage(); y = 15; }
      const loan = c.loan_id ? loanMap.get(c.loan_id) : null;
      const orderSummary = c.latest_order_summary ? String(c.latest_order_summary).substring(0, 50) : '-';
      const vals = [
        c.case_number, c.case_type, loan?.account_no || '-', loan?.borrower_name || '-',
        c.claim_amount ? `Tk ${c.claim_amount.toLocaleString()}` : '-',
        c.next_date || '-', c.status, orderSummary, c.latest_order_date || '-',
      ];
      vals.forEach((v, i) => {
        const maxLen = i === 7 ? 50 : 18;
        doc.text(String(v).substring(0, maxLen), xs[i], y);
      });
      y += 4.5;
    });
    doc.save(`legal_cases_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleStatsClick = (filter: string) => {
    setStatsFilter(prev => prev === filter ? null : filter);
  };

  return (
    <div className="container py-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Mamla / Legal Management</h1>
          <p className="text-sm text-muted-foreground">Manage legal cases, court orders, notices, and lawyers</p>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cases">মামলা ({cases?.length || 0})</TabsTrigger>
          <TabsTrigger value="notices">নোটিশ ({notices?.length || 0})</TabsTrigger>
        </TabsList>

        {/* ==================== CASES TAB ==================== */}
        <TabsContent value="cases" className="space-y-4 mt-4">
          {/* Stats - clickable with claim amounts */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <Card className={`border-2 border-primary/30 cursor-pointer transition-all ${statsFilter === null ? '' : !statsFilter ? 'ring-2 ring-primary' : ''}`} onClick={() => setStatsFilter(null)}>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Active Cases</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-[10px] text-muted-foreground">৳{stats.totalClaim.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all ${statsFilter === 'NI Act' ? 'ring-2 ring-primary' : ''}`} onClick={() => handleStatsClick('NI Act')}>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">NI Act</p>
                <p className="text-xl font-bold">{stats.ni}</p>
                <p className="text-[10px] text-muted-foreground">৳{stats.niClaim.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all ${statsFilter === 'Artha Rin' ? 'ring-2 ring-primary' : ''}`} onClick={() => handleStatsClick('Artha Rin')}>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Artha Rin</p>
                <p className="text-xl font-bold">{stats.arthaRin}</p>
                <p className="text-[10px] text-muted-foreground">৳{stats.arthaRinClaim.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all ${statsFilter === 'PDR' ? 'ring-2 ring-primary' : ''}`} onClick={() => handleStatsClick('PDR')}>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">PDR</p>
                <p className="text-xl font-bold">{stats.pdr}</p>
                <p className="text-[10px] text-muted-foreground">৳{stats.pdrClaim.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className={`border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 cursor-pointer hover:ring-2 hover:ring-yellow-400/30 transition-all ${statsFilter === 'due7' ? 'ring-2 ring-yellow-500' : ''}`} onClick={() => handleStatsClick('due7')}>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Due 7 Days</p>
                <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{stats.due7}</p>
              </CardContent>
            </Card>
            <Card className={`border-destructive/30 bg-destructive/5 cursor-pointer hover:ring-2 hover:ring-destructive/30 transition-all ${statsFilter === 'today' ? 'ring-2 ring-destructive' : ''}`} onClick={() => handleStatsClick('today')}>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Today</p>
                <p className="text-xl font-bold text-destructive">{stats.today}</p>
              </CardContent>
            </Card>
            {statsFilter && (
              <Card className="border-dashed cursor-pointer hover:bg-muted/50" onClick={() => setStatsFilter(null)}>
                <CardContent className="p-3 text-center flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">✕ Clear Filter</span>
                </CardContent>
              </Card>
            )}
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
                const loan = c.loan_id ? loanMap.get(c.loan_id) : null;
                const officer = c.officer_id ? officerMap.get(c.officer_id) : null;
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
                        {loan && (
                          <>
                            <div>
                              <span className="text-muted-foreground">A/C:</span> <span className="font-mono">{loan.account_no}</span>
                              {loan.account_name && <p className="text-[10px] text-muted-foreground">{loan.account_name}</p>}
                            </div>
                            <div><span className="text-muted-foreground">Borrower:</span> {loan.borrower_name}</div>
                          </>
                        )}
                        <div><span className="text-muted-foreground">Claim:</span> {c.claim_amount ? `৳${c.claim_amount.toLocaleString()}` : '-'}</div>
                        <div className="col-span-2 flex items-center gap-1">
                          <span className="text-muted-foreground">Next:</span> {nextDateBadge(c.next_date) || '-'}
                        </div>
                        {c.latest_order_summary && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Last Order:</span> <span className="truncate">{c.latest_order_summary}</span>
                            {c.latest_order_date && <span className="text-muted-foreground ml-1">({c.latest_order_date})</span>}
                          </div>
                        )}
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
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('case_number')}>
                    <span className="flex items-center">Case No <SortIcon active={sortKey === 'case_number'} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('case_type')}>
                    <span className="flex items-center">Type <SortIcon active={sortKey === 'case_type'} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    <span className="flex items-center">Status <SortIcon active={sortKey === 'status'} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('claim_amount')}>
                    <span className="flex items-center">Claim <SortIcon active={sortKey === 'claim_amount'} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('next_date')}>
                    <span className="flex items-center">Next Date <SortIcon active={sortKey === 'next_date'} dir={sortDir} /></span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Latest Order</TableHead>
                  {canManage && <TableHead>Actions</TableHead>}
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map(c => {
                    const loan = c.loan_id ? loanMap.get(c.loan_id) : null;
                    return (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDetailCase(c); setDetailOpen(true); }}>
                        <TableCell className="font-mono text-sm font-medium">{c.case_number}</TableCell>
                        <TableCell className="text-sm">{c.case_type}</TableCell>
                        <TableCell>
                          <div>
                            <span className="font-mono text-xs">{loan?.account_no || '-'}</span>
                            {loan?.account_name && <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{loan.account_name}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{loan?.borrower_name || c.defendant_name || '-'}</TableCell>
                        <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="capitalize text-xs">{c.status}</Badge></TableCell>
                        <TableCell className="text-sm">{c.claim_amount ? `৳${c.claim_amount.toLocaleString()}` : '-'}</TableCell>
                        <TableCell>{nextDateBadge(c.next_date) || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs max-w-[200px]">
                          {c.latest_order_summary ? (
                            <div>
                              <p className="truncate">{c.latest_order_summary}</p>
                              {c.latest_order_date && <p className="text-[10px] text-muted-foreground">{c.latest_order_date}</p>}
                            </div>
                          ) : '-'}
                        </TableCell>
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
        </TabsContent>

        {/* ==================== NOTICES TAB ==================== */}
        <TabsContent value="notices" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Card className="border-2 border-primary/30"><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Total Notices</p>
              <p className="text-2xl font-bold">{noticeStats.total}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{noticeStats.pending}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Received</p>
              <p className="text-xl font-bold text-green-600">{noticeStats.received}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Returned</p>
              <p className="text-xl font-bold text-destructive">{noticeStats.returned}</p>
            </CardContent></Card>
            <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20"><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Filing Due 7d</p>
              <p className="text-xl font-bold text-amber-600">{noticeStats.due7}</p>
            </CardContent></Card>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[160px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search notice..." className="pl-10 h-9" value={noticeSearch} onChange={e => setNoticeSearch(e.target.value)} />
            </div>
            <div className="flex-1" />
            {canManage && (
              <Button size="sm" onClick={openCreateNotice} className="gap-1.5"><Plus className="h-4 w-4" /> Add Notice</Button>
            )}
          </div>

          {noticesLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : !filteredNotices.length ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No notices found.</CardContent></Card>
          ) : isMobile ? (
            <div className="space-y-3">
              {filteredNotices.map(n => (
                <Card key={n.id} className="card-shadow">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{n.borrower_name || '-'}</p>
                        <p className="text-xs text-muted-foreground">{n.organization_name || '-'} · {n.account_no || '-'}</p>
                      </div>
                      <Badge variant={n.receipt_status === 'received' ? 'default' : n.receipt_status === 'returned' ? 'destructive' : 'secondary'} className="capitalize text-[10px]">{n.receipt_status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div><span className="text-muted-foreground">Type:</span> {n.notice_type}</div>
                      <div><span className="text-muted-foreground">Sent:</span> {n.sent_date || '-'}</div>
                      <div><span className="text-muted-foreground">Receipt:</span> {n.receipt_date || '-'}</div>
                      <div><span className="text-muted-foreground">Deadline:</span> {n.case_filing_deadline || '-'}</div>
                      <div className="col-span-2"><span className="text-muted-foreground">Branch:</span> {n.branch_id ? branchMap.get(n.branch_id) || '-' : '-'}</div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1 pt-1 border-t border-border/50">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openEditNotice(n)}>
                          <Pencil className="h-3 w-3" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={() => { setNoticeDeleteId(n.id); setNoticeDeleteOpen(true); }}>
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleNoticeSort('borrower_name')}>
                    <span className="flex items-center">Borrower <SortIcon active={noticeSortKey === 'borrower_name'} dir={noticeSortDir} /></span>
                  </TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleNoticeSort('account_no')}>
                    <span className="flex items-center">Account No <SortIcon active={noticeSortKey === 'account_no'} dir={noticeSortDir} /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleNoticeSort('notice_type')}>
                    <span className="flex items-center">Notice Type <SortIcon active={noticeSortKey === 'notice_type'} dir={noticeSortDir} /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleNoticeSort('sent_date')}>
                    <span className="flex items-center">Sent <SortIcon active={noticeSortKey === 'sent_date'} dir={noticeSortDir} /></span>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt Date</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleNoticeSort('case_filing_deadline')}>
                    <span className="flex items-center">Filing Deadline <SortIcon active={noticeSortKey === 'case_filing_deadline'} dir={noticeSortDir} /></span>
                  </TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Remarks</TableHead>
                  {canManage && <TableHead>Actions</TableHead>}
                </TableRow></TableHeader>
                <TableBody>
                  {filteredNotices.map(n => (
                    <TableRow key={n.id}>
                      <TableCell className="text-sm">{n.borrower_name || '-'}</TableCell>
                      <TableCell className="text-sm">{n.organization_name || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{n.account_no || '-'}</TableCell>
                      <TableCell className="text-sm">{n.notice_type}</TableCell>
                      <TableCell className="text-xs">{n.sent_date || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={n.receipt_status === 'received' ? 'default' : n.receipt_status === 'returned' ? 'destructive' : 'secondary'} className="capitalize text-xs">{n.receipt_status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{n.receipt_date || '-'}</TableCell>
                      <TableCell className="text-xs">{n.case_filing_deadline ? nextDateBadge(n.case_filing_deadline) || n.case_filing_deadline : '-'}</TableCell>
                      <TableCell className="text-xs">{n.branch_id ? branchMap.get(n.branch_id) || '-' : '-'}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate" title={n.remarks || ''}>{n.remarks || '-'}</TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEditNotice(n)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setNoticeDeleteId(n.id); setNoticeDeleteOpen(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="px-4 py-2 text-xs text-muted-foreground border-t">Showing {filteredNotices.length} notices</div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Drawer */}
      <CaseDetailDrawer
        legalCase={detailCase} open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailCase(null); }}
        canManage={canManage} isEmployee={isEmployee}
        lawyers={lawyers || []} loans={loans || []}
        profiles={profiles || []}
        loanMap={loanMap} officerMap={officerMap}
        orderDate={orderDate} setOrderDate={setOrderDate}
        orderSummary={orderSummary} setOrderSummary={setOrderSummary}
        nextDate={nextDate} setNextDate={setNextDate}
        orderType={orderType} setOrderType={setOrderType}
        onAddOrder={handleAddOrder} addOrderPending={addOrder.isPending}
        onGenerateStatement={generateStatement}
      />

      {/* Create/Edit Case Dialog */}
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
              <div className="space-y-1.5"><Label className="text-xs">Linked Loan (Searchable)</Label>
                <LoanCombobox value={loanId} onChange={setLoanId} loans={loans || []} />
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Responsible Officer</Label>
                <OfficerCombobox value={officerId} onChange={setOfficerId} profiles={profiles || []} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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

      {/* Notice Form Dialog */}
      <Dialog open={noticeFormOpen} onOpenChange={v => { if (!v) setNoticeFormOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editNotice ? 'Edit Notice' : 'New Legal Notice'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Linked Loan (Optional, auto-fills fields)</Label>
              <LoanCombobox value={nLoanId} onChange={handleNoticeLoanSelect} loans={loans || []} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Borrower Name *</Label>
                <Input value={nBorrowerName} onChange={e => setNBorrowerName(e.target.value)} className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Organization Name</Label>
                <Input value={nOrgName} onChange={e => setNOrgName(e.target.value)} className="h-9" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Account No</Label>
                <Input value={nAccountNo} onChange={e => setNAccountNo(e.target.value)} className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Notice Type</Label>
                <Select value={nNoticeType} onValueChange={setNNoticeType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{NOTICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Sent Date</Label>
                <Input type="date" value={nSentDate} onChange={e => setNSentDate(e.target.value)} className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Receipt Status</Label>
                <Select value={nReceiptStatus} onValueChange={v => setNReceiptStatus(v as any)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="received">Received ✓</SelectItem>
                    <SelectItem value="returned">Returned ✗</SelectItem>
                  </SelectContent>
                </Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Receipt/Return Date</Label>
                <Input type="date" value={nReceiptDate} onChange={e => setNReceiptDate(e.target.value)} className="h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Case Filing Deadline</Label>
                <Input type="date" value={nDeadline} onChange={e => setNDeadline(e.target.value)} className="h-9" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Branch</Label>
                <Select value={nBranchId} onValueChange={setNBranchId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {branches?.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Remarks</Label>
              <Textarea value={nRemarks} onChange={e => setNRemarks(e.target.value)} className="min-h-[50px]" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNoticeFormOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveNotice} disabled={createNotice.isPending || updateNotice.isPending}>
                {(createNotice.isPending || updateNotice.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editNotice ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Case Confirmation */}
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

      {/* Delete Notice Confirmation */}
      <AlertDialog open={noticeDeleteOpen} onOpenChange={setNoticeDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notice</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this legal notice.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNotice} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
  profiles: Profile[];
  loanMap: Map<string, any>; officerMap: Map<string, Profile>;
  orderDate: string; setOrderDate: (v: string) => void;
  orderSummary: string; setOrderSummary: (v: string) => void;
  nextDate: string; setNextDate: (v: string) => void;
  orderType: string; setOrderType: (v: string) => void;
  onAddOrder: () => void; addOrderPending: boolean;
  onGenerateStatement: (c: LegalCase, orders: any[], recoveries: any[]) => void;
}

const CaseDetailDrawer = ({ legalCase, open, onClose, canManage, isEmployee, lawyers, loans,
  profiles, loanMap, officerMap,
  orderDate, setOrderDate, orderSummary, setOrderSummary, nextDate, setNextDate,
  orderType, setOrderType, onAddOrder, addOrderPending, onGenerateStatement }: DrawerProps) => {
  const { user, profile, userRole } = useAuth();
  const { data: orders } = useCaseOrders(legalCase?.id || null);
  const { data: recoveries } = useLoanRecoveries(legalCase?.loan_id || null);
  const updateOrder = useUpdateCaseOrder();
  const deleteOrder = useDeleteCaseOrder();

  // Edit/Delete state for orders
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [eOrderDate, setEOrderDate] = useState('');
  const [eOrderSummary, setEOrderSummary] = useState('');
  const [eNextDate, setENextDate] = useState('');
  const [eOrderType, setEOrderType] = useState('');
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  if (!legalCase) return null;

  const canEditOrders = userRole === 'admin' || userRole === 'manager';
  const lawyer = lawyers.find(l => l.id === legalCase.lawyer_id);
  const loan = legalCase.loan_id ? loanMap.get(legalCase.loan_id) : null;
  const officer = legalCase.officer_id ? officerMap.get(legalCase.officer_id) : null;
  const totalRecovery = (recoveries || []).reduce((s, r) => s + (Number(r.recovered_amount) || 0), 0);

  const openEditOrder = (o: any) => {
    setEditOrderId(o.id);
    setEOrderDate(o.order_date || '');
    setEOrderSummary(o.order_summary || '');
    setENextDate(o.next_date || '');
    setEOrderType(o.order_type || '');
  };

  const handleSaveOrderEdit = async () => {
    if (!editOrderId || !legalCase) return;
    try {
      await updateOrder.mutateAsync({
        id: editOrderId,
        case_id: legalCase.id,
        order_date: eOrderDate,
        order_summary: eOrderSummary,
        next_date: eNextDate || null,
        order_type: eOrderType || null,
        _userId: user?.id, _userName: profile?.full_name,
      });
      setEditOrderId(null);
    } catch {}
  };

  const handleConfirmDeleteOrder = async () => {
    if (!deleteOrderId || !legalCase) return;
    try {
      await deleteOrder.mutateAsync({
        id: deleteOrderId, case_id: legalCase.id,
        _userId: user?.id, _userName: profile?.full_name,
      });
      setDeleteOrderId(null);
    } catch {}
  };

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
          {officer && <Row label="Officer" value={officer.full_name} />}
          {officer?.mobile && <Row label="Officer Mobile" value={officer.mobile} />}
          <div className="flex justify-between py-1 text-sm">
            <span className="text-muted-foreground">Next Date</span>
            <span>{nextDateBadge(legalCase.next_date) || '-'}</span>
          </div>
          {legalCase.latest_order_date && (
            <Row label="Latest Order Date" value={legalCase.latest_order_date} />
          )}
          {legalCase.remarks && <Row label="Remarks" value={legalCase.remarks} />}
          {loan && (
            <>
              <Separator className="my-2" />
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Linked Loan</h4>
              <Row label="Account No" value={loan.account_no} />
              <Row label="Borrower" value={loan.borrower_name} />
              <Row label="Organization" value={loan.account_name} />
              <Row label="Outstanding" value={`৳${(loan.outstanding_amount != null ? loan.outstanding_amount : 0).toLocaleString()}`} />
              <Row label="Post-Case Recovery" value={`৳${totalRecovery.toLocaleString()}`} />
            </>
          )}
        </div>

        <Separator className="my-3" />

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Court Orders</h4>
          {orders && orders.length > 0 ? (
            <div className="space-y-2">
              {orders.map((o, i) => (
                <Card key={o.id} className={i < 3 ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}>
                  <CardContent className="p-3 space-y-1">
                    <div className="flex justify-between items-start text-xs gap-2">
                      <Badge variant="outline" className="text-[10px]">{o.order_type || 'Order'}</Badge>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">{o.order_date}</span>
                        {canEditOrders && (
                          <>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditOrder(o)} aria-label="Edit order">
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeleteOrderId(o.id)} aria-label="Delete order">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
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

        {/* Edit Order Dialog */}
        <Dialog open={!!editOrderId} onOpenChange={v => { if (!v) setEditOrderId(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Court Order</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label className="text-xs">Order Date *</Label>
                  <Input type="date" value={eOrderDate} onChange={e => setEOrderDate(e.target.value)} className="h-9" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Type</Label>
                  <Input value={eOrderType} onChange={e => setEOrderType(e.target.value)} className="h-9" placeholder="Adjournment" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Order Summary *</Label>
                <Textarea value={eOrderSummary} onChange={e => setEOrderSummary(e.target.value)} className="min-h-[80px]" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Next Date</Label>
                <Input type="date" value={eNextDate} onChange={e => setENextDate(e.target.value)} className="h-9" /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOrderId(null)}>Cancel</Button>
                <Button onClick={handleSaveOrderEdit} disabled={updateOrder.isPending || !eOrderDate || !eOrderSummary.trim()}>
                  {updateOrder.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Order Confirmation */}
        <AlertDialog open={!!deleteOrderId} onOpenChange={v => { if (!v) setDeleteOrderId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Order</AlertDialogTitle>
              <AlertDialogDescription>This order will be permanently removed and the case's latest order will be recomputed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
};

export default LegalManagement;
