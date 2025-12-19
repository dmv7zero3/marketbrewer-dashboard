-- Migration: Add language column to keywords table
-- Reason: Support bilingual (English/Spanish) keyword targeting
-- Date: December 18, 2025

ALTER TABLE keywords
ADD COLUMN language TEXT NOT NULL DEFAULT 'en';

CREATE INDEX IF NOT EXISTS idx_keywords_business_language ON keywords(business_id, language);
