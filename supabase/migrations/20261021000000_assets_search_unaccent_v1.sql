-- Assets BG-01: accent-insensitive search support (generated normalized columns).
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.assets_immutable_unaccent(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT unaccent(coalesce(input, ''));
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='assets' AND column_name='name_normalized') THEN
    ALTER TABLE public.assets
      ADD COLUMN name_normalized text
      GENERATED ALWAYS AS (lower(public.assets_immutable_unaccent(name))) STORED;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='assets' AND column_name='holder_external_label_normalized') THEN
    ALTER TABLE public.assets
      ADD COLUMN holder_external_label_normalized text
      GENERATED ALWAYS AS (lower(public.assets_immutable_unaccent(holder_external_label))) STORED;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='assets' AND column_name='placement_external_text_normalized') THEN
    ALTER TABLE public.assets
      ADD COLUMN placement_external_text_normalized text
      GENERATED ALWAYS AS (lower(public.assets_immutable_unaccent(placement_external_text))) STORED;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='assets' AND column_name='placement_detail_normalized') THEN
    ALTER TABLE public.assets
      ADD COLUMN placement_detail_normalized text
      GENERATED ALWAYS AS (lower(public.assets_immutable_unaccent(placement_detail))) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS assets_name_normalized_idx ON public.assets (name_normalized);
