import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useBranches } from '@/hooks/useBranches';
import { useAppSettings } from '@/hooks/useAppSettings';
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
import { ALL_LOAN_COLUMNS as ALL_IMPORT_COLUMNS, CANONICAL_LOAN_COLUMN_ORDER, NUMERIC_LOAN_COLS as NUMERIC_COLS, INT_LOAN_COLS as INT_COLS } from '@/lib/loanColumns';

// Recovery-specific columns are written to loan_recoveries instead of loans
const RECOVERY_COLS = ['recovered_amount', 'recovery_date'];

interface RowError { row: number; accountNo: string; error: string; }
interface ImportResult { total: number; success: number; failed: number; errors: RowError[]; }
interface Props { open: boolean; onClose: () => void; defaultBranchId?: string | null; }

const LoanImportDialog = ({ open, onClose, defaultBranchId }: Props) => {
  const { user } = useAuth();
  const { data: branches = [] } = useBranches();
  const { data: settings } = useAppSettings();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Canonical column order — template ALWAYS uses this order regardless of selection
  // Get configured columns from settings (or all if none configured); then re-sort to canonical order
  const selectedSet = new Set<string>(settings?.import_loan_columns?.length ? settings.import_loan_columns : CANONICAL_LOAN_COLUMN_ORDER);
  const configuredColumns = CANONICAL_LOAN_COLUMN_ORDER.filter(k => selectedSet.has(k));
  const templateColumns = configuredColumns.map(k => ALL_IMPORT_COLUMNS[k] || k).filter(Boolean);

  const downloadTemplate = useCallback(() => {
    const sampleRow = configuredColumns.map(k => {
      if (k === 'account_no') return 'ACC001';
      if (k === 'account_name') return 'Sample Account';
      if (k === 'borrower_name') return 'John Doe';
      if (k === 'mobile') return '01700000000';
      if (k === 'account_type') return 'Term Loan';
      if (k === 'account_status') return 'active';
      if (k === 'address') return '123 Main St';
      if (k === 'classification') return 'STD';
      if (k === 'recovery_date') return new Date().toISOString().slice(0, 10);
      if (NUMERIC_COLS.includes(k)) return '0';
      if (INT_COLS.includes(k)) return '0';
      return '';
    });
    const ws = XLSX.utils.aoa_to_sheet([templateColumns, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loans Template');
    ws['!cols'] = templateColumns.map(() => ({ wch: 18 }));
    XLSX.writeFile(wb, 'loan_import_template.xlsx');
  }, [configuredColumns, templateColumns]);

  // Build reverse map: display label → db column (excludes recovery cols + branch_code)
  const colMap = new Map<string, string>();
  configuredColumns.forEach(k => {
    const label = ALL_IMPORT_COLUMNS[k];
    if (label && k !== 'branch_code' && !RECOVERY_COLS.includes(k)) colMap.set(label, k);
  });

  const handleImport = async () => {
    if (!file) { toast.error('Select a file'); return; }
    setImporting(true); setProgress(0); setResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        if (rows.length === 0) { toast.error('No data rows found'); setImporting(false); return; }

        const headers = Object.keys(rows[0]);
        const requiredLabels = ['Account No', 'Borrower Name', 'Classification'].filter(l => templateColumns.includes(l));
        const missing = requiredLabels.filter(c => !headers.includes(c));
        if (missing.length > 0) { toast.error(`Missing columns: ${missing.join(', ')}`); setImporting(false); return; }

        const branchMap = new Map<string, string>();
        branches.forEach(b => {
          branchMap.set(b.branch_code.toLowerCase(), b.id);
          branchMap.set(b.branch_name.toLowerCase(), b.id);
        });

        const errors: RowError[] = [];
        let success = 0;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 2;
          try {
            const accountNo = String(row['Account No'] || '').trim();
            if (!accountNo) { errors.push({ row: rowNum, accountNo: '', error: 'Account No is required' }); continue; }
            const borrowerName = String(row['Borrower Name'] || '').trim();
            if (!borrowerName) { errors.push({ row: rowNum, accountNo, error: 'Borrower Name is required' }); continue; }
            const classification = String(row['Classification'] || '').trim();
            if (templateColumns.includes('Classification') && !['STD', 'SMA', 'SS', 'DF', 'BL'].includes(classification)) {
              errors.push({ row: rowNum, accountNo, error: `Invalid classification "${classification}". Must be STD/SMA/SS/DF/BL` }); continue;
            }

            const branchCodeVal = String(row['Branch Code'] || '').trim();
            let resolvedBranchId = defaultBranchId || null;
            if (branchCodeVal) {
              const found = branchMap.get(branchCodeVal.toLowerCase());
              if (found) resolvedBranchId = found;
              else { errors.push({ row: rowNum, accountNo, error: `Branch "${branchCodeVal}" not found.` }); continue; }
            }

            // Helper: parse number from Excel cell — handles commas, spaces, Bengali digits, currency symbols
            const parseNum = (v: any): number => {
              if (v === undefined || v === null || v === '') return 0;
              if (typeof v === 'number') return isFinite(v) ? v : 0;
              let s = String(v).trim();
              // Convert Bengali/Arabic digits → English
              s = s.replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
                   .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
              // Strip currency symbols, commas, spaces
              s = s.replace(/[৳$€£₹,\s]/g, '');
              const n = parseFloat(s);
              return isFinite(n) ? n : 0;
            };

            const payload: Record<string, any> = {};
            for (const [label, dbCol] of colMap.entries()) {
              let val = row[label];
              if (NUMERIC_COLS.includes(dbCol)) {
                val = parseNum(val);
              } else if (INT_COLS.includes(dbCol)) {
                val = Math.round(parseNum(val));
              } else if (val === undefined || val === null) {
                val = '';
              }
              payload[dbCol] = val;
            }
            payload.branch_id = resolvedBranchId;
            payload.created_by = user?.id;

            const { error } = await supabase.from('loans').upsert(payload, { onConflict: 'account_no' });
            if (error) { errors.push({ row: rowNum, accountNo, error: error.message }); continue; }
            success++;

            // Recovery insert (if Recovery Amount + Recovery Date supplied in this row)
            const recAmtRaw = row['Recovery Amount'];
            const recDateRaw = row['Recovery Date'];
            const recAmt = Number(recAmtRaw) || 0;
            let recDate = '';
            if (recDateRaw) {
              if (typeof recDateRaw === 'number') {
                // Excel date serial → ISO
                const d = XLSX.SSF.parse_date_code(recDateRaw);
                if (d) recDate = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
              } else {
                recDate = String(recDateRaw).trim().slice(0, 10);
              }
            }
            if (recAmt > 0 && recDate) {
              // Resolve loan id by account_no
              const { data: loanRow } = await supabase.from('loans').select('id, outstanding_amount, installment_amount, overdue_installment_number').eq('account_no', accountNo).maybeSingle();
              if (loanRow) {
                // Upsert by (loan_id, recovery_date) — same date = update amount only
                const { data: existing } = await supabase.from('loan_recoveries').select('id, recovered_amount').eq('loan_id', loanRow.id).eq('recovery_date', recDate).maybeSingle();
                let amountDelta = recAmt;
                if (existing) {
                  amountDelta = recAmt - (existing.recovered_amount || 0);
                  await supabase.from('loan_recoveries').update({ recovered_amount: recAmt, recovery_type: 'imported' }).eq('id', existing.id);
                } else {
                  await supabase.from('loan_recoveries').insert({
                    loan_id: loanRow.id, recovery_date: recDate, recovered_amount: recAmt,
                    recovery_type: 'imported', note: 'From import', created_by: user?.id,
                  });
                }
                // Adjust outstanding & overdue installments
                const newOutstanding = Math.max(0, (loanRow.outstanding_amount || 0) - amountDelta);
                const installment = loanRow.installment_amount || 1;
                const installmentsDelta = Math.floor(Math.abs(amountDelta) / installment) * Math.sign(amountDelta);
                const newOverdue = Math.max(0, (loanRow.overdue_installment_number || 0) - installmentsDelta);
                await supabase.from('loans').update({ outstanding_amount: newOutstanding, overdue_installment_number: newOverdue }).eq('id', loanRow.id);
              }
            }
          } catch (err: any) {
            errors.push({ row: rowNum, accountNo: String(row['Account No'] || ''), error: err.message });
          }
          setProgress(Math.round(((i + 1) / rows.length) * 100));
        }

        const importResult: ImportResult = { total: rows.length, success, failed: errors.length, errors };
        setResult(importResult);
        await supabase.from('import_logs').insert({
          import_type: 'loans', file_name: file.name, total_rows: rows.length,
          success_rows: success, failed_rows: errors.length,
          error_summary: errors.length > 0 ? errors : null, imported_by: user?.id,
        });
        qc.invalidateQueries({ queryKey: ['loans'] });
        qc.invalidateQueries({ queryKey: ['loan-recoveries'] });
        qc.invalidateQueries({ queryKey: ['all-recoveries'] });
        if (success > 0) toast.success(`${success} loan(s) imported/updated`);
        if (errors.length > 0) toast.error(`${errors.length} row(s) failed`);
      } catch (err: any) {
        toast.error('Import failed: ' + err.message);
      }
      setImporting(false);
    };
    reader.readAsBinaryString(file);
  };

  const handleClose = () => { setFile(null); setResult(null); setProgress(0); onClose(); };

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
                <p className="text-xs text-muted-foreground">Template with {templateColumns.length} configured columns</p>
              </div>
              <Button variant="outline" onClick={downloadTemplate} className="gap-2"><Download className="h-4 w-4" /> Template</Button>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-2xl font-bold text-primary flex items-center justify-center gap-1"><CheckCircle className="h-5 w-5" /> {result.success}</p>
                <p className="text-xs text-muted-foreground">Success</p>
              </div>
              <div className="text-center p-3 bg-destructive/10 rounded-lg">
                <p className="text-2xl font-bold text-destructive flex items-center justify-center gap-1"><AlertCircle className="h-5 w-5" /> {result.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-destructive">Error Details</h4>
                <div className="border rounded-lg overflow-auto max-h-[300px]">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Account No</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow></TableHeader>
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
            <div className="flex justify-end"><Button onClick={handleClose}>Done</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoanImportDialog;
