-- Add conclusion field to test_groups for storing ConcludeResult
ALTER TABLE test_groups ADD COLUMN IF NOT EXISTS conclusion jsonb;
