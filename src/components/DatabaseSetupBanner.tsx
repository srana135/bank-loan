import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Database, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

const DatabaseSetupBanner = ({ error }: { error?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPGRST205 = error?.includes('PGRST205') || error?.includes('Could not find the table') || error?.includes('does not exist');
  if (!isPGRST205) return null;

  const handleCopy = () => {
    const text = `-- Run the complete migration from supabase-migration.sql in your Supabase SQL Editor.\n-- Then bootstrap your first admin:\nUPDATE public.profiles SET role = 'admin', is_active = true WHERE email = 'your-admin@email.com';`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-2 border-accent/60 bg-accent/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5 text-accent" />
          Database Setup Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground">
          Your Supabase tables haven't been created yet. The app is fully built — you just need to run the migration SQL.
        </p>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Steps:</p>
          <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">Supabase Dashboard</a></li>
            <li>Go to <strong>SQL Editor</strong></li>
            <li>Copy the entire contents of <code className="bg-muted px-1.5 py-0.5 rounded text-xs">supabase-migration.sql</code> from the project root</li>
            <li>Paste and run it in the SQL Editor</li>
            <li>Bootstrap your first admin user (see below)</li>
            <li>Refresh this page</li>
          </ol>
        </div>
        <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)} className="gap-1.5">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Hide' : 'Show'} Bootstrap SQL
        </Button>
        {expanded && (
          <div className="relative">
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto text-muted-foreground">
{`-- After running supabase-migration.sql, bootstrap your first admin:
UPDATE public.profiles
SET role = 'admin', is_active = true
WHERE email = 'your-admin@email.com';`}
            </pre>
            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        )}
        <div className="flex items-start gap-2 p-2 rounded bg-destructive/5 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Until the migration is run, all data features (loans, branches, users, comments, etc.) will show empty or error states. Calculators and static pages work without the database.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseSetupBanner;
