-- Migration: Add keyword_text column to job_pages table
-- Reason: Preserve original keyword text (including diacritics) for generation
-- Date: December 18, 2025

ALTER TABLE job_pages
ADD COLUMN keyword_text TEXT;
