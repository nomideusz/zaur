-- Script to remove duplicate news items
-- Keep only the most recent version based on publish date

-- Start a transaction
BEGIN;

-- Create a temporary table to hold the IDs of records to keep
CREATE TEMP TABLE news_to_keep AS (
    SELECT DISTINCT ON (url) id
    FROM news
    ORDER BY url, publish_date DESC
);

-- Delete duplicates (any news item not in the news_to_keep table)
DELETE FROM news
WHERE id NOT IN (SELECT id FROM news_to_keep);

-- Show how many rows were affected
DO $$
DECLARE 
    count_deleted INT;
BEGIN
    GET DIAGNOSTICS count_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % duplicate news items', count_deleted;
END $$;

-- Commit the transaction
COMMIT;

-- Count records to verify
SELECT COUNT(*) AS total_news_records FROM news; 