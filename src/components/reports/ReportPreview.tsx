import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loan, LegalCase, LegalNotice } from '@/types';
import { ReportType } from './ReportConfig';

interface AgingBucket {
  label: string;
  min: number;
  max: number;
  count: number;
  overdueAmt: number;
  outstandingAmt: number;
}

export const AGING_BUCKETS_CONFIG = [
  { label: '0-30 days', min: 0, max: 30 },
  { label: '31-60 days', min: 31, max: 60 },
  { label: '61-90 days', min: 61, max: 90 },
  { label: '91-180 days', min: 91, max: 180 },
  { label: '181-365 days', min: 181, max: 365 },
  { label: '365+ days', min: 366, max: Infinity },
];

interface RecoveryRow {
  recovery_date: string;
  recovered_amount: number;
  recovery_type: string;
  note: string | null;
  loans: { account_no: string; borrower_name: string; branch_id: string };
}

interface Props {
  reportType: ReportType;
  generated: boolean;
  filteredLoans: Loan[];
  legalCases: LegalCase[];
  legalNotices: LegalNotice[];
  recoveries: RecoveryRow[];
  branchName: (id: string | null) => string;
}

const ReportPreview = ({ reportType, generated, filteredLoans, legalCases, legalNotices, recoveries, branchName }: Props) => {
  if (!generated) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">সেটিংস সিলেক্ট করে "Generate Report" বাটনে ক্লিক করুন</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          Preview
          <Badge variant="secondary" className="text-[10px]">
            {reportType === 'legal-cases' ? `${legalCases.length} cases` :
             reportType === 'legal-notices' ? `${legalNotices.length} notices` :
             reportType === 'recovery' ? `${recoveries.length} records` :
             `${filteredLoans.length} loans`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[500px] overflow-auto">
        {reportType === 'loan-summary' && <LoanSummaryPreview loans={filteredLoans} branchName={branchName} />}
        {reportType === 'classification' && <ClassificationPreview loans={filteredLoans} />}
        {reportType === 'aging' && <AgingPreview loans={filteredLoans} />}
        {reportType === 'legal-cases' && <LegalCasesPreview cases={legalCases} />}
        {reportType === 'legal-notices' && <LegalNoticesPreview notices={legalNotices} />}
        {reportType === 'recovery' && <RecoveryPreview recoveries={recoveries} branchName={branchName} />}
      </CardContent>
    </Card>
  );
};

