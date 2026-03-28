import { useState } from 'react';
import { useBranches } from '@/hooks/useBranches';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Branch } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BranchManagement = () => {
  const { data: branches, isLoading } = useBranches();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('5');
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditBranch(null);
    setCode(''); setName(''); setAddress(''); setLat(''); setLng(''); setRadius('5');
    setDialogOpen(true);
  };

  const openEdit = (b: Branch) => {
    setEditBranch(b);
    setCode(b.branch_code); setName(b.branch_name); setAddress(b.address || '');
    setLat(b.latitude?.toString() || ''); setLng(b.longitude?.toString() || '');
    setRadius(b.radius_km?.toString() || '5');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!code.trim() || !name.trim()) { toast.error('Code and name required'); return; }
    setSaving(true);
    const payload = {
      branch_code: code.trim(),
      branch_name: name.trim(),
      address: address.trim() || null,
      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null,
      radius_km: radius ? Number(radius) : 5,
    };
    if (editBranch) {
      const { error } = await supabase.from('branches').update(payload).eq('id', editBranch.id);
      if (error) toast.error(error.message); else toast.success('Branch updated');
    } else {
      const { error } = await supabase.from('branches').insert(payload);
      if (error) toast.error(error.message); else toast.success('Branch created');
    }
    qc.invalidateQueries({ queryKey: ['branches'] });
    setDialogOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this branch?')) return;
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Branch deleted'); qc.invalidateQueries({ queryKey: ['branches'] }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">Branch Management</h2>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Branch</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !branches?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No branches yet.</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Lat/Lng</TableHead>
                  <TableHead>Radius (km)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono">{b.branch_code}</TableCell>
                    <TableCell className="font-medium">{b.branch_name}</TableCell>
                    <TableCell>{b.address || '-'}</TableCell>
                    <TableCell className="text-xs">{b.latitude && b.longitude ? `${b.latitude}, ${b.longitude}` : '-'}</TableCell>
                    <TableCell>{b.radius_km}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(b.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editBranch ? 'Edit Branch' : 'Create Branch'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Branch Code *</Label><Input value={code} onChange={e => setCode(e.target.value)} /></div>
            <div className="space-y-2"><Label>Branch Name *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={address} onChange={e => setAddress(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Latitude</Label><Input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} /></div>
              <div className="space-y-2"><Label>Longitude</Label><Input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Radius (km)</Label><Input type="number" value={radius} onChange={e => setRadius(e.target.value)} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editBranch ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchManagement;
