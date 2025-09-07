-- Clean up expired Replicate URLs that can't be migrated
-- Run this in Supabase SQL Editor to remove expired records

-- First, see what will be deleted (SAFETY CHECK)
SELECT 
  COUNT(*) as total_expired,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM generations 
WHERE output_url LIKE '%replicate.delivery%'
  AND created_at < NOW() - INTERVAL '24 hours';

-- If the above looks correct, uncomment and run this to delete:
-- DELETE FROM generations 
-- WHERE output_url LIKE '%replicate.delivery%'
--   AND created_at < NOW() - INTERVAL '24 hours';

-- After cleanup, verify the results:
-- SELECT COUNT(*) as remaining_replicate_urls
-- FROM generations 
-- WHERE output_url LIKE '%replicate.delivery%';
