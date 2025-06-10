-- Add a new column to store GPT-processed text
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS processed_text TEXT;

-- Comment on the column
COMMENT ON COLUMN public.documents.processed_text IS 'Text processed by GPT for better structure and formatting'; 