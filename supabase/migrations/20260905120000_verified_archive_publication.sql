-- Verified publication v2. Existing models, ownerless rows and legacy duplicates are preserved.
ALTER TABLE public.glyph_contributions
  ADD COLUMN consent_version smallint NOT NULL DEFAULT 1,
  ADD COLUMN consented_at timestamptz,
  ADD COLUMN withdrawn_at timestamptz,
  ADD CONSTRAINT contributions_v2_owner CHECK (
    consent_version < 2 OR (user_id IS NOT NULL AND consented_at IS NOT NULL)
  );

CREATE UNIQUE INDEX contributions_active_owner_v2
  ON public.glyph_contributions (glyph_id, user_id)
  WHERE consent_version = 2 AND withdrawn_at IS NULL;
CREATE INDEX contributions_owner_recent ON public.glyph_contributions (user_id, created_at DESC);
CREATE INDEX glyphs_public_recent ON public.glyphs (created_at DESC, id DESC) WHERE is_public;

ALTER TABLE public.glyph_relations
  ADD COLUMN evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN computed_at timestamptz,
  ADD COLUMN evidence_source text NOT NULL DEFAULT 'legacy-stored';

DROP POLICY IF EXISTS glyphs_insert ON public.glyphs;
DROP POLICY IF EXISTS glyphs_update ON public.glyphs;
DROP POLICY IF EXISTS contributions_insert ON public.glyph_contributions;
DROP POLICY IF EXISTS contributions_delete ON public.glyph_contributions;
DROP POLICY IF EXISTS contributions_select ON public.glyph_contributions;
CREATE POLICY contributions_select_own ON public.glyph_contributions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.glyphs, public.glyph_contributions, public.glyph_relations FROM anon, authenticated;
GRANT SELECT ON public.glyphs, public.glyph_relations TO anon, authenticated;
REVOKE SELECT ON public.glyph_contributions FROM anon;
GRANT SELECT ON public.glyph_contributions TO authenticated;

-- AFTER DELETE sees the rows that remain: zero, not <= 1, means the final response left.
CREATE OR REPLACE FUNCTION public.update_contribution_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  affected_id uuid;
  remaining integer;
BEGIN
  affected_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.glyph_id ELSE NEW.glyph_id END;
  PERFORM 1 FROM public.glyphs WHERE id = affected_id FOR UPDATE;
  SELECT count(*) INTO remaining FROM public.glyph_contributions
    WHERE glyph_id = affected_id AND withdrawn_at IS NULL;
  UPDATE public.glyphs SET contribution_count = remaining,
    is_public = CASE WHEN remaining = 0 THEN false ELSE is_public END
    WHERE id = affected_id;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER contribution_count_withdraw
  AFTER UPDATE OF withdrawn_at ON public.glyph_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_contribution_count();
REVOKE ALL ON FUNCTION public.update_contribution_count() FROM PUBLIC, anon, authenticated;

