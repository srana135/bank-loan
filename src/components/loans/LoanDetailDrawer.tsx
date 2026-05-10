import { Loan, Branch, LegalCase, LegalNotice } from '@/types';
import { UserRole } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Pencil, Trash2, Phone, MessageSquare, Banknote, Clock, MapPin, ExternalLink, Gavel, FileWarning, ChevronRight } from 'lucide-react';
import AccountStatusChange from './AccountStatusChange';
import LoanComments from './LoanComments';
import LoanRecoveries from './LoanRecoveries';
import LoanTimeline from './LoanTimeline';
import ClassificationSuggestion from './ClassificationSuggestion';
import { useLoanRecoveries } from '@/hooks/useRecoveries';
import PhoneWithIcons from '@/components/PhoneWithIcons';

interface Props {
  loan: Loan | null;
  open: boolean;
  onClose: () => void;
  onEdit: (loan: Loan) => void;
  onDelete: (id: string) => void;
  userRole: UserRole | null;
  branches: Branch[];
  legalCases?: LegalCase[];
  legalNotices?: LegalNotice[];
  onOpenCase?: (id: string) => void;
  onOpenNotice?: (id: string) => void;
}

const classColors: Record<string, string> = {
  STD: 'default' as any,
  SMA: 'secondary' as any,
  SS: 'secondary' as any,
  DF: 'destructive' as any,
  BL: 'destructive' as any,
};

