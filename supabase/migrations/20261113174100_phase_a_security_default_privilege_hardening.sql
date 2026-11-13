-- Phase A: secure-by-default grants for the exposed public schema.
-- Preserve the existing row-level policies and restore only the table privileges
-- required by the current public client and authenticated owner/moderator flows.
-- Internal SECURITY DEFINER helpers are not public RPC endpoints.
BEGIN;

-- Remove inherited/default broad table privileges. RLS remains the row boundary;
-- these grants additionally enforce least privilege at the SQL object boundary.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public
  FROM PUBLIC, anon, authenticated;

-- Public read-only catalogue and published content.
GRANT SELECT ON TABLE
  public.academies,
  public.academy_sports,
  public.coach_academies,
  public.coach_sports,
  public.coaches,
  public.chronicle_categories,
  public.chronicle_papers,
  public.cities,
  public.events,
  public.opportunities,
  public.pickup_games,
  public.site_announcements,
  public.sports,
  public.venue_courts,
  public.venues
TO anon, authenticated;

-- Authenticated owner and moderator reads.
GRANT SELECT ON TABLE
  public.athlete_profiles,
  public.khelgrid_payments,
  public.listing_moderators,
  public.listing_submissions,
  public.listing_subscriptions,
  public.profiles,
  public.trial_reminders,
  public.venue_bookings
TO authenticated;

-- Explicitly supported intake writes; RLS policies continue to validate rows.
GRANT INSERT ON TABLE
  public.chronicle_submissions,
  public.listing_reports,
  public.listing_submissions,
  public.trial_reminders,
  public.verification_claims
TO anon, authenticated;

-- Authenticated self-service profile writes and moderator review updates.
GRANT INSERT, UPDATE ON TABLE public.profiles, public.athlete_profiles
TO authenticated;
GRANT UPDATE ON TABLE public.listing_submissions TO authenticated;

-- Grant USAGE only at this initial step for generated identifiers used by public
-- intake paths. The immediately following correction migration narrows this to
-- zero browser sequence privileges after confirming all current IDs are UUIDs.
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public
  FROM PUBLIC, anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Make future objects secure by default for migrations executed as postgres.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Host/admin-only operations must not be callable by anonymous API clients.
REVOKE ALL ON FUNCTION public.admin_moderate_pickup_game(text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_pickup_game(text, text, text)
  TO authenticated;
REVOKE ALL ON FUNCTION public.approve_pickup_game_whatsapp_invite(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_pickup_game_whatsapp_invite(uuid)
  TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_pickup_game_as_host(text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_pickup_game_as_host(text, text)
  TO authenticated;
REVOKE ALL ON FUNCTION public.complete_pickup_game_as_host(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_pickup_game_as_host(text)
  TO authenticated;
REVOKE ALL ON FUNCTION public.get_host_pickup_games()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_host_pickup_games()
  TO authenticated;
REVOKE ALL ON FUNCTION public.reopen_pickup_game_as_host(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reopen_pickup_game_as_host(text)
  TO authenticated;
REVOKE ALL ON FUNCTION public.reschedule_pickup_game(text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_pickup_game(text, text, text, text)
  TO authenticated;
REVOKE ALL ON FUNCTION public.update_pickup_game_capacity(text, integer, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_pickup_game_capacity(text, integer, text)
  TO authenticated;
REVOKE ALL ON FUNCTION public.update_pickup_game_details(text, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_pickup_game_details(text, text, text, text, text)
  TO authenticated;

-- Authorization predicates are needed by authenticated RLS policies, but are
-- not standalone anonymous endpoints.
REVOKE ALL ON FUNCTION public.is_pickup_game_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pickup_game_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.is_service_role_or_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_service_role_or_admin() TO authenticated;

-- Trigger/internal/diagnostic helpers are invoked by trusted database code only.
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_athlete_profile_user_id_change()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_listing_subscription_activation_window()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_security_schema_migrations()
  FROM PUBLIC, anon, authenticated;

COMMIT;
