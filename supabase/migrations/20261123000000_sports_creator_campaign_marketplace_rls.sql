-- ============================================================================
-- KHELGRID SPORTS CREATOR CAMPAIGN MARKETPLACE & AUDITABLE REWARD LEDGER
-- Schema: Campaign Marketplace, Applications, Deliverables, Escrow, and RLS
-- Target: Supabase Free Tier Postgres (Lean memory footprint, high RLS isolation)
-- NOTE: Unapplied Phase 2 Migration Script (Preserves Safe Local Staging)
-- ============================================================================

BEGIN;

-- 1. CAMPAIGN ORGANISATIONS (Advertisers / Academies / Brands / Venues)
CREATE TABLE IF NOT EXISTS public.campaign_organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('academy', 'coach', 'venue', 'tournament', 'sports_brand', 'federation', 'khelgrid')),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    contact_email TEXT NOT NULL,
    authorised_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CREATOR PROFILES
CREATE TABLE IF NOT EXISTS public.creator_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    handle TEXT NOT NULL UNIQUE,
    bio TEXT,
    primary_sport TEXT NOT NULL,
    location_city TEXT NOT NULL,
    languages TEXT[] NOT NULL DEFAULT '{}',
    is_verified_creator BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CREATOR SOCIAL CHANNELS
CREATE TABLE IF NOT EXISTS public.creator_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'twitter', 'linkedin', 'facebook', 'other')),
    channel_url TEXT NOT NULL,
    handle TEXT NOT NULL,
    follower_count INT NOT NULL DEFAULT 0 CHECK (follower_count >= 0),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    purpose TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'academy_admissions',
        'coaching_clinic',
        'brand_story',
        'tournament_awareness',
        'venue_showcase',
        'opportunity_distribution'
    )),
    sport TEXT NOT NULL,
    location_city TEXT NOT NULL,
    language TEXT NOT NULL,
    organisation_id UUID REFERENCES public.campaign_organisations(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',
        'submitted',
        'in_review',
        'changes_requested',
        'published',
        'paused',
        'completed',
        'cancelled'
    )),
    compensation_model TEXT NOT NULL DEFAULT 'fixed_deliverable' CHECK (compensation_model IN (
        'fixed_deliverable',
        'performance_bonus',
        'hybrid',
        'product_gifting'
    )),
    per_deliverable_fee_paise BIGINT NOT NULL CHECK (per_deliverable_fee_paise >= 0),
    total_budget_paise BIGINT NOT NULL CHECK (total_budget_paise >= 0),
    key_messages TEXT[] NOT NULL DEFAULT '{}',
    prohibited_claims TEXT[] NOT NULL DEFAULT '{}',
    target_audience TEXT NOT NULL,
    required_channels TEXT[] NOT NULL DEFAULT '{}',
    terms_and_conditions TEXT NOT NULL,
    moderation_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    deadline_at TIMESTAMPTZ NOT NULL
);

-- Partial index for active campaigns on public marketplace (lean memory)
CREATE INDEX IF NOT EXISTS idx_campaigns_published_marketplace
    ON public.campaigns (category, sport, per_deliverable_fee_paise)
    WHERE status = 'published';

-- 5. CAMPAIGN DELIVERABLE SPECS
CREATE TABLE IF NOT EXISTS public.campaign_deliverable_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'instagram_reel',
        'instagram_story_series',
        'youtube_short',
        'youtube_video',
        'event_attendance_story',
        'community_post'
    )),
    title TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    description TEXT NOT NULL,
    format_spec TEXT,
    required_hashtags TEXT[] NOT NULL DEFAULT '{}',
    mandatory_disclosure TEXT NOT NULL DEFAULT '#Ad #KhelGrid',
    deadline_days INT NOT NULL DEFAULT 7 CHECK (deadline_days > 0)
);

-- 6. CAMPAIGN APPLICATIONS
CREATE TABLE IF NOT EXISTS public.campaign_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    follower_count INT NOT NULL DEFAULT 0 CHECK (follower_count >= 0),
    portfolio_link TEXT,
    pitch_note TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
        'submitted',
        'shortlisted',
        'accepted',
        'declined',
        'withdrawn'
    )),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    UNIQUE(campaign_id, creator_id)
);