const LoanSummaryPreview = ({ loans, branchName }: { loans: Loan[]; branchName: (id: string | null) => string }) => {
  const branchGroups = new Map<string, { count: number; outstanding: number; overdue: number; STD: number; SMA: number; SS: number; DF: number; BL: number }>();
  loans.forEach(l => {
    const bid = l.branch_id || 'unknown';
    if (!branchGroups.has(bid)) branchGroups.set(bid, { count: 0, outstanding: 0, overdue: 0, STD: 0, SMA: 0, SS: 0, DF: 0, BL: 0 });
    const g = branchGroups.get(bid)!;
    g.count++;
    g.outstanding += l.outstanding_amount || 0;
    g.overdue += l.overdue_amount || 0;
    const cls = (l.classification || 'STD') as keyof typeof g;
    if (cls in g && typeof g[cls] === 'number') (g as any)[cls]++;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Accounts" value={loans.length} />
        <StatCard label="Outstanding" value={`৳${loans.reduce((s, l) => s + (l.outstanding_amount || 0), 0).toLocaleString()}`} />
        <StatCard label="Overdue" value={`৳${loans.reduce((s, l) => s + (l.overdue_amount || 0), 0).toLocaleString()}`} className="text-destructive" />
        <StatCard label="Disbursed" value={`৳${loans.reduce((s, l) => s + (l.disbursed_loan_amount || 0), 0).toLocaleString()}`} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Branch</TableHead>
            <TableHead className="text-xs text-right">Accounts</TableHead>
            <TableHead className="text-xs text-right">Outstanding</TableHead>
            <TableHead className="text-xs text-right">Overdue</TableHead>
            <TableHead className="text-xs text-right">STD</TableHead>
            <TableHead className="text-xs text-right">SMA</TableHead>
            <TableHead className="text-xs text-right">SS</TableHead>
            <TableHead className="text-xs text-right">DF</TableHead>
            <TableHead className="text-xs text-right">BL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...branchGroups.entries()].map(([bid, g]) => (
            <TableRow key={bid}>
              <TableCell className="text-xs font-medium">{branchName(bid)}</TableCell>
              <TableCell className="text-xs text-right">{g.count}</TableCell>
              <TableCell className="text-xs text-right">৳{g.outstanding.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right text-destructive">৳{g.overdue.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right">{g.STD}</TableCell>
              <TableCell className="text-xs text-right">{g.SMA}</TableCell>
              <TableCell className="text-xs text-right">{g.SS}</TableCell>
              <TableCell className="text-xs text-right">{g.DF}</TableCell>
              <TableCell className="text-xs text-right">{g.BL}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const ClassificationPreview = ({ loans }: { loans: Loan[] }) => {
  const classes = ['STD', 'SMA', 'SS', 'DF', 'BL'];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {classes.map(cls => {
          const count = loans.filter(l => l.classification === cls).length;
          const amt = loans.filter(l => l.classification === cls).reduce((s, l) => s + (l.outstanding_amount || 0), 0);
          return (
            <Card key={cls} className="border">
              <CardContent className="p-3 text-center">
                <Badge variant={['DF', 'BL'].includes(cls) ? 'destructive' : 'secondary'} className="text-[10px] mb-1">{cls}</Badge>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-[9px] text-muted-foreground">৳{amt.toLocaleString()}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Classification</TableHead>
            <TableHead className="text-xs text-right">Accounts</TableHead>
            <TableHead className="text-xs text-right">Outstanding</TableHead>
            <TableHead className="text-xs text-right">Overdue</TableHead>
            <TableHead className="text-xs text-right">% Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.map(cls => {
            const filtered = loans.filter(l => l.classification === cls);
            const outstanding = filtered.reduce((s, l) => s + (l.outstanding_amount || 0), 0);
            const overdue = filtered.reduce((s, l) => s + (l.overdue_amount || 0), 0);
            const totalOut = loans.reduce((s, l) => s + (l.outstanding_amount || 0), 0);
            return (
              <TableRow key={cls}>
                <TableCell className="text-xs font-medium">{cls}</TableCell>
                <TableCell className="text-xs text-right">{filtered.length}</TableCell>
                <TableCell className="text-xs text-right">৳{outstanding.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right text-destructive">৳{overdue.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right">{totalOut > 0 ? ((outstanding / totalOut) * 100).toFixed(1) : '0'}%</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

const AgingPreview = ({ loans }: { loans: Loan[] }) => {
  const buckets: AgingBucket[] = AGING_BUCKETS_CONFIG.map(b => {
    const matching = loans.filter(l => {
      const days = (l.overdue_installment_number || 0) * 30;
      return days >= b.min && days <= b.max && l.overdue_amount > 0;
    });
    return {
      ...b,
      count: matching.length,
      overdueAmt: matching.reduce((s, l) => s + (l.overdue_amount || 0), 0),
      outstandingAmt: matching.reduce((s, l) => s + (l.outstanding_amount || 0), 0),
    };
  });
  const totalOverdue = buckets.reduce((s, b) => s + b.overdueAmt, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {buckets.map(b => (
          <Card key={b.label} className="border">
            <CardContent className="p-2 text-center">
              <p className="text-[9px] text-muted-foreground">{b.label}</p>
              <p className="text-sm font-bold">{b.count}</p>
              <p className="text-[9px] text-muted-foreground">৳{b.overdueAmt.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Aging Bucket</TableHead>
            <TableHead className="text-xs text-right">Accounts</TableHead>
            <TableHead className="text-xs text-right">Overdue</TableHead>
            <TableHead className="text-xs text-right">Outstanding</TableHead>
            <TableHead className="text-xs text-right">% Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buckets.map(b => (
            <TableRow key={b.label}>
              <TableCell className="text-xs font-medium">{b.label}</TableCell>
              <TableCell className="text-xs text-right">{b.count}</TableCell>
              <TableCell className="text-xs text-right text-destructive">৳{b.overdueAmt.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right">৳{b.outstandingAmt.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right">{totalOverdue > 0 ? ((b.overdueAmt / totalOverdue) * 100).toFixed(1) : '0'}%</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold border-t-2">
            <TableCell className="text-xs">Total</TableCell>
            <TableCell className="text-xs text-right">{buckets.reduce((s, b) => s + b.count, 0)}</TableCell>
            <TableCell className="text-xs text-right text-destructive">৳{totalOverdue.toLocaleString()}</TableCell>
            <TableCell className="text-xs text-right">৳{buckets.reduce((s, b) => s + b.outstandingAmt, 0).toLocaleString()}</TableCell>
            <TableCell className="text-xs text-right">100%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

const LegalCasesPreview = ({ cases }: { cases: LegalCase[] }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Total Cases" value={cases.length} />
      <StatCard label="Active" value={cases.filter(c => c.status === 'active').length} />
      <StatCard label="Total Claim" value={`৳${cases.reduce((s, c) => s + (c.claim_amount || 0), 0).toLocaleString()}`} />
      <StatCard label="Case Types" value={new Set(cases.map(c => c.case_type)).size} />
    </div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Case No</TableHead>
          <TableHead className="text-xs">Type</TableHead>
          <TableHead className="text-xs">Status</TableHead>
          <TableHead className="text-xs">Plaintiff</TableHead>
          <TableHead className="text-xs text-right">Claim</TableHead>
          <TableHead className="text-xs">Next Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cases.slice(0, 20).map(c => (
          <TableRow key={c.id}>
            <TableCell className="text-xs">{c.case_number}</TableCell>
            <TableCell className="text-xs">{c.case_type}</TableCell>
            <TableCell className="text-xs"><Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{c.status}</Badge></TableCell>
            <TableCell className="text-xs">{c.plaintiff_name}</TableCell>
            <TableCell className="text-xs text-right">৳{(c.claim_amount || 0).toLocaleString()}</TableCell>
            <TableCell className="text-xs">{c.next_date || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    {cases.length > 20 && <p className="text-xs text-muted-foreground text-center">...and {cases.length - 20} more cases</p>}
  </div>
);

const LegalNoticesPreview = ({ notices }: { notices: LegalNotice[] }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <StatCard label="Total Notices" value={notices.length} />
      <StatCard label="Types" value={new Set(notices.map(n => n.notice_type)).size} />
      <StatCard label="Statuses" value={new Set(notices.map(n => n.status)).size} />
    </div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Recipient</TableHead>
          <TableHead className="text-xs">Type</TableHead>
          <TableHead className="text-xs">Status</TableHead>
          <TableHead className="text-xs">Sent Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {notices.slice(0, 20).map(n => (
          <TableRow key={n.id}>
            <TableCell className="text-xs">{n.recipient_name}</TableCell>
            <TableCell className="text-xs">{n.notice_type}</TableCell>
            <TableCell className="text-xs"><Badge variant="secondary" className="text-[10px]">{n.status}</Badge></TableCell>
            <TableCell className="text-xs">{n.sent_date || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    {notices.length > 20 && <p className="text-xs text-muted-foreground text-center">...and {notices.length - 20} more notices</p>}
  </div>
);

const RecoveryPreview = ({ recoveries, branchName }: { recoveries: RecoveryRow[]; branchName: (id: string | null) => string }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <StatCard label="Total Records" value={recoveries.length} />
      <StatCard label="Total Recovered" value={`৳${recoveries.reduce((s, r) => s + (r.recovered_amount || 0), 0).toLocaleString()}`} />
      <StatCard label="Types" value={new Set(recoveries.map(r => r.recovery_type)).size} />
    </div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Date</TableHead>
          <TableHead className="text-xs">Account</TableHead>
          <TableHead className="text-xs">Borrower</TableHead>
          <TableHead className="text-xs">Type</TableHead>
          <TableHead className="text-xs text-right">Amount</TableHead>
          <TableHead className="text-xs">Note</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recoveries.slice(0, 20).map((r, i) => (
          <TableRow key={i}>
            <TableCell className="text-xs">{r.recovery_date}</TableCell>
            <TableCell className="text-xs">{r.loans?.account_no || '-'}</TableCell>
            <TableCell className="text-xs">{r.loans?.borrower_name || '-'}</TableCell>
            <TableCell className="text-xs">{r.recovery_type}</TableCell>
            <TableCell className="text-xs text-right">৳{(r.recovered_amount || 0).toLocaleString()}</TableCell>
            <TableCell className="text-xs truncate max-w-[120px]">{r.note || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    {recoveries.length > 20 && <p className="text-xs text-muted-foreground text-center">...and {recoveries.length - 20} more records</p>}
  </div>
);

const StatCard = ({ label, value, className }: { label: string; value: string | number; className?: string }) => (
  <Card className="border">
    <CardContent className="p-3 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${className || ''}`}>{value}</p>
    </CardContent>
  </Card>
);

export default ReportPreview;
