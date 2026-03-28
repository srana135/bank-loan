import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AppSetting } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const AppSettings = () => {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*').order('setting_key');
      if (error) throw error;
      return (data || []) as AppSetting[];
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSetting, setEditSetting] = useState<AppSetting | null>(null);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditSetting(null); setKey(''); setValue(''); setDialogOpen(true); };
  const openEdit = (s: AppSetting) => {
    setEditSetting(s);
    setKey(s.setting_key);
    setValue(JSON.stringify(s.setting_value, null, 2));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!key.trim()) { toast.error('Key required'); return; }
    setSaving(true);
    try {
      const parsed = JSON.parse(value || '""');
      const payload = { setting_key: key.trim(), setting_value: parsed };
      if (editSetting) {
        const { error } = await supabase.from('app_settings').update(payload).eq('id', editSetting.id);
        if (error) throw error;
        toast.success('Setting updated');
      } else {
        const { error } = await supabase.from('app_settings').insert(payload);
        if (error) throw error;
        toast.success('Setting created');
      }
      qc.invalidateQueries({ queryKey: ['app-settings'] });
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Invalid JSON');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this setting?')) return;
    const { error } = await supabase.from('app_settings').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Setting deleted'); qc.invalidateQueries({ queryKey: ['app-settings'] }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">App Settings</h2>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Setting</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !settings?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No settings configured.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.setting_key}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs">{JSON.stringify(s.setting_value)}</TableCell>
                  <TableCell className="text-xs">{new Date(s.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editSetting ? 'Edit Setting' : 'Add Setting'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Key *</Label><Input value={key} onChange={e => setKey(e.target.value)} disabled={!!editSetting} /></div>
            <div className="space-y-2"><Label>Value (JSON)</Label><Textarea rows={5} value={value} onChange={e => setValue(e.target.value)} placeholder='e.g. "hello" or {"key":"val"}' /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppSettings;