-- 7. CAMPAIGN ASSIGNMENTS (Creator contracted to fulfill deliverables)
CREATE TABLE IF NOT EXISTS public.campaign_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE RESTRICT,
    application_id UUID NOT NULL REFERENCES public.campaign_applications(id) ON DELETE RESTRICT,
    committed_paise BIGINT NOT NULL CHECK (committed_paise >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'active',
        'completed',
        'disputed',
        'cancelled'
    )),
    terms_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(campaign_id, creator_id)
);

-- 8. CONTENT SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.content_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
    creator_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE RESTRICT,
    deliverable_spec_id UUID NOT NULL REFERENCES public.campaign_deliverable_specs(id) ON DELETE RESTRICT,
    canonical_post_url TEXT NOT NULL,
    platform TEXT NOT NULL,
    evidence_screenshot_url TEXT,
    disclosure_verified BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
        'submitted',
        'under_review',
        'revision_requested',
        'accepted',
        'rejected',
        'disputed'
    )),
    review_notes TEXT,
    reward_amount_paise BIGINT NOT NULL CHECK (reward_amount_paise >= 0),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ
);

-- 9. CREATOR REWARD LEDGER (Strict append-only financial records in integer paise)
CREATE TABLE IF NOT EXISTS public.creator_reward_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE RESTRICT,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
    deliverable_submission_id UUID REFERENCES public.content_submissions(id) ON DELETE RESTRICT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise >= 0),
    currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
        'not_eligible',
        'pending_review',
        'approved',
        'on_hold',
        'payable',
        'paid',
        'reversed',
        'disputed'
    )),
    description TEXT NOT NULL,
    payout_lockdown_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Revoke destructive updates on financial ledger (append-only principle)
REVOKE DELETE, TRUNCATE ON public.creator_reward_ledger FROM public, anon, authenticated;

-- 10. CAMPAIGN DISPUTES (3-Way Arbitration)
CREATE TABLE IF NOT EXISTS public.campaign_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
    submission_id UUID NOT NULL REFERENCES public.content_submissions(id) ON DELETE RESTRICT,
    raised_by TEXT NOT NULL CHECK (raised_by IN ('creator', 'advertiser')),
    reason TEXT NOT NULL,
    statement TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved')),
    resolution TEXT CHECK (resolution IN ('creator_favored', 'advertiser_favored', 'split')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. CAMPAIGN AUDIT EVENTS
CREATE TABLE IF NOT EXISTS public.campaign_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- ESCROW BUDGET INTEGRITY TRIGGER
-- Prevents creator commitments from exceeding the advertiser's total funded budget
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_campaign_escrow_budget_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_budget BIGINT;
    v_total_committed BIGINT;
BEGIN
    SELECT total_budget_paise INTO v_total_budget
    FROM public.campaigns
    WHERE id = NEW.campaign_id;

    SELECT COALESCE(SUM(committed_paise), 0) INTO v_total_committed
    FROM public.campaign_assignments
    WHERE campaign_id = NEW.campaign_id
      AND status != 'cancelled';

    IF (v_total_committed + NEW.committed_paise) > v_total_budget THEN
        RAISE EXCEPTION 'Creator commitments (paise: %) exceed total funded campaign budget (paise: %)',
            (v_total_committed + NEW.committed_paise), v_total_budget;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_campaign_escrow_limit ON public.campaign_assignments;
CREATE TRIGGER trg_enforce_campaign_escrow_limit
    BEFORE INSERT OR UPDATE ON public.campaign_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.check_campaign_escrow_budget_limit();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) & LEAST-PRIVILEGE GRANTS
