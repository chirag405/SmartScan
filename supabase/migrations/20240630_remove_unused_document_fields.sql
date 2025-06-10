-- Migration to remove unused fields from documents table
ALTER TABLE public.documents
DROP COLUMN IF EXISTS vision_api_response,
DROP COLUMN IF EXISTS access_url_expires_at,
DROP COLUMN IF EXISTS access_url,
DROP COLUMN IF EXISTS is_accessible,
DROP COLUMN IF EXISTS issue_date,
DROP COLUMN IF EXISTS expiry_date,
DROP COLUMN IF EXISTS key_identifiers,
DROP COLUMN IF EXISTS detected_entities,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS detected_text,
DROP COLUMN IF EXISTS ocr_text;

-- Comment to explain the migration
COMMENT ON TABLE public.documents IS 'Streamlined documents table with redundant fields removed'; 