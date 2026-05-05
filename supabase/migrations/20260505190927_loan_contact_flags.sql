-- Add WhatsApp / IMO contact flags to loans (per-mobile customer record)
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS has_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_imo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guarantor_1_has_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guarantor_1_has_imo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guarantor_2_has_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guarantor_2_has_imo boolean NOT NULL DEFAULT false;
