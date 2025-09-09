-- Safe migration script to add webinar_mode column to meetings table
-- Run this in your Supabase SQL editor

-- Add webinar_mode column if it doesn't exist
DO $$ 
BEGIN
    -- Check if the column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meetings' 
        AND column_name = 'webinar_mode'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.meetings ADD COLUMN webinar_mode BOOLEAN DEFAULT FALSE;
        
        -- Update existing meetings to have webinar_mode = false
        UPDATE public.meetings SET webinar_mode = FALSE WHERE webinar_mode IS NULL;
        
        -- Add a comment to document the column
        COMMENT ON COLUMN public.meetings.webinar_mode IS 'Restricts participant controls when enabled - only moderators have full access';
        
        RAISE NOTICE 'webinar_mode column added successfully to meetings table';
    ELSE
        RAISE NOTICE 'webinar_mode column already exists in meetings table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'meetings' 
AND table_schema = 'public'
AND column_name = 'webinar_mode';
