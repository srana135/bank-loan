import { Loan, Branch } from '@/types';
import { UserRole } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Pencil, Trash2, Phone, MessageSquare, Banknote, Clock, MapPin, ExternalLink } from 'lucide-react';
import AccountStatusChange from './AccountStatusChange';
import LoanComments from './LoanComments';
import LoanRecoveries from './LoanRecoveries';
import LoanTimeline from './LoanTimeline';
import ClassificationSuggestion from './ClassificationSuggestion';
import { useLoanRecoveries } from '@/hooks/useRecoveries';

interface Props {
  loan: Loan | null;
  open: boolean;
  onClose: () => void;
  onEdit: (loan: Loan) => void;
  onDelete: (id: string) => void;
  userRole: UserRole | null;
  branches: Branch[];
}

const classColors: Record<string, string> = {
  STD: 'default' as any,
  SMA: 'secondary' as any,
  SS: 'secondary' as any,
  DF: 'destructive' as any,
  BL: 'destructive' as any,
};

const LoanDetailDrawer = ({ loan, open, onClose, onEdit, onDelete, userRole, branches }: Props) => {
  if (!loan) return null;
  const canEdit = userRole === 'admin' || userRole === 'manager';
  const canDelete = userRole === 'admin' || userRole === 'manager';

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
        <a href={`tel:${value}`} className="text-primary hover:underline flex items-center gap-1">
          <Phone className="h-3 w-3" />{value}
        </a>
      ) : (
        <span className="font-medium text-right max-w-[60%] break-words">{value ?? '-'}</span>
      )}
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
          <DetailRow label="Mobile" value={loan.mobile} isPhone />
          <DetailRow label="Account Type" value={loan.account_type} />
          <DetailRow label="Account Status" value={loan.account_status} />
          <AddressRow />
          <DetailRow label="Branch" value={branchName} />
        </div>

        <Separator className="my-3" />

        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Financial</h4>
          <DetailRow label="Installment" value={`৳${(loan.installment_amount || 0).toLocaleString()}`} />
          <DetailRow label="Overdue Installments" value={loan.overdue_installment_number} />
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
          <DetailRow label="G1 Mobile" value={loan.guarantor_1_mobile} isPhone />
          <DetailRow label="Guarantor 2" value={loan.guarantor_2_name} />
          <DetailRow label="G2 Mobile" value={loan.guarantor_2_mobile} isPhone />
        </div>

        <Separator className="my-3" />

        {/* Tabbed: Comments / Recoveries / Timeline */}
        <Tabs defaultValue="comments" className="mt-2">
          <TabsList className="grid grid-cols-3 h-8">
            <TabsTrigger value="comments" className="text-xs gap-1"><MessageSquare className="h-3 w-3" /> Comments</TabsTrigger>
            <TabsTrigger value="recoveries" className="text-xs gap-1"><Banknote className="h-3 w-3" /> Recovery</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs gap-1"><Clock className="h-3 w-3" /> Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="comments"><LoanComments loanId={loan.id} /></TabsContent>
          <TabsContent value="recoveries"><LoanRecoveries loanId={loan.id} /></TabsContent>
          <TabsContent value="timeline"><LoanTimeline loanId={loan.id} createdAt={loan.created_at} /></TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default LoanDetailDrawer;
