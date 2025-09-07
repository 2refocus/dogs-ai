-- Migration script to identify old rows with Replicate URLs
-- Run this in Supabase SQL Editor to see what needs to be migrated

-- 1. Find all rows with Replicate CDN URLs (these need migration)
SELECT 
  id,
  output_url,
  high_res_url,
  preset_label,
  created_at,
  CASE 
    WHEN output_url LIKE '%replicate.delivery%' THEN 'NEEDS_MIGRATION'
    WHEN output_url LIKE '%supabase%' THEN 'ALREADY_MIGRATED'
    ELSE 'UNKNOWN'
  END as migration_status
FROM generations 
WHERE output_url IS NOT NULL
ORDER BY created_at DESC;

-- 2. Count how many need migration
SELECT 
  COUNT(*) as total_rows,
  COUNT(CASE WHEN output_url LIKE '%replicate.delivery%' THEN 1 END) as need_migration,
  COUNT(CASE WHEN output_url LIKE '%supabase%' THEN 1 END) as already_migrated
FROM generations 
WHERE output_url IS NOT NULL;

-- 3. Find rows where high_res_url is different from output_url (potential duplicates)
SELECT 
  id,
  output_url,
  high_res_url,
  CASE 
    WHEN output_url = high_res_url THEN 'SAME_URL'
    ELSE 'DIFFERENT_URL'
  END as url_status
FROM generations 
WHERE output_url IS NOT NULL AND high_res_url IS NOT NULL
ORDER BY created_at DESC;
