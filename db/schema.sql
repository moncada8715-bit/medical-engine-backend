-- Initial standalone schema for the Medical Coding Engine

CREATE DOMAIN url AS TEXT
CHECK (VALUE ~ '^https?://');

-- Enable UUID extension if not enabled (useful for Postgres depending on version)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: cases (Logs all analysis requests)
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- For future auth linking
  title TEXT NOT NULL,
  patient_ref TEXT,
  status TEXT DEFAULT 'draft',
  chief_complaint TEXT,
  clinical_notes TEXT,
  input_type TEXT DEFAULT 'text',
  icd10_code TEXT, -- Final derived code
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: icd10_codes (The comprehensive ICD-10 CM dataset)
CREATE TABLE IF NOT EXISTS icd10_codes (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  is_billable BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for searching descriptions efficiently
CREATE INDEX IF NOT EXISTS idx_icd10_description ON icd10_codes USING gin (to_tsvector('english', description));