-- ============================================================================
ALTER TABLE public.campaign_organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_deliverable_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_reward_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.campaign_organisations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.creator_profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.creator_channels FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.campaigns FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.campaign_deliverable_specs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.campaign_applications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.campaign_assignments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.content_submissions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.creator_reward_ledger FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.campaign_disputes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.campaign_audit_events FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.campaigns TO anon, authenticated;
GRANT SELECT ON public.campaign_deliverable_specs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.campaign_organisations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.creator_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_channels TO authenticated;
GRANT INSERT, UPDATE ON public.campaigns TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campaign_deliverable_specs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.campaign_applications TO authenticated;
GRANT SELECT ON public.campaign_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.content_submissions TO authenticated;
GRANT SELECT, INSERT ON public.creator_reward_ledger TO authenticated;

-- 1. Public Read for Published Campaigns
DROP POLICY IF EXISTS "Public read published campaigns" ON public.campaigns;
CREATE POLICY "Public read published campaigns"
    ON public.campaigns FOR SELECT TO anon, authenticated
    USING (status = 'published');

-- 2. Public Read for Deliverable Specs of Published Campaigns
DROP POLICY IF EXISTS "Public read deliverable specs for published campaigns" ON public.campaign_deliverable_specs;
CREATE POLICY "Public read deliverable specs for published campaigns"
    ON public.campaign_deliverable_specs FOR SELECT TO anon, authenticated
    USING (EXISTS (
        SELECT 1 FROM public.campaigns c
        WHERE c.id = campaign_deliverable_specs.campaign_id AND c.status = 'published'
    ));

-- 3. Creators Read/Manage Own Profile & Channels
DROP POLICY IF EXISTS "Creators manage own profile" ON public.creator_profiles;
CREATE POLICY "Creators manage own profile"
    ON public.creator_profiles FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Creators manage own channels" ON public.creator_channels;
CREATE POLICY "Creators manage own channels"
    ON public.creator_channels FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.creator_profiles cp
        WHERE cp.id = creator_channels.creator_id AND cp.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.creator_profiles cp
        WHERE cp.id = creator_channels.creator_id AND cp.user_id = auth.uid()
    ));

-- 4. Creators View and Submit Applications
DROP POLICY IF EXISTS "Creators manage own applications" ON public.campaign_applications;
CREATE POLICY "Creators manage own applications"
    ON public.campaign_applications FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.creator_profiles cp
        WHERE cp.id = campaign_applications.creator_id AND cp.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.creator_profiles cp
        WHERE cp.id = campaign_applications.creator_id AND cp.user_id = auth.uid()
    ));

-- 5. Creators View Own Assignments & Submissions
DROP POLICY IF EXISTS "Creators view own assignments" ON public.campaign_assignments;
CREATE POLICY "Creators view own assignments"
    ON public.campaign_assignments FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.creator_profiles cp
        WHERE cp.id = campaign_assignments.creator_id AND cp.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Creators manage own submissions" ON public.content_submissions;
CREATE POLICY "Creators manage own submissions"
    ON public.content_submissions FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.creator_profiles cp
        WHERE cp.id = content_submissions.creator_id AND cp.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.creator_profiles cp
        WHERE cp.id = content_submissions.creator_id AND cp.user_id = auth.uid()
    ));

-- 6. Creators View Own Reward Ledger Entries
DROP POLICY IF EXISTS "Creators view own reward ledger" ON public.creator_reward_ledger;
CREATE POLICY "Creators view own reward ledger"
    ON public.creator_reward_ledger FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.creator_profiles cp
        WHERE cp.id = creator_reward_ledger.creator_id AND cp.user_id = auth.uid()
    ));

-- 7. Advertisers Manage Own Campaigns & Deliverable Specs
DROP POLICY IF EXISTS "Advertisers manage own campaigns" ON public.campaigns;
CREATE POLICY "Advertisers manage own campaigns"
    ON public.campaigns FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.campaign_organisations co
        WHERE co.id = campaigns.organisation_id AND co.authorised_user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.campaign_organisations co
        WHERE co.id = campaigns.organisation_id AND co.authorised_user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Advertisers view applications to their campaigns" ON public.campaign_applications;
CREATE POLICY "Advertisers view applications to their campaigns"
    ON public.campaign_applications FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.campaigns c
        JOIN public.campaign_organisations co ON co.id = c.organisation_id
        WHERE c.id = campaign_applications.campaign_id AND co.authorised_user_id = auth.uid()
    ));

COMMIT;
