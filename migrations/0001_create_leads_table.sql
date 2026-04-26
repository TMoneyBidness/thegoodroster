-- SDHomeStart Lead Management Schema
-- Applied to Cloudflare D1 database: sdhomestart-leads

CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,                      -- ULID
    created_at INTEGER NOT NULL,              -- Unix ms
    source_page TEXT NOT NULL,
    source_tool TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    zip TEXT,
    purchase_price_range TEXT,
    income_range TEXT,
    credit_range TEXT,
    down_payment_range TEXT,
    loan_type_interest TEXT,
    timeline TEXT,
    is_first_time_buyer INTEGER,
    is_military INTEGER,
    routed_to_partner_id TEXT,
    routing_method TEXT,
    consent_to_share INTEGER NOT NULL,
    user_agent TEXT,
    webhook_dispatched INTEGER DEFAULT 0,
    webhook_response_status INTEGER
);

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id),
    timestamp INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    details TEXT
);

CREATE TABLE IF NOT EXISTS partner_rotation (
    partner_id TEXT PRIMARY KEY,
    last_received_at INTEGER,
    total_received INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
);

-- Index for lead lookups
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_audit_log_lead_id ON audit_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_partner_rotation_active ON partner_rotation(is_active, last_received_at);
