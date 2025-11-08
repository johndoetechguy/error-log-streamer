-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  error_code VARCHAR(255),
  error TEXT,
  error_category VARCHAR(100),
  error_location VARCHAR(255),
  api_name VARCHAR(255),
  error_reason TEXT,
  aws_cluster VARCHAR(255),
  action_to_be_taken TEXT,
  correlation_id UUID,
  order_id UUID,
  service_name VARCHAR(255),
  error_stack_trace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON error_logs(error_category);
CREATE INDEX IF NOT EXISTS idx_error_logs_service_name ON error_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);

-- AI provider configuration table
CREATE TABLE IF NOT EXISTS ai_provider_settings (
  id SERIAL PRIMARY KEY,
  provider_type VARCHAR(50) UNIQUE NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  api_url TEXT,
  api_key TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one provider can be active at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_provider_active ON ai_provider_settings ((is_active)) WHERE is_active = TRUE;

-- Create a view for analytics
CREATE OR REPLACE VIEW error_logs_analytics AS
SELECT 
  error_category,
  COUNT(*) as count,
  COUNT(DISTINCT service_name) as unique_services,
  MIN(timestamp) as first_occurrence,
  MAX(timestamp) as last_occurrence
FROM error_logs
GROUP BY error_category;

