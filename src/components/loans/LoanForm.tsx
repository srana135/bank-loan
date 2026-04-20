import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loan, Branch } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const loanSchema = z.object({
  account_no: z.string().min(1, 'Account No is required'),
  account_name: z.string().optional().default(''),
  borrower_name: z.string().min(1, 'Borrower name is required'),
  mobile: z.string().regex(/^[0-9+\-\s]*$/, 'Invalid mobile format').optional().default(''),
  account_type: z.string().optional().default(''),
  account_status: z.string().optional().default('New Loan'),
  address: z.string().optional().default(''),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  disbursed_loan_amount: z.coerce.number().min(0, 'Must be >= 0').optional(),
  disbursement_date: z.string().optional().default(''),
  expiry_date: z.string().optional().default(''),
  installment_amount: z.coerce.number().min(0, 'Must be >= 0').default(0),
  overdue_installment_number: z.coerce.number().int().min(0, 'Must be >= 0').default(0),
  overdue_amount: z.coerce.number().min(0, 'Must be >= 0').default(0),
  outstanding_amount: z.coerce.number().min(0, 'Must be >= 0').default(0),
  classification: z.string().min(1, 'Classification is required'),
  guarantor_1_name: z.string().optional().default(''),
  guarantor_1_mobile: z.string().regex(/^[0-9+\-\s]*$/, 'Invalid mobile').optional().default(''),
  guarantor_2_name: z.string().optional().default(''),
  guarantor_2_mobile: z.string().regex(/^[0-9+\-\s]*$/, 'Invalid mobile').optional().default(''),
  branch_id: z.string().min(1, 'Branch is required'),
});

export type LoanFormData = z.infer<typeof loanSchema>;

interface Props {
  loan?: Loan | null;
  branches: Branch[];
  defaultBranchId?: string | null;
  isAdmin: boolean;
  saving: boolean;
  onSubmit: (data: LoanFormData) => void;
  onCancel: () => void;
}

const CLASSIFICATIONS = ['STD', 'SMA', 'SS', 'DF', 'BL'];

const LoanForm = ({ loan, branches, defaultBranchId, isAdmin, saving, onSubmit, onCancel }: Props) => {
  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      account_no: loan?.account_no || '',
      account_name: loan?.account_name || '',
      borrower_name: loan?.borrower_name || '',
      mobile: loan?.mobile || '',
      account_type: loan?.account_type || '',
      account_status: loan?.account_status || 'New Loan',
      address: loan?.address || '',
      latitude: loan?.latitude ?? undefined,
      longitude: loan?.longitude ?? undefined,
      disbursed_loan_amount: loan?.disbursed_loan_amount ?? undefined,
      disbursement_date: loan?.disbursement_date || '',
      expiry_date: loan?.expiry_date || '',
      installment_amount: loan?.installment_amount || 0,
      overdue_installment_number: loan?.overdue_installment_number || 0,
      overdue_amount: loan?.overdue_amount || 0,
      outstanding_amount: loan?.outstanding_amount || 0,
      classification: loan?.classification || 'STD',
      guarantor_1_name: loan?.guarantor_1_name || '',
      guarantor_1_mobile: loan?.guarantor_1_mobile || '',
      guarantor_2_name: loan?.guarantor_2_name || '',
      guarantor_2_mobile: loan?.guarantor_2_mobile || '',
      branch_id: loan?.branch_id || defaultBranchId || '',
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;
  const branchValue = watch('branch_id');
  const classValue = watch('classification');

  const Field = ({ name, label, type = 'text', required = false }: { name: keyof LoanFormData; label: string; type?: string; required?: boolean }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}{required && ' *'}</Label>
      <Input type={type} step={type === 'number' ? 'any' : undefined} {...register(name)} className="h-9 text-sm" />
      {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message as string}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        <Field name="account_no" label="Account No" required />
        <Field name="account_name" label="Account Name" />
        <Field name="borrower_name" label="Borrower Name" required />
        <Field name="mobile" label="Mobile" />
        <Field name="account_type" label="Account Type" />
        <div className="space-y-1.5">
          <Label className="text-xs">Account Status</Label>
          <Input value={watch('account_status') || 'Auto'} readOnly className="h-9 text-sm bg-muted" />
          <p className="text-[10px] text-muted-foreground leading-tight">
            Loan amount অনুযায়ী auto-set হবে (পূর্ণসংখ্যা → New Loan, দশমিক → RS-1)। পরে admin/manager "Change Status" দিয়ে override করতে পারবেন।
          </p>
        </div>
        <div className="sm:col-span-2"><Field name="address" label="Address" /></div>
        <Field name="latitude" label="Latitude" type="number" />
        <Field name="longitude" label="Longitude" type="number" />
        <Field name="disbursed_loan_amount" label="Disbursed Amount" type="number" />
        <Field name="disbursement_date" label="Disbursement Date" type="date" />
        <Field name="expiry_date" label="Expiry Date" type="date" />
        <Field name="installment_amount" label="Installment Amount" type="number" required />
        <Field name="overdue_installment_number" label="Overdue Installment No." type="number" />
        <Field name="overdue_amount" label="Overdue Amount" type="number" />
        <Field name="outstanding_amount" label="Outstanding Amount" type="number" />
        <div className="space-y-1.5">
          <Label className="text-xs">Classification *</Label>
          <Select value={classValue} onValueChange={v => setValue('classification', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.classification && <p className="text-xs text-destructive">{errors.classification.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Branch *</Label>
          <Select value={branchValue} onValueChange={v => setValue('branch_id', v)} disabled={!isAdmin}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select branch" /></SelectTrigger>
            <SelectContent>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.branch_id && <p className="text-xs text-destructive">{errors.branch_id.message}</p>}
        </div>
        <Field name="guarantor_1_name" label="Guarantor 1 Name" />
        <Field name="guarantor_1_mobile" label="Guarantor 1 Mobile" />
        <Field name="guarantor_2_name" label="Guarantor 2 Name" />
        <Field name="guarantor_2_mobile" label="Guarantor 2 Mobile" />
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : loan ? 'Update Loan' : 'Create Loan'}
        </Button>
      </div>
    </form>
  );
};

export default LoanForm;
