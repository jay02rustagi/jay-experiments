-- Last updated on 2026-03-18 to sync with database
-- 1. Leads / Customers Table

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  phone TEXT,
  stage TEXT DEFAULT 'Presales', -- 'Presales', 'Sales', 'Aftersales'
  intent_score TEXT DEFAULT 'Cold', -- 'Cold', 'Warm', 'Hot'
  intent_summary TEXT,
  chat_transcript JSONB DEFAULT '[]',
  engagement_plan JSONB, -- Auto-generated follow-up steps
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Customer Cars (For Aftersales)
CREATE TABLE customer_cars (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  car_model TEXT,
  purchase_date TIMESTAMP DEFAULT NOW(),
  current_odometer INTEGER DEFAULT 0,
  last_service_date TIMESTAMP,
  service_notes TEXT,
  maintenance_upgrades TEXT
);

-- 3. Vendor Leads (one row per customer per dealer; drives the admin CRM)
-- Reconstructed from app code on 2026-09-24; compare against the live table before re-running.
CREATE TABLE vendor_leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  vendor_id TEXT NOT NULL DEFAULT 'dealer_default',
  stage TEXT DEFAULT 'Presales', -- 'Presales', 'Sales', 'Aftersales'
  intent_score TEXT DEFAULT 'Cold', -- 'Cold', 'Warm', 'Hot'
  intent_summary TEXT, -- JSON string: { insights, last_update }
  chat_transcript JSONB DEFAULT '[]',
  engagement_plan JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (customer_id, vendor_id) -- required by upsert onConflict 'customer_id,vendor_id'
);
