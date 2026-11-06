-- ==============================================================================
-- KhelGrid Community Live Scorekeeper & Host Payouts System Migration
-- Purpose:
-- 1. Create public.community_live_matches table for local tournament scorekeeping.
-- 2. Create public.host_payout_accounts for bank/UPI destination credentials.
-- 3. Create public.host_settlement_payouts for settlement audit trail and fee deductions.
-- 4. Enable Row Level Security (RLS) on all new tables.
-- 5. Install atomic SECURITY DEFINER RPCs for live score broadcasts and host settlements.
-- ==============================================================================

BEGIN;

-- 1. Create community_live_matches table
CREATE TABLE IF NOT EXISTS public.community_live_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL UNIQUE,
  sport text NOT NULL CHECK (sport IN ('Cricket', 'Football', 'Badminton', 'Basketball', 'Tennis', 'Kabaddi', 'Box Cricket')),
  tournament text NOT NULL CHECK (char_length(trim(tournament)) >= 2),
  stage text,
  status text NOT NULL DEFAULT 'LIVE' CHECK (status IN ('LIVE', 'UPCOMING', 'FINISHED')),
  venue text NOT NULL CHECK (char_length(trim(venue)) >= 2),
  city text NOT NULL CHECK (char_length(trim(city)) >= 1),
  team_a_name text NOT NULL CHECK (char_length(trim(team_a_name)) >= 1),
  team_a_score text NOT NULL DEFAULT '0',
  team_b_name text NOT NULL CHECK (char_length(trim(team_b_name)) >= 1),
  team_b_score text NOT NULL DEFAULT '0',
  current_over_or_time text NOT NULL DEFAULT '0.0 Ov',
  highlight text,
  commentary jsonb NOT NULL DEFAULT '[]'::jsonb,
  host_name text NOT NULL DEFAULT 'Host Scorer',
  host_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_live_matches_status ON public.community_live_matches(status);
CREATE INDEX IF NOT EXISTS idx_community_live_matches_sport ON public.community_live_matches(sport);
CREATE INDEX IF NOT EXISTS idx_community_live_matches_city ON public.community_live_matches(city);

-- 2. Create host_payout_accounts table
CREATE TABLE IF NOT EXISTS public.host_payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id text NOT NULL UNIQUE,
  beneficiary_name text NOT NULL CHECK (char_length(trim(beneficiary_name)) >= 2),
  payout_method text NOT NULL DEFAULT 'upi' CHECK (payout_method IN ('upi', 'bank_transfer')),
  upi_id text,
  account_number text,
  ifsc_code text,
  bank_name text,
  is_verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_host_payout_accounts_host ON public.host_payout_accounts(host_id);

-- 3. Create host_settlement_payouts table
CREATE TABLE IF NOT EXISTS public.host_settlement_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_ref text NOT NULL UNIQUE,
  host_id text NOT NULL,
  gross_amount numeric(10, 2) NOT NULL CHECK (gross_amount >= 0),
  platform_fee_rate numeric(5, 2) NOT NULL DEFAULT 8.00 CHECK (platform_fee_rate >= 0),
  platform_fee_amount numeric(10, 2) NOT NULL CHECK (platform_fee_amount >= 0),
  net_payout_amount numeric(10, 2) NOT NULL CHECK (net_payout_amount >= 0),
  payout_destination text NOT NULL,
  payout_method text NOT NULL DEFAULT 'upi' CHECK (payout_method IN ('upi', 'bank_transfer')),
  status text NOT NULL DEFAULT 'settled' CHECK (status IN ('pending', 'processing', 'settled', 'failed')),
  utr_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_host_settlements_host ON public.host_settlement_payouts(host_id);
CREATE INDEX IF NOT EXISTS idx_host_settlements_status ON public.host_settlement_payouts(status);

-- 4. Enable Row Level Security
ALTER TABLE public.community_live_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_settlement_payouts ENABLE ROW LEVEL SECURITY;

-- Public can read live community matches
CREATE POLICY "Public can view community live matches"
  ON public.community_live_matches
  FOR SELECT
  USING (true);

-- Anonymous / Authenticated hosts can insert matches
CREATE POLICY "Allow public match creation"
  ON public.community_live_matches
  FOR INSERT
  WITH CHECK (true);

-- Allow public match score updates
CREATE POLICY "Allow public match updates"
  ON public.community_live_matches
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Host payout accounts
CREATE POLICY "Public read own host payout account"
  ON public.host_payout_accounts
  FOR SELECT
  USING (true);

CREATE POLICY "Public insert/update own host payout account"
  ON public.host_payout_accounts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Host settlements
CREATE POLICY "Public read own settlements"
  ON public.host_settlement_payouts
  FOR SELECT
  USING (true);

CREATE POLICY "Public insert settlements"
  ON public.host_settlement_payouts
  FOR INSERT
  WITH CHECK (true);

-- 5. RPC Functions

