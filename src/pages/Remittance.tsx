import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRemittanceProfiles, useDeleteRemittance } from '@/hooks/useRemittance';
import { RemittanceProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Phone, Send, Loader2, Search } from 'lucide-react';
import RemittanceForm from '@/components/remittance/RemittanceForm';
import RemittanceDetailDrawer from '@/components/remittance/RemittanceDetailDrawer';

const stabilityVariant: Record<string, any> = {
  Stable: 'default',
  Medium: 'secondary',
  Uncertain: 'destructive',
};

const Remittance = () => {
  const { profile, userRole } = useAuth();
  const branchScope = profile?.can_access_all_branches || userRole === 'admin' ? undefined : profile?.branch_id;
  const { data: profiles, isLoading } = useRemittanceProfiles(branchScope);
  const del = useDeleteRemittance();

  const [search, setSearch] = useState('');
  const [country, setCountry] = useState<string>('all');
  const [stability, setStability] = useState<string>('all');
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<RemittanceProfile | null>(null);
  const [detail, setDetail] = useState<RemittanceProfile | null>(null);

  const countries = useMemo(() => {
    const set = new Set<string>();
    (profiles || []).forEach(p => p.country && set.add(p.country));
    return Array.from(set).sort();
  }, [profiles]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (profiles || []).filter(p => {
      if (s && !(
        p.account_holder_name.toLowerCase().includes(s) ||
        p.mobile_number.toLowerCase().includes(s) ||
        (p.expat_name || '').toLowerCase().includes(s) ||
        (p.country || '').toLowerCase().includes(s)
      )) return false;
      if (country !== 'all' && p.country !== country) return false;
      if (stability !== 'all' && p.stability !== stability) return false;
      return true;
    });
  }, [profiles, search, country, stability]);

  const handleEdit = (p: RemittanceProfile) => { setDetail(null); setEditing(p); setOpenForm(true); };
  const handleDelete = (id: string) => del.mutate({ id, _userId: profile?.id, _userName: profile?.full_name });

  return (
    <div className="container py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Send className="h-6 w-6 text-accent" /> Remittance Profiles
          </h1>
          <p className="text-sm text-muted-foreground">Expat-supported borrower data for loan decision support</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpenForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Profile
        </Button>
      </div>

      <Card className="p-3">
        <div className="grid sm:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search name / mobile / country" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stability} onValueChange={setStability}>
            <SelectTrigger><SelectValue placeholder="Stability" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stability</SelectItem>
              <SelectItem value="Stable">Stable</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Uncertain">Uncertain</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Remittance</TableHead>
                  <TableHead>Stability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No profiles found</TableCell></TableRow>
                ) : filtered.map(p => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => setDetail(p)}>
                    <TableCell className="font-medium">{p.account_holder_name}</TableCell>
                    <TableCell>
                      <a href={`tel:${p.mobile_number.replace(/[^0-9+]/g, '')}`}
                        onClick={e => e.stopPropagation()}
                        className="text-primary hover:underline inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />{p.mobile_number}
                      </a>
                    </TableCell>
                    <TableCell>{p.country || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={p.sends_money ? 'default' : 'outline'} className="text-[10px]">
                          {p.sends_money ? p.frequency || 'Yes' : 'No'}
                        </Badge>
                        {(p.channels || []).slice(0, 2).map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                        {(p.channels || []).length > 2 && <Badge variant="outline" className="text-[10px]">+{p.channels.length - 2}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{p.stability && <Badge variant={stabilityVariant[p.stability]}>{p.stability}</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No profiles found</p>}
            {filtered.map(p => (
              <Card key={p.id} className="p-3 cursor-pointer" onClick={() => setDetail(p)}>
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.account_holder_name}</p>
                    <p className="text-xs text-muted-foreground">{p.country || '—'}{p.city ? ` · ${p.city}` : ''}</p>
                  </div>
                  {p.stability && <Badge variant={stabilityVariant[p.stability]} className="text-[10px] shrink-0">{p.stability}</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <a href={`tel:${p.mobile_number.replace(/[^0-9+]/g, '')}`}
                    onClick={e => e.stopPropagation()}
                    className="text-primary text-xs inline-flex items-center gap-1 hover:underline">
                    <Phone className="h-3 w-3" />{p.mobile_number}
                  </a>
                  <Badge variant={p.sends_money ? 'default' : 'outline'} className="text-[9px]">
                    {p.sends_money ? p.frequency || 'Yes' : 'No remit'}
                  </Badge>
                  {(p.channels || []).slice(0, 2).map(c => <Badge key={c} variant="outline" className="text-[9px]">{c}</Badge>)}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <RemittanceForm open={openForm} onClose={() => { setOpenForm(false); setEditing(null); }} initial={editing} />
      <RemittanceDetailDrawer
        profile={detail}
        open={!!detail}
        onClose={() => setDetail(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        userRole={userRole}
      />
    </div>
  );
};

export default Remittance;
