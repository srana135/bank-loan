import { useState } from 'react';
import { Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useContactIconSettings } from '@/contexts/ContactIconSettings';
import { toast } from 'sonner';

interface Props {
  phone?: string | null;
  loanId?: string;
  hasWhatsapp?: boolean;
  hasImo?: boolean;
  whatsappField?: string; // db column to update
  imoField?: string;
  showPhoneIcon?: boolean;
  className?: string;
}

const cleanNumber = (p: string) => p.replace(/[^\d]/g, '');

const WhatsAppIcon = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M20.52 3.48A11.88 11.88 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84c0 2.09.55 4.13 1.6 5.93L0 24l6.4-1.68a11.83 11.83 0 0 0 5.64 1.44h.01c6.55 0 11.85-5.3 11.85-11.84 0-3.16-1.23-6.13-3.38-8.44ZM12.05 21.5h-.01a9.62 9.62 0 0 1-4.91-1.35l-.35-.21-3.8 1 1.02-3.7-.23-.38a9.65 9.65 0 0 1-1.49-5.13c0-5.34 4.34-9.68 9.68-9.68 2.59 0 5.02 1.01 6.85 2.84a9.62 9.62 0 0 1 2.84 6.85c0 5.34-4.34 9.66-9.6 9.66Zm5.55-7.24c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.36.22-.66.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.79-1.67-2.09-.18-.3-.02-.46.13-.61.13-.13.3-.36.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.07-.15-.68-1.64-.93-2.24-.25-.59-.5-.51-.68-.52l-.58-.01c-.2 0-.53.07-.81.38-.28.3-1.06 1.04-1.06 2.53s1.09 2.94 1.24 3.14c.15.2 2.14 3.27 5.18 4.58.72.31 1.29.5 1.73.64.73.23 1.39.2 1.91.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.07-.13-.27-.2-.57-.35Z"/>
  </svg>
);

const ImoIcon = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.03 2 11c0 2.7 1.34 5.13 3.46 6.78L4.5 22l4.6-2.05c.92.21 1.9.32 2.9.32 5.52 0 10-4.03 10-9s-4.48-9-10-9Zm-3.5 10.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/>
  </svg>
);

const PhoneWithIcons = ({ phone, loanId, hasWhatsapp = false, hasImo = false, whatsappField, imoField, showPhoneIcon, className = '' }: Props) => {
  const { userRole } = useAuth();
  const { showOnlyFlagged } = useContactIconSettings();
  const [wa, setWa] = useState(hasWhatsapp);
  const [im, setIm] = useState(hasImo);
  const [busy, setBusy] = useState(false);

  if (!phone) return <span className={className}>-</span>;
  const isAdmin = userRole === 'admin';
  const num = cleanNumber(phone);

  const showWa = !showOnlyFlagged || wa;
  const showIm = !showOnlyFlagged || im;

  const toggle = async (kind: 'wa' | 'im') => {
    if (!isAdmin || !loanId || busy) return;
    const field = kind === 'wa' ? whatsappField : imoField;
    if (!field) return;
    const newVal = kind === 'wa' ? !wa : !im;
    setBusy(true);
    const { error } = await supabase.from('loans').update({ [field]: newVal }).eq('id', loanId);
    if (error) {
      toast.error(error.message);
    } else {
      if (kind === 'wa') setWa(newVal); else setIm(newVal);
      toast.success(`${kind === 'wa' ? 'WhatsApp' : 'IMO'} ${newVal ? 'enabled' : 'disabled'}`);
    }
    setBusy(false);
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} onClick={e => e.stopPropagation()}>
      <a href={`tel:${num}`} className="text-primary hover:underline inline-flex items-center gap-1">
        {showPhoneIcon && <Phone className="h-3 w-3" />}
        {phone}
      </a>
      {showWa && (
        <a
          href={`https://wa.me/${num}`}
          target="_blank"
          rel="noopener noreferrer"
          title="WhatsApp"
          className="text-green-600 hover:text-green-700"
        >
          <WhatsAppIcon />
        </a>
      )}
      {showIm && (
        <a
          href={`imo://${num}`}
          onClick={(e) => {
            // fallback to web
            setTimeout(() => { window.open(`https://imo.im/call#${num}`, '_blank'); }, 300);
            e.stopPropagation();
          }}
          title="IMO"
          className="text-purple-600 hover:text-purple-700"
        >
          <ImoIcon />
        </a>
      )}
      {isAdmin && loanId && whatsappField && (
        <button
          type="button"
          onClick={() => toggle('wa')}
          disabled={busy}
          title={wa ? 'WhatsApp confirmed (click to unflag)' : 'Mark has WhatsApp'}
          className={`text-[9px] px-1 rounded border transition-colors ${wa ? 'bg-green-600 text-white border-green-600' : 'bg-muted text-muted-foreground border-border'}`}
        >W</button>
      )}
      {isAdmin && loanId && imoField && (
        <button
          type="button"
          onClick={() => toggle('im')}
          disabled={busy}
          title={im ? 'IMO confirmed (click to unflag)' : 'Mark has IMO'}
          className={`text-[9px] px-1 rounded border transition-colors ${im ? 'bg-purple-600 text-white border-purple-600' : 'bg-muted text-muted-foreground border-border'}`}
        >I</button>
      )}
    </span>
  );
};

export default PhoneWithIcons;