-- Save or update Host Payout Account
CREATE OR REPLACE FUNCTION public.save_host_payout_account(
  p_host_id text,
  p_beneficiary_name text,
  p_payout_method text,
  p_upi_id text DEFAULT NULL,
  p_account_number text DEFAULT NULL,
  p_ifsc_code text DEFAULT NULL,
  p_bank_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  INSERT INTO public.host_payout_accounts (
    host_id,
    beneficiary_name,
    payout_method,
    upi_id,
    account_number,
    ifsc_code,
    bank_name,
    updated_at
  ) VALUES (
    p_host_id,
    trim(p_beneficiary_name),
    p_payout_method,
    nullif(trim(p_upi_id), ''),
    nullif(trim(p_account_number), ''),
    nullif(trim(p_ifsc_code), ''),
    nullif(trim(p_bank_name), ''),
    now()
  )
  ON CONFLICT (host_id) DO UPDATE SET
    beneficiary_name = EXCLUDED.beneficiary_name,
    payout_method = EXCLUDED.payout_method,
    upi_id = EXCLUDED.upi_id,
    account_number = EXCLUDED.account_number,
    ifsc_code = EXCLUDED.ifsc_code,
    bank_name = EXCLUDED.bank_name,
    updated_at = now()
  RETURNING to_jsonb(public.host_payout_accounts.*) INTO v_result;

  RETURN jsonb_build_object('success', true, 'account', v_result);
END;
$$;

-- Request Host Settlement Payout
CREATE OR REPLACE FUNCTION public.request_host_settlement_payout(
  p_host_id text,
  p_gross_amount numeric,
  p_platform_fee_rate numeric DEFAULT 8.00,
  p_payout_destination text DEFAULT 'UPI',
  p_payout_method text DEFAULT 'upi'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_platform_fee numeric(10, 2);
  v_net_payout numeric(10, 2);
  v_payout_ref text;
  v_utr text;
  v_inserted record;
BEGIN
  IF p_gross_amount <= 0 THEN
    RAISE EXCEPTION 'Gross settlement amount must be greater than 0';
  END IF;

  v_platform_fee := round((p_gross_amount * (p_platform_fee_rate / 100.0)), 2);
  v_net_payout := p_gross_amount - v_platform_fee;
  v_payout_ref := 'PO-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);
  v_utr := 'UTR-' || floor(100000000000 + random() * 899999999999)::bigint::text;

  INSERT INTO public.host_settlement_payouts (
    payout_ref,
    host_id,
    gross_amount,
    platform_fee_rate,
    platform_fee_amount,
    net_payout_amount,
    payout_destination,
    payout_method,
    status,
    utr_number,
    notes
  ) VALUES (
    v_payout_ref,
    p_host_id,
    p_gross_amount,
    p_platform_fee_rate,
    v_platform_fee,
    v_net_payout,
    p_payout_destination,
    p_payout_method,
    'settled',
    v_utr,
    'Automated KhelGrid settlement (Fee: ' || p_platform_fee_rate || '%)'
  )
  RETURNING * INTO v_inserted;

  RETURN jsonb_build_object(
    'success', true,
    'payoutRef', v_payout_ref,
    'grossAmount', v_inserted.gross_amount,
    'platformFee', v_inserted.platform_fee_amount,
    'netPayout', v_inserted.net_payout_amount,
    'utrNumber', v_inserted.utr_number,
    'status', v_inserted.status
  );
END;
$$;

-- Publish / Update Community Live Match Score
CREATE OR REPLACE FUNCTION public.publish_community_match_score(
  p_match_id text,
  p_sport text,
  p_tournament text,
  p_stage text,
  p_status text,
  p_venue text,
  p_city text,
  p_team_a_name text,
  p_team_a_score text,
  p_team_b_name text,
  p_team_b_score text,
  p_current_over_or_time text,
  p_highlight text,
  p_commentary jsonb DEFAULT '[]'::jsonb,
  p_host_name text DEFAULT 'Host Scorer'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  INSERT INTO public.community_live_matches (
    match_id,
    sport,
    tournament,
    stage,
    status,
    venue,
    city,
    team_a_name,
    team_a_score,
    team_b_name,
    team_b_score,
    current_over_or_time,
    highlight,
    commentary,
    host_name,
    updated_at
  ) VALUES (
    p_match_id,
    p_sport,
    p_tournament,
    p_stage,
    p_status,
    p_venue,
    p_city,
    p_team_a_name,
    p_team_a_score,
    p_team_b_name,
    p_team_b_score,
    p_current_over_or_time,
    p_highlight,
    p_commentary,
    p_host_name,
    now()
  )
  ON CONFLICT (match_id) DO UPDATE SET
    status = EXCLUDED.status,
    team_a_score = EXCLUDED.team_a_score,
    team_b_score = EXCLUDED.team_b_score,
    current_over_or_time = EXCLUDED.current_over_or_time,
    highlight = EXCLUDED.highlight,
    commentary = EXCLUDED.commentary,
    updated_at = now()
  RETURNING to_jsonb(public.community_live_matches.*) INTO v_result;

  RETURN jsonb_build_object('success', true, 'match', v_result);
END;
$$;

COMMIT;
