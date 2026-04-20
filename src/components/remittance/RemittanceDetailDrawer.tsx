import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Phone, Pencil, Trash2 } from 'lucide-react';
import { RemittanceProfile, UserRole } from '@/types';

const stabilityVariant: Record<string, any> = {
  Stable: 'default',
  Medium: 'secondary',
  Uncertain: 'destructive',
};

interface Props {
  profile: RemittanceProfile | null;
  open: boolean;
  onClose: () => void;
  onEdit: (p: RemittanceProfile) => void;
  onDelete: (id: string) => void;
  userRole: UserRole | null;
}

const Row = ({ label, value, isPhone }: { label: string; value?: string | number | null; isPhone?: boolean }) => (
  <div className="flex justify-between gap-2 py-1.5 text-sm">
    <span className="text-muted-foreground shrink-0">{label}</span>
    {isPhone && value ? (
      <a href={`tel:${String(value).replace(/[^0-9+]/g, '')}`} className="text-primary hover:underline inline-flex items-center gap-1 font-medium text-right break-all">
        <Phone className="h-3 w-3" />{value}
      </a>
    ) : (
      <span className="font-medium text-right break-words">{value ?? '-'}</span>
    )}
  </div>
);

const RemittanceDetailDrawer = ({ profile, open, onClose, onEdit, onDelete, userRole }: Props) => {
  if (!profile) return null;
  const canEdit = !!userRole;
  const canDelete = userRole === 'admin';

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <SheetTitle className="text-lg break-words">{profile.account_holder_name}</SheetTitle>
              <SheetDescription className="break-words">
                {profile.country || 'Country —'} {profile.city ? `· ${profile.city}` : ''}
              </SheetDescription>
            </div>
            {profile.stability && (
              <Badge variant={stabilityVariant[profile.stability] || 'secondary'}>{profile.stability}</Badge>
            )}
          </div>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 mb-3">
          <Button asChild size="sm" className="gap-1">
            <a href={`tel:${profile.mobile_number.replace(/[^0-9+]/g, '')}`}>
              <Phone className="h-3 w-3" /> Call Client
            </a>
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => onEdit(profile)}>
              <Pencil className="h-3 w-3" /> Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" size="sm" className="gap-1"
              onClick={() => { if (confirm(`Delete profile for ${profile.account_holder_name}?`)) { onClose(); onDelete(profile.id); } }}>
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          )}
        </div>

        <section>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Client</h4>
          <Row label="Account Holder" value={profile.account_holder_name} />
          <Row label="Account No" value={profile.account_number} />
          <Row label="Mobile" value={profile.mobile_number} isPhone />
        </section>

        <Separator className="my-3" />

        <section>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Expat Family</h4>
          <Row label="Expat Name" value={profile.expat_name} />
          <Row label="Relation" value={profile.expat_relation} />
          <Row label="Country" value={profile.country} />
          <Row label="City" value={profile.city} />
          <Row label="Years Abroad" value={profile.years_abroad} />
        </section>

        <Separator className="my-3" />

        <section>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Remittance</h4>
          <Row label="Sends Money" value={profile.sends_money ? 'Yes' : 'No'} />
          <Row label="Frequency" value={profile.frequency} />
          <Row label="Average Amount" value={profile.average_amount ? `৳${profile.average_amount.toLocaleString()}` : null} />
          <div className="py-1.5">
            <span className="text-sm text-muted-foreground">Channels</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {(profile.channels || []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
              {(profile.channels || []).map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
            </div>
          </div>
        </section>

        <Separator className="my-3" />

        <section>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Receiver</h4>
          <Row label="Receiver Name" value={profile.receiver_name} />
          <Row label="Receiver Mobile" value={profile.receiver_mobile} isPhone />
          <Row label="Method" value={profile.receiver_method} />
        </section>

        {profile.notes && (
          <>
            <Separator className="my-3" />
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</h4>
              <p className="text-sm whitespace-pre-wrap break-words">{profile.notes}</p>
            </section>
          </>
        )}

        <Separator className="my-3" />

        <div className="text-[11px] text-muted-foreground space-y-0.5">
          <p>Collected by: {profile.collected_by_name || '—'}</p>
          <p>Last updated: {new Date(profile.updated_at).toLocaleString('en-GB')}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RemittanceDetailDrawer;
