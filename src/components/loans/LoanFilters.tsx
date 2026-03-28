import { Loan } from '@/types';
import { type LoanFilters as LoanFiltersType, defaultFilters } from '@/hooks/useLoans';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { useMemo } from 'react';

interface Props {
  filters: LoanFiltersType;
  onChange: (f: LoanFiltersType) => void;
  loans: Loan[];
}

const CLASSIFICATIONS = ['STD', 'SMA', 'SS', 'DF', 'BL'];

const LoanFilters = ({ filters, onChange, loans }: Props) => {
  // Build dynamic accountType options from data
  const accountTypes = useMemo(() => {
    const types = new Set(loans.map(l => l.account_type).filter(Boolean));
    return Array.from(types).sort();
  }, [loans]);

  const update = (partial: Partial<LoanFiltersType>) => onChange({ ...filters, ...partial });

  const toggleClassification = (cls: string) => {
    const current = filters.classifications;
    const next = current.includes(cls) ? current.filter(c => c !== cls) : [...current, cls];
    update({ classifications: next });
  };

  const hasActiveFilters = filters.accountName || filters.borrowerName || filters.accountType ||
    filters.accountStatus || filters.address || filters.classifications.length > 0;

  return (
    <div className="border rounded-lg p-4 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-foreground">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={() => onChange(defaultFilters)} className="gap-1 text-xs">
            <X className="h-3 w-3" /> Clear All
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Account Name</Label>
          <Input placeholder="Type to filter..." value={filters.accountName} onChange={e => update({ accountName: e.target.value })} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Borrower Name</Label>
          <Input placeholder="Type to filter..." value={filters.borrowerName} onChange={e => update({ borrowerName: e.target.value })} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Account Type</Label>
          <Select value={filters.accountType || '__all__'} onValueChange={v => update({ accountType: v === '__all__' ? '' : v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Types</SelectItem>
              {accountTypes.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Account Status</Label>
          <Select value={filters.accountStatus || '__all__'} onValueChange={v => update({ accountStatus: v === '__all__' ? '' : v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Address</Label>
          <Input placeholder="Type to filter..." value={filters.address} onChange={e => update({ address: e.target.value })} className="h-9 text-sm" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Classification</Label>
        <div className="flex flex-wrap gap-3">
          {CLASSIFICATIONS.map(cls => (
            <label key={cls} className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={filters.classifications.includes(cls)}
                onCheckedChange={() => toggleClassification(cls)}
              />
              <span className="text-sm">{cls}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoanFilters;
