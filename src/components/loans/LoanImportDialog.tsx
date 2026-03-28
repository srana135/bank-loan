import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useBranches } from '@/hooks/useBranches';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const TEMPLATE_COLUMNS = [
  'Account No', 'Account Name', 'Borrower Name', 'Mobile', 'Account Type',
  'Account Status', 'Address', 'Latitude', 'Longitude', 'Installment Amount',
  'Overdue Installment Number', 'Overdue Amount', 'Outstanding Amount', 'Classification',
  'Guarantor 1 Name', 'Guarantor 1 Mobile', 'Guarantor 2 Name', 'Guarantor 2 Mobile', 'Branch Code',
];

const COL_MAP: Record<string, string> = {
  'Account No': 'account_no',
  'Account Name': 'account_name',
  'Borrower Name': 'borrower_name',
  'Mobile': 'mobile',
  'Account Type': 'account_type',
  'Account Status': 'account_status',
  'Address': 'address',
  'Latitude': 'latitude',
  'Longitude': 'longitude',
  'Installment Amount': 'installment_amount',
  'Overdue Installment Number': 'overdue_installment_number',
  'Overdue Amount': 'overdue_amount',
  'Outstanding Amount': 'outstanding_amount',
  'Classification': 'classification',
  'Guarantor 1 Name': 'guarantor_1_name',
  'Guarantor 1 Mobile': 'guarantor_1_mobile',
  'Guarantor 2 Name': 'guarantor_2_name',
  'Guarantor 2 Mobile': 'guarantor_2_mobile',
};

interface RowError {
  row: number;
  accountNo: string;
  error: string;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: RowError[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  defaultBranchId?: string | null;
}

const LoanImportDialog = ({ open, onClose, defaultBranchId }: Props) => {
  const { user } = useAuth();
  const { data: branches = [] } = useBranches();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const downloadTemplate = useCallback(() => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, ['ACC001', 'Sample Account', 'John Doe', '01700000000', 'Term Loan', 'active', '123 Main St', '23.8103', '90.4125', '5000', '0', '0', '50000', 'STD', 'Jane Doe', '01800000000', 'Bob Smith', '01900000000', '']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loans Template');
    // Set column widths
    ws['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 18 }));
    XLSX.writeFile(wb, 'loan_import_template.xlsx');
  }, []);

  const handleImport = async () => {
    if (!file) { toast.error('Select a file'); return; }
    setImporting(true);
    setProgress(0);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
          toast.error('No data rows found');
          setImporting(false);
          return;
        }

        // Validate columns
        const headers = Object.keys(rows[0]);
        const missing = TEMPLATE_COLUMNS.filter(c => c !== 'Branch ID' && !headers.includes(c));
        if (missing.length > 0) {
          toast.error(`Missing columns: ${missing.join(', ')}`);
          setImporting(false);
          return;
        }

        const errors: RowError[] = [];
        let success = 0;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 2; // Excel row number (header is row 1)

          try {
            const accountNo = String(row['Account No'] || '').trim();
            if (!accountNo) {
              errors.push({ row: rowNum, accountNo: '', error: 'Account No is required' });
              continue;
            }

            const borrowerName = String(row['Borrower Name'] || '').trim();
            if (!borrowerName) {
              errors.push({ row: rowNum, accountNo, error: 'Borrower Name is required' });
              continue;
            }

            const classification = String(row['Classification'] || '').trim();
            if (!['STD', 'SMA', 'SS', 'DF', 'BL'].includes(classification)) {
              errors.push({ row: rowNum, accountNo, error: `Invalid classification "${classification}". Must be STD/SMA/SS/DF/BL` });
              continue;
            }

            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const payload: Record<string, any> = {};
            for (const [excelCol, dbCol] of Object.entries(COL_MAP)) {
              let val = row[excelCol];
              if (val === undefined || val === null || val === '') {
                if (dbCol === 'branch_id') {
                  val = defaultBranchId || null;
                } else {
                  val = ['latitude', 'longitude', 'installment_amount', 'overdue_installment_number', 'overdue_amount', 'outstanding_amount'].includes(dbCol) ? 0 : '';
                }
              }
              if (dbCol === 'branch_id' && val && !uuidRegex.test(String(val))) {
                val = defaultBranchId || null;
              }
              if (['latitude', 'longitude', 'installment_amount', 'overdue_amount', 'outstanding_amount'].includes(dbCol)) {
                val = Number(val) || 0;
              }
              if (dbCol === 'overdue_installment_number') {
                val = parseInt(String(val), 10) || 0;
              }
              payload[dbCol] = val;
            }

            payload.created_by = user?.id;

            const { error } = await supabase.from('loans').upsert(payload, { onConflict: 'account_no' });
            if (error) {
              errors.push({ row: rowNum, accountNo, error: error.message });
            } else {
              success++;
            }
          } catch (err: any) {
            errors.push({ row: rowNum, accountNo: String(row['Account No'] || ''), error: err.message });
          }

          setProgress(Math.round(((i + 1) / rows.length) * 100));
        }

        const importResult: ImportResult = { total: rows.length, success, failed: errors.length, errors };
        setResult(importResult);

        // Log to import_logs
        await supabase.from('import_logs').insert({
          import_type: 'loans',
          file_name: file.name,
          total_rows: rows.length,
          success_rows: success,
          failed_rows: errors.length,
          error_summary: errors.length > 0 ? errors : null,
          imported_by: user?.id,
        });

        qc.invalidateQueries({ queryKey: ['loans'] });
        if (success > 0) toast.success(`${success} loan(s) imported/updated`);
        if (errors.length > 0) toast.error(`${errors.length} row(s) failed`);
      } catch (err: any) {
        toast.error('Import failed: ' + err.message);
      }
      setImporting(false);
    };
    reader.readAsBinaryString(file);
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Import Loans from Excel
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium">Download Template</p>
                <p className="text-xs text-muted-foreground">Get the Excel template with required columns</p>
              </div>
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" /> Template
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Upload Excel File (.xlsx, .xls)</Label>
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>

            {importing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">Processing... {progress}%</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleImport} disabled={!file || importing} className="gap-2">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? 'Importing...' : 'Start Import'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                  <CheckCircle className="h-5 w-5" /> {result.success}
                </p>
                <p className="text-xs text-muted-foreground">Success</p>
              </div>
              <div className="text-center p-3 bg-destructive/10 rounded-lg">
                <p className="text-2xl font-bold text-destructive flex items-center justify-center gap-1">
                  <AlertCircle className="h-5 w-5" /> {result.failed}
                </p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>

            {/* Error details */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-destructive">Error Details</h4>
                <div className="border rounded-lg overflow-auto max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>Account No</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell>{e.row}</TableCell>
                          <TableCell className="font-mono text-xs">{e.accountNo || '-'}</TableCell>
                          <TableCell className="text-xs text-destructive">{e.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoanImportDialog;
