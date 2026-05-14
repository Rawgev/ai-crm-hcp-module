CREATE TABLE hcps (
  id VARCHAR(40) PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  specialty VARCHAR(120) NOT NULL,
  tier VARCHAR(40) NOT NULL DEFAULT 'B',
  organization VARCHAR(180) NOT NULL,
  territory VARCHAR(120) NOT NULL,
  consent_status VARCHAR(40) NOT NULL DEFAULT 'unknown'
);

CREATE TABLE interactions (
  id BIGSERIAL PRIMARY KEY,
  hcp_id VARCHAR(40) NOT NULL REFERENCES hcps(id),
  hcp_name VARCHAR(160) NOT NULL,
  interaction_type VARCHAR(80) NOT NULL,
  interaction_date DATE NOT NULL,
  interaction_time TIME NOT NULL,
  attendees TEXT DEFAULT '',
  topics_discussed TEXT DEFAULT '',
  materials_shared JSONB NOT NULL DEFAULT '[]'::jsonb,
  samples_distributed JSONB NOT NULL DEFAULT '[]'::jsonb,
  sentiment VARCHAR(40) NOT NULL DEFAULT 'Neutral',
  outcomes TEXT DEFAULT '',
  follow_up_actions TEXT DEFAULT '',
  ai_summary TEXT DEFAULT '',
  extracted_entities JSONB NOT NULL DEFAULT '{}'::jsonb,
  compliance_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  channel VARCHAR(80) DEFAULT 'field_visit',
  consent_for_voice_summary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_interactions_hcp_date ON interactions (hcp_id, interaction_date DESC);
