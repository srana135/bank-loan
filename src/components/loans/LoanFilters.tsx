import { Loan } from '@/types';
import { Branch } from '@/types';
import { type LoanFilters as LoanFiltersType, defaultFilters } from '@/hooks/useLoans';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AutocompleteInput from '@/components/ui/autocomplete-input';
import { X, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';

interface Props {
  filters: LoanFiltersType;
  onChange: (f: LoanFiltersType) => void;
  loans: Loan[];
  branches?: Branch[];
  showBranchFilter?: boolean;
  branchFilter?: string;
  onBranchFilterChange?: (v: string) => void;
}

const CLASSIFICATIONS = ['STD', 'SMA', 'SS', 'DF', 'BL'];

const LoanFilters = ({ filters, onChange, loans, branches, showBranchFilter, branchFilter, onBranchFilterChange }: Props) => {
  const accountTypes = useMemo(() => {
    const types = new Set(loans.map(l => l.account_type).filter(Boolean));
    return Array.from(types).sort();
  }, [loans]);

  const accountNameSuggestions = useMemo(() => {
    const names = new Set(loans.map(l => l.account_name).filter(Boolean) as string[]);
    return Array.from(names).sort();
  }, [loans]);

  const borrowerNameSuggestions = useMemo(() => {
    const names = new Set(loans.map(l => l.borrower_name).filter(Boolean) as string[]);
    return Array.from(names).sort();
  }, [loans]);

  const addressSuggestions = useMemo(() => {
    const addrs = new Set(loans.map(l => l.address).filter(Boolean) as string[]);
    return Array.from(addrs).sort();
  }, [loans]);

  const update = (partial: Partial<LoanFiltersType>) => onChange({ ...filters, ...partial });

  const toggleClassification = (cls: string) => {
    const current = filters.classifications;
    const next = current.includes(cls) ? current.filter(c => c !== cls) : [...current, cls];
    update({ classifications: next });
  };

  const hasActiveFilters = filters.accountName || filters.borrowerName || filters.accountType ||
    filters.accountStatus || filters.address || filters.classifications.length > 0 ||
    filters.proposedDateFilter ||
    (branchFilter && branchFilter !== '__all__');

  const activeFilterTags: { label: string; clear: () => void }[] = [];
  if (filters.accountName) activeFilterTags.push({ label: `Name: ${filters.accountName}`, clear: () => update({ accountName: '' }) });
  if (filters.borrowerName) activeFilterTags.push({ label: `Borrower: ${filters.borrowerName}`, clear: () => update({ borrowerName: '' }) });
  if (filters.accountType) activeFilterTags.push({ label: `Type: ${filters.accountType}`, clear: () => update({ accountType: '' }) });
  if (filters.accountStatus) activeFilterTags.push({ label: `Status: ${filters.accountStatus}`, clear: () => update({ accountStatus: '' }) });
  if (filters.address) activeFilterTags.push({ label: `Address: ${filters.address}`, clear: () => update({ address: '' }) });
  if (filters.classifications.length > 0) activeFilterTags.push({ label: `Class: ${filters.classifications.join(', ')}`, clear: () => update({ classifications: [] }) });
  if (filters.proposedDateFilter) activeFilterTags.push({ label: `Proposed: ${filters.proposedDateFilter}`, clear: () => update({ proposedDateFilter: '' }) });

  const clearAll = () => {
    onChange(defaultFilters);
    onBranchFilterChange?.('__all__');
  };

  return (
    <div className="border rounded-lg p-4 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-foreground text-sm">Filters</h3>
        {hasActiveFilters && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-xs h-7">
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-xs h-7">
              <X className="h-3 w-3" /> Clear All
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Account Name</Label>
          <AutocompleteInput
            value={filters.accountName}
            onChange={v => update({ accountName: v })}
            suggestions={accountNameSuggestions}
            placeholder="Type to filter..."
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Borrower Name</Label>
          <AutocompleteInput
            value={filters.borrowerName}
            onChange={v => update({ borrowerName: v })}
            suggestions={borrowerNameSuggestions}
            placeholder="Type to filter..."
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Account Type</Label>
          <Select value={filters.accountType || '__all__'} onValueChange={v => update({ accountType: v === '__all__' ? '' : v })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Types</SelectItem>
              {accountTypes.map(t => <SelectItem key={t} value={t!}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Account Status</Label>
          <Select value={filters.accountStatus || '__all__'} onValueChange={v => update({ accountStatus: v === '__all__' ? '' : v })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Address</Label>
          <AutocompleteInput
            value={filters.address}
            onChange={v => update({ address: v })}
            suggestions={addressSuggestions}
            placeholder="Type to filter..."
            className="h-8 text-sm"
          />
        </div>
        {showBranchFilter && branches && onBranchFilterChange && (
          <div className="space-y-1.5">
            <Label className="text-xs">Branch</Label>
            <Select value={branchFilter || '__all__'} onValueChange={onBranchFilterChange}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All Branches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Branches</SelectItem>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Classification</Label>
        <div className="flex flex-wrap gap-3">
          {CLASSIFICATIONS.map(cls => (
            <label key={cls} className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox checked={filters.classifications.includes(cls)} onCheckedChange={() => toggleClassification(cls)} />
              <span className="text-sm">{cls}</span>
            </label>
          ))}
        </div>
      </div>

      {activeFilterTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilterTags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="gap-1 text-xs cursor-pointer hover:bg-destructive/20" onClick={tag.clear}>
              {tag.label} <X className="h-2.5 w-2.5" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoanFilters;