const LoanDetailDrawer = ({ loan, open, onClose, onEdit, onDelete, userRole, branches, legalCases, legalNotices, onOpenCase, onOpenNotice }: Props) => {
  if (!loan) return null;
  const canEdit = userRole === 'admin' || userRole === 'manager';
  const canDelete = userRole === 'admin' || userRole === 'manager';

  const linkedCases = (legalCases || []).filter(c => c.loan_id === loan.id);
  const linkedNotices = (legalNotices || []).filter(n => n.loan_id === loan.id);
  const hasLegalRecords = linkedCases.length > 0 || linkedNotices.length > 0;

  // Live total recovery sum
  const { data: recoveries } = useLoanRecoveries(loan.id);
  const totalRecovery = (recoveries || []).reduce((s, r) => s + (r.recovered_amount || 0), 0);

  // Expiry / overdue calculation
  const fmtDDMMYYYY = (s?: string | null) =>
    s ? new Date(s).toLocaleDateString('en-GB').replace(/\//g, '-') : '-';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = loan.expiry_date ? new Date(loan.expiry_date) : null;
  if (expiry) expiry.setHours(0, 0, 0, 0);
  const isOverdue = expiry ? today.getTime() > expiry.getTime() : false;
  const dayDiff = expiry
    ? Math.ceil((expiry.getTime() - today.getTime()) / 86400000)
    : null;
  const formatMonthsDays = (days: number) => {
    const d = Math.abs(days);
    const months = Math.floor(d / 30);
    const rem = d % 30;
    if (months === 0) return `${rem} দিন`;
    if (rem === 0) return `${months} মাস`;
    return `${months} মাস ${rem} দিন`;
  };

  // Build Google Maps URL — prefer coords, fall back to address text
  const mapsUrl = (() => {
    if (loan.latitude && loan.longitude) {
      return `https://www.google.com/maps?q=${loan.latitude},${loan.longitude}`;
    }
    if (loan.address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loan.address)}`;
    }
    return null;
  })();

  const DetailRow = ({ label, value, isPhone }: { label: string; value?: string | number | null; isPhone?: boolean }) => (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {isPhone && value ? (
        <span className="font-medium text-right">
          <PhoneWithIcons phone={String(value)} showPhoneIcon />
        </span>
      ) : (
        <span className="font-medium text-right max-w-[60%] break-words">{value ?? '-'}</span>
      )}
    </div>
  );

  const PhoneRow = ({ label, phone, hasWhatsapp, hasImo, whatsappField, imoField }: {
    label: string; phone?: string | null; hasWhatsapp?: boolean; hasImo?: boolean; whatsappField: string; imoField: string;
  }) => (
    <div className="flex justify-between items-center py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">
        <PhoneWithIcons
          phone={phone}
          loanId={loan.id}
          hasWhatsapp={hasWhatsapp}
          hasImo={hasImo}
          whatsappField={whatsappField}
          imoField={imoField}
          showPhoneIcon
        />
      </span>
    </div>
  );

  const AddressRow = () => (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">Address</span>
      {loan.address && mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-right max-w-[60%] break-words text-primary hover:underline inline-flex items-center gap-1"
          title="Open in Google Maps"
        >
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="break-words">{loan.address}</span>
          <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60" />
        </a>
      ) : (
        <span className="font-medium text-right max-w-[60%] break-words">{loan.address ?? '-'}</span>
      )}
    </div>
  );

  const branchName = branches.find(b => b.id === loan.branch_id)?.branch_name || '-';

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className={`text-lg ${isOverdue ? 'text-destructive font-bold' : ''}`}>
                {loan.borrower_name}
              </SheetTitle>
              <SheetDescription className={`font-mono ${isOverdue ? 'text-destructive font-bold' : ''}`}>
                {loan.account_no}
              </SheetDescription>
              {isOverdue && (
                <Badge variant="destructive" className="mt-2">মেয়াদ উত্তীর্ণ</Badge>
              )}
            </div>
            <Badge variant={classColors[loan.classification || ''] as any || 'secondary'}>{loan.classification}</Badge>
          </div>
          <ClassificationSuggestion loan={loan} />
        </SheetHeader>

        {/* Actions */}
        {(canEdit || canDelete) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {canEdit && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => { onClose(); onEdit(loan); }}>
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            )}
            <AccountStatusChange loanId={loan.id} currentStatus={loan.account_status} accountNo={loan.account_no} />
            {canDelete && (
              <Button variant="destructive" size="sm" className="gap-1"
                onClick={() => { if (confirm(`Delete loan ${loan.account_no}?`)) { onClose(); onDelete(loan.id); } }}>
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
            )}
          </div>
        )}

        {/* Details */}
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Account Details</h4>
          <DetailRow label="Account No" value={loan.account_no} />
          <DetailRow label="Account Name" value={loan.account_name} />
          <DetailRow label="Borrower Name" value={loan.borrower_name} />
          <PhoneRow label="Mobile" phone={loan.mobile} hasWhatsapp={loan.has_whatsapp} hasImo={loan.has_imo} whatsappField="has_whatsapp" imoField="has_imo" />
          <DetailRow label="Account Type" value={loan.account_type} />
          <DetailRow label="Account Status" value={loan.account_status} />
          <AddressRow />
          <DetailRow label="Branch" value={branchName} />
        </div>

        <Separator className="my-3" />

        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Financial</h4>
          <DetailRow label="Installment" value={`৳${(loan.installment_amount || 0).toLocaleString()}`} />
          <DetailRow label="Overdue Installments" value={Number(loan.overdue_installment_number || 0).toFixed(2)} />
          <DetailRow label="Overdue Amount" value={`৳${(loan.overdue_amount || 0).toLocaleString()}`} />
          <DetailRow label="Outstanding" value={`৳${(loan.outstanding_amount || 0).toLocaleString()}`} />
          <DetailRow label="Classification" value={loan.classification} />
          <DetailRow label="Disbursed Amount" value={loan.disbursed_loan_amount ? `৳${loan.disbursed_loan_amount.toLocaleString()}` : null} />
          <DetailRow label="Disbursement Date" value={loan.disbursement_date} />
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Banknote className="h-3 w-3 text-green-600" /> Total Recovery
            </span>
            <span className="font-semibold text-right text-green-700 dark:text-green-400">
              ৳{totalRecovery.toLocaleString()}
              {recoveries && recoveries.length > 0 && (
                <span className="text-[10px] text-muted-foreground ml-1 font-normal">({recoveries.length} entries)</span>
              )}
            </span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-muted-foreground">Expiry Date</span>
            <span className={`font-medium text-right ${isOverdue ? 'text-destructive font-bold' : ''}`}>
              {fmtDDMMYYYY(loan.expiry_date)}
            </span>
          </div>
          {loan.data_as_of_date && (
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">Data As-of Date</span>
              <span className="font-medium text-right">{fmtDDMMYYYY(loan.data_as_of_date)}</span>
            </div>
          )}
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-muted-foreground">Loan Category</span>
            <Badge variant={loan.loan_category === 'rescheduled' ? 'secondary' : 'outline'} className="text-[10px]">
              {loan.loan_category === 'rescheduled' ? 'Rescheduled' : 'New Loan'}
            </Badge>
          </div>
          {expiry && (
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className={isOverdue ? 'text-destructive font-semibold' : 'text-green-700 dark:text-green-400 font-medium'}>
                {isOverdue ? `মেয়াদ উত্তীর্ণ ${formatMonthsDays(dayDiff!)}` : `বাকি ${formatMonthsDays(dayDiff!)}`}
              </span>
            </div>
          )}
        </div>

        {(loan.latitude || loan.longitude) && (
          <>
            <Separator className="my-3" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Location</h4>
              <DetailRow label="Latitude" value={loan.latitude} />
              <DetailRow label="Longitude" value={loan.longitude} />
            </div>
          </>
        )}

        <Separator className="my-3" />

        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Guarantors</h4>
          <DetailRow label="Guarantor 1" value={loan.guarantor_1_name} />
          <PhoneRow label="G1 Mobile" phone={loan.guarantor_1_mobile} hasWhatsapp={loan.guarantor_1_has_whatsapp} hasImo={loan.guarantor_1_has_imo} whatsappField="guarantor_1_has_whatsapp" imoField="guarantor_1_has_imo" />
          <DetailRow label="Guarantor 2" value={loan.guarantor_2_name} />
          <PhoneRow label="G2 Mobile" phone={loan.guarantor_2_mobile} hasWhatsapp={loan.guarantor_2_has_whatsapp} hasImo={loan.guarantor_2_has_imo} whatsappField="guarantor_2_has_whatsapp" imoField="guarantor_2_has_imo" />
        </div>

        {hasLegalRecords && (
          <>
            <Separator className="my-3" />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Legal Records</h4>
              {linkedCases.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onOpenCase?.(c.id)}
                  className="w-full text-left rounded-md border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 p-2.5 transition-colors flex items-start gap-2"
                >
                  <Gavel className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold">{c.case_number}</span>
                      <Badge variant="outline" className="text-[10px] h-4">{c.case_type}</Badge>
                      <Badge variant={c.status === 'active' ? 'destructive' : 'secondary'} className="text-[10px] h-4 capitalize">{c.status}</Badge>
                    </div>
                    {c.next_date && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">Next: {c.next_date}</p>
                    )}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                </button>
              ))}
              {linkedNotices.map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onOpenNotice?.(n.id)}
                  className="w-full text-left rounded-md border border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10 p-2.5 transition-colors flex items-start gap-2"
                >
                  <FileWarning className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold">{n.notice_type}</span>
                      <Badge variant={n.receipt_status === 'received' ? 'default' : n.receipt_status === 'returned' ? 'destructive' : 'secondary'} className="text-[10px] h-4 capitalize">{n.receipt_status}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {n.sent_date ? `Sent: ${n.sent_date}` : 'Not sent'}
                      {n.case_filing_deadline ? ` · Deadline: ${n.case_filing_deadline}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </>
        )}

        <Separator className="my-3" />

        {/* Tabbed: Comments / Recoveries / Timeline */}
        <Tabs defaultValue="comments" className="mt-2">
          <TabsList className="grid grid-cols-3 h-8">
            <TabsTrigger value="comments" className="text-xs gap-1"><MessageSquare className="h-3 w-3" /> Comments</TabsTrigger>
            <TabsTrigger value="recoveries" className="text-xs gap-1"><Banknote className="h-3 w-3" /> Recovery</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs gap-1"><Clock className="h-3 w-3" /> Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="comments"><LoanComments loanId={loan.id} /></TabsContent>
          <TabsContent value="recoveries"><LoanRecoveries loanId={loan.id} asOfDate={loan.data_as_of_date} /></TabsContent>
          <TabsContent value="timeline"><LoanTimeline loanId={loan.id} createdAt={loan.created_at} /></TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default LoanDetailDrawer;
