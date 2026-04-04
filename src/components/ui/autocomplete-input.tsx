import { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

const AutocompleteInput = ({ value, onChange, suggestions, placeholder, className }: AutocompleteInputProps) => {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value.trim()) return [];
    const lower = value.toLowerCase();
    return suggestions.filter(s => s.toLowerCase().includes(lower)).slice(0, 8);
  }, [value, suggestions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(p => Math.min(p + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(p => Math.max(p - 1, 0)); }
    else if (e.key === 'Enter' && highlighted >= 0) { e.preventDefault(); onChange(filtered[highlighted]); setOpen(false); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(-1); }}
        onFocus={() => { if (value.trim()) setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((item, i) => (
            <button
              key={item + i}
              type="button"
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm hover:bg-muted/80 cursor-pointer transition-colors',
                i === highlighted && 'bg-muted'
              )}
              onMouseDown={e => { e.preventDefault(); onChange(item); setOpen(false); }}
              onMouseEnter={() => setHighlighted(i)}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