-- Only the verified Edge Function's service-role client may invoke these RPCs.
CREATE FUNCTION public.archive_publish_verified(
  p_owner_id uuid, p_glyph jsonb, p_display_name text,
  p_context_tags text[] DEFAULT '{}', p_consented boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  selected_glyph public.glyphs;
  is_new boolean := false;
  inserted_id uuid;
BEGIN
  IF p_consented IS DISTINCT FROM true OR p_owner_id IS NULL THEN
    RAISE EXCEPTION 'Explicit consent and a verified owner are required' USING ERRCODE = '22023';
  END IF;
  IF p_display_name IS NULL OR length(btrim(p_display_name)) = 0 OR length(p_display_name) > 512
    OR cardinality(p_context_tags) > 3
    OR EXISTS (SELECT 1 FROM unnest(p_context_tags) tag WHERE tag IS NULL OR length(tag) > 32 OR length(btrim(tag)) = 0)
    OR COALESCE(p_glyph->>'fingerprint', '') !~ '^[0-9a-f]{64}$'
    OR COALESCE((p_glyph->>'encoderVersion')::integer, 0) <> 2
    OR COALESCE(jsonb_typeof(p_glyph->'modelData'), '') <> 'object'
    OR COALESCE(p_glyph->>'canonicalName', '') = '' THEN
    RAISE EXCEPTION 'Invalid archive payload' USING ERRCODE = '22023';
  END IF;
  -- Serialize each owner and each fingerprint; concurrent retries remain idempotent.
  PERFORM pg_advisory_xact_lock(hashtextextended('archive-owner:' || p_owner_id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('archive-glyph:' || (p_glyph->>'fingerprint'), 0));
  SELECT * INTO selected_glyph FROM public.glyphs WHERE fingerprint = p_glyph->>'fingerprint' FOR UPDATE;
  IF FOUND AND NOT selected_glyph.is_public AND EXISTS (SELECT 1 FROM public.glyph_contributions
      WHERE glyph_id = selected_glyph.id AND withdrawn_at IS NULL) THEN
    RAISE EXCEPTION 'This response is not available for publication' USING ERRCODE = '42501';
  END IF;
  IF FOUND AND EXISTS (SELECT 1 FROM public.glyph_contributions
      WHERE glyph_id = selected_glyph.id AND user_id = p_owner_id AND withdrawn_at IS NULL) THEN
    RETURN jsonb_build_object('glyphId', selected_glyph.id, 'isNew', false, 'mappingStatus', 'on-demand');
  END IF;
  IF (SELECT count(*) FROM public.glyph_contributions WHERE user_id = p_owner_id
      AND consent_version = 2 AND created_at > now() - interval '1 hour') >= 20 THEN
    RAISE EXCEPTION 'Publication limit reached; please try again later' USING ERRCODE = 'P0001';
  END IF;
  IF selected_glyph.id IS NULL THEN
    INSERT INTO public.glyphs (canonical_name, is_interrogative, fingerprint, encoder_version,
      model_data, feature_vector, contour_primary, contour_quadrant, contour_label, is_public)
    VALUES (p_glyph->>'canonicalName', (p_glyph->>'isInterrogative')::boolean,
      p_glyph->>'fingerprint', (p_glyph->>'encoderVersion')::smallint,
      p_glyph->'modelData', p_glyph->'featureVector', p_glyph#>>'{contour,primary}',
      p_glyph#>>'{contour,quadrant}', p_glyph#>>'{contour,label}', true)
    RETURNING * INTO selected_glyph;
    is_new := true;
  END IF;
  INSERT INTO public.glyph_contributions
    (glyph_id, user_id, display_name, context_tags, consent_version, consented_at)
  VALUES (selected_glyph.id, p_owner_id, p_display_name, COALESCE(p_context_tags, '{}'), 2, now())
  RETURNING id INTO inserted_id;
  UPDATE public.glyphs SET is_public = true WHERE id = selected_glyph.id;
  RETURN jsonb_build_object('glyphId', selected_glyph.id, 'isNew', is_new,
    'contributionId', inserted_id, 'mappingStatus', 'on-demand');
END;
$$;

CREATE FUNCTION public.archive_unpublish_verified(p_owner_id uuid, p_glyph_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  changed integer;
  remains_public boolean;
BEGIN
  IF p_owner_id IS NULL THEN RAISE EXCEPTION 'Verified owner required' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('archive-owner:' || p_owner_id::text, 0));
  PERFORM 1 FROM public.glyphs WHERE id = p_glyph_id FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.glyph_contributions WHERE glyph_id = p_glyph_id AND user_id = p_owner_id) THEN
    RAISE EXCEPTION 'Your response was not found' USING ERRCODE = '42501';
  END IF;
  UPDATE public.glyph_contributions SET withdrawn_at = now()
    WHERE glyph_id = p_glyph_id AND user_id = p_owner_id AND withdrawn_at IS NULL;
  GET DIAGNOSTICS changed = ROW_COUNT;
  SELECT is_public INTO remains_public FROM public.glyphs WHERE id = p_glyph_id;
  RETURN jsonb_build_object('glyphId', p_glyph_id, 'withdrawnCount', changed,
    'isPublic', COALESCE(remains_public, false));
END;
$$;

REVOKE ALL ON FUNCTION public.archive_publish_verified(uuid, jsonb, text, text[], boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.archive_unpublish_verified(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_publish_verified(uuid, jsonb, text, text[], boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.archive_unpublish_verified(uuid, uuid) TO service_role;
