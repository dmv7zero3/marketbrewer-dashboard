-- Migration: Add keyword_language column to job_pages table
-- Reason: Ensure worker generates content in the correct language
-- Date: December 18, 2025

ALTER TABLE job_pages
ADD COLUMN keyword_language TEXT NOT NULL DEFAULT 'en';

CREATE INDEX IF NOT EXISTS idx_job_pages_language ON job_pages(job_id, keyword_language);
