import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface Ctx {
  showOnlyFlagged: boolean;
  setShowOnlyFlagged: (v: boolean) => void;
}

const KEY = 'contact_icons_show_only_flagged';
const ContactIconSettingsContext = createContext<Ctx | undefined>(undefined);

export const ContactIconSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [showOnlyFlagged, setShowOnlyFlaggedState] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  const setShowOnlyFlagged = (v: boolean) => {
    setShowOnlyFlaggedState(v);
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* noop */ }
  };
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setShowOnlyFlaggedState(e.newValue === '1');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return (
    <ContactIconSettingsContext.Provider value={{ showOnlyFlagged, setShowOnlyFlagged }}>
      {children}
    </ContactIconSettingsContext.Provider>
  );
};

export const useContactIconSettings = () => {
  const ctx = useContext(ContactIconSettingsContext);
  if (!ctx) throw new Error('useContactIconSettings must be used within ContactIconSettingsProvider');
  return ctx;
};
