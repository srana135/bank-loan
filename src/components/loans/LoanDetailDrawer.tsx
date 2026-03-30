import { Loan, Branch } from '@/types';
import { UserRole } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Pencil, Trash2, Phone } from 'lucide-react';
import AccountStatusChange from './AccountStatusChange';
import LoanComments from './LoanComments';
import LoanRecoveries from './LoanRecoveries';

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

  const branchName = branches.find(b => b.id === loan.branch_id)?.branch_name || '-';

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-lg">{loan.borrower_name}</SheetTitle>
              <SheetDescription className="font-mono">{loan.account_no}</SheetDescription>
            </div>
            <Badge variant={classColors[loan.classification || ''] as any || 'secondary'}>{loan.classification}</Badge>
          </div>
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
          <DetailRow label="Address" value={loan.address} />
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

        {/* Disbursement */}
        {(loan.disbursement_date || loan.disbursed_loan_amount) && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Disbursement</h4>
            <DetailRow label="Disbursement Date" value={loan.disbursement_date} />
            <DetailRow label="Disbursed Amount" value={loan.disbursed_loan_amount ? `৳${loan.disbursed_loan_amount.toLocaleString()}` : null} />
          </div>
        )}

        {(loan.disbursement_date || loan.disbursed_loan_amount) && <Separator className="my-3" />}

        {/* Recoveries */}
        <LoanRecoveries loanId={loan.id} />

        <Separator className="my-3" />

        {/* Comments */}
        <LoanComments loanId={loan.id} />
      </SheetContent>
    </Sheet>
  );
};

export default LoanDetailDrawer;
