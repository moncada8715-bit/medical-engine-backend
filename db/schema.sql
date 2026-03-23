-- Professional Medical Coding Schema (v3.0-CORE-H)
-- High-fidelity schema with hierarchical support and annual versioning.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure clean tables for professional datasets
DROP TABLE IF EXISTS ncci_edits CASCADE;
DROP TABLE IF EXISTS icd10_cpt_mapping CASCADE;
DROP TABLE IF EXISTS modifiers CASCADE;
DROP TABLE IF EXISTS hcpcs_codes CASCADE;
DROP TABLE IF EXISTS cpt_codes CASCADE;
DROP TABLE IF EXISTS icd10_codes CASCADE;

-- Table: icd10_codes (Clinical Taxonomy with Parent-Child Relationships)
CREATE TABLE icd10_codes (
  code VARCHAR(10) PRIMARY KEY,
  description TEXT NOT NULL,
  parent_code VARCHAR(10) REFERENCES icd10_codes(code),
  is_billable BOOLEAN DEFAULT true,
  effective_year INTEGER DEFAULT 2024,
  status TEXT DEFAULT 'active', -- 'active', 'deleted', 'archived'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: cpt_codes (Official Procedural Codes with Versioning)
CREATE TABLE cpt_codes (
  code VARCHAR(10) PRIMARY KEY,
  short_description TEXT NOT NULL,
  long_description TEXT,
  medium_description TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  effective_year INTEGER DEFAULT 2024,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: hcpcs_codes (Supplies and Services with Versioning)
CREATE TABLE hcpcs_codes (
  code VARCHAR(10) PRIMARY KEY,
  short_description TEXT NOT NULL,
  long_description TEXT,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  effective_year INTEGER DEFAULT 2024,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: modifiers (Coding Modifiers)
CREATE TABLE modifiers (
  modifier VARCHAR(5) PRIMARY KEY,
  description TEXT NOT NULL,
  type VARCHAR(50), -- e.g., 'CPT', 'HCPCS'
  effective_year INTEGER DEFAULT 2024,
  status TEXT DEFAULT 'active'
);

-- Table: ncci_edits (National Correct Coding Initiative)
CREATE TABLE ncci_edits (
  id SERIAL PRIMARY KEY,
  code_column_1 VARCHAR(10) NOT NULL,
  code_column_2 VARCHAR(10) NOT NULL,
  policy_narrative TEXT,
  effective_date DATE,
  deletion_date DATE,
  effective_year INTEGER DEFAULT 2024,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: icd10_cpt_mapping (Medical Necessity Policy Dataset)
CREATE TABLE icd10_cpt_mapping (
  icd10_code VARCHAR(10) NOT NULL,
  cpt_code VARCHAR(10) NOT NULL,
  policy_reference TEXT,
  effective_year INTEGER DEFAULT 2024,
  PRIMARY KEY (icd10_code, cpt_code)
);

-- Advanced GIN Indexes for high-performance fuzzy search
CREATE INDEX idx_icd10_desc_gin ON icd10_codes USING gin (to_tsvector('english', description));
CREATE INDEX idx_cpt_long_desc_gin ON cpt_codes USING gin (to_tsvector('english', COALESCE(long_description, '')));
CREATE INDEX idx_cpt_short_desc_gin ON cpt_codes USING gin (to_tsvector('english', short_description));
CREATE INDEX idx_hcpcs_long_desc_gin ON hcpcs_codes USING gin (to_tsvector('english', COALESCE(long_description, '')));
CREATE INDEX idx_hcpcs_short_desc_gin ON hcpcs_codes USING gin (to_tsvector('english', short_description));

-- Table: cases (Clinical Case Lifecycle)
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  patient_ref TEXT,
  status TEXT DEFAULT 'draft',
  chief_complaint TEXT,
  clinical_notes TEXT,
  input_type TEXT DEFAULT 'text',
  icd10_code VARCHAR(10),
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: case_decisions (Clinical Audit Trail)
CREATE TABLE IF NOT EXISTS case_decisions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  final_cpt TEXT,
  final_icd10 JSONB, -- Array of final ICD-10 objects
  status TEXT CHECK (status IN ('accepted', 'modified', 'rejected')),
  rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: coding_feedback (Closed-Loop Learning System)
CREATE TABLE IF NOT EXISTS coding_feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_suggestion JSONB,
  user_final_data JSONB,
  adjustment_reason TEXT,
  patterns JSONB, -- Tracks upcoding/downcoding trends
  clinical_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hierarchy Tracking Index
CREATE INDEX IF NOT EXISTS idx_icd10_parent ON icd10_codes (parent_code);
CREATE INDEX IF NOT EXISTS idx_case_decisions_case_id ON case_decisions(case_id);
