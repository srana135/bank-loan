import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Loader2, Play } from 'lucide-react';
import { Branch } from '@/types';

export type ReportType = 'loan-summary' | 'recovery' | 'legal-cases' | 'aging' | 'classification' | 'legal-notices';

export const REPORT_TYPES: { value: ReportType; label: string; desc: string }[] = [
  { value: 'loan-summary', label: 'Loan Summary', desc: 'Branch-wise loan portfolio summary' },
  { value: 'recovery', label: 'Recovery Report', desc: 'Recovery collections by date range' },
  { value: 'legal-cases', label: 'Legal Cases', desc: 'Active legal cases summary' },
  { value: 'legal-notices', label: 'Legal Notices', desc: 'Legal notices sent summary' },
  { value: 'aging', label: 'Aging Analysis', desc: 'Overdue loan aging buckets' },
  { value: 'classification', label: 'Classification', desc: 'Loan classification breakdown' },
];

interface Props {
  reportType: ReportType;
  setReportType: (v: ReportType) => void;
  branchId: string;
  setBranchId: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  branches: Branch[] | undefined;
  generating: boolean;
  generated: boolean;
  onGenerate: () => void;
  onDownloadPDF: () => void;
  onDownloadExcel: () => void;
}

const ReportConfig = ({
  reportType, setReportType, branchId, setBranchId,
  dateFrom, setDateFrom, dateTo, setDateTo,
  branches, generating, generated, onGenerate, onDownloadPDF, onDownloadExcel,
}: Props) => {
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-sm">Report Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Report Type</Label>
          <Select value={reportType} onValueChange={v => setReportType(v as ReportType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">{REPORT_TYPES.find(r => r.value === reportType)?.desc}</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Branch</Label>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches?.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <Button onClick={onGenerate} disabled={generating} className="gap-2 bg-primary">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Generate Report
          </Button>

          {generated && (
            <>
              <Button variant="outline" onClick={onDownloadPDF} disabled={generating} className="gap-2">
                <FileText className="h-4 w-4" /> Download PDF
              </Button>
              <Button variant="outline" onClick={onDownloadExcel} disabled={generating} className="gap-2">
                <Download className="h-4 w-4" /> Download Excel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportConfig;
