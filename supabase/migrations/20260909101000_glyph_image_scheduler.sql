-- Durable periodic processing. No worker invocation when the queue is empty.
-- https://supabase.com/docs/guides/functions/schedule-functions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

CREATE FUNCTION public.dispatch_glyph_image_jobs() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE endpoint text; worker_secret text; request_id bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.glyph_image_jobs j JOIN public.glyphs g ON g.id=j.glyph_id
    WHERE g.is_public AND ((j.attempts<5 AND j.status IN ('pending','failed') AND j.next_attempt_at<=now())
      OR (j.status='processing' AND j.lease_until<now()))) THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO endpoint FROM vault.decrypted_secrets WHERE name='glyph_image_worker_url';
  SELECT decrypted_secret INTO worker_secret FROM vault.decrypted_secrets WHERE name='glyph_image_worker_secret';
  IF endpoint IS NULL OR worker_secret IS NULL THEN RETURN NULL; END IF;
  SELECT net.http_post(url:=endpoint, headers:=jsonb_build_object('Content-Type','application/json','x-glyph-worker-secret',worker_secret),
    body:='{"limit":2}'::jsonb, timeout_milliseconds:=30000) INTO request_id;
  RETURN request_id;
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_glyph_image_jobs() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_glyph_image_jobs() TO service_role;

-- Provision only through a server-role call. Secrets never enter a migration,
-- browser bundle, job command, or returned payload.
CREATE FUNCTION public.configure_glyph_image_worker(p_url text,p_secret text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE secret_id uuid;
BEGIN
  IF p_url IS NULL OR p_secret IS NULL OR p_url !~ '^https://[a-z0-9]+[.]supabase[.]co/functions/v1/archive-glyph-image-worker$'
    OR length(p_secret)<32 OR length(p_secret)>256 THEN RAISE EXCEPTION 'Invalid worker configuration'; END IF;
  SELECT id INTO secret_id FROM vault.secrets WHERE name='glyph_image_worker_url';
  IF secret_id IS NULL THEN PERFORM vault.create_secret(p_url,'glyph_image_worker_url');
  ELSE PERFORM vault.update_secret(secret_id,p_url); END IF;
  SELECT id INTO secret_id FROM vault.secrets WHERE name='glyph_image_worker_secret';
  IF secret_id IS NULL THEN PERFORM vault.create_secret(p_secret,'glyph_image_worker_secret');
  ELSE PERFORM vault.update_secret(secret_id,p_secret); END IF;
  PERFORM cron.schedule('glyph-images-every-minute','* * * * *','select public.dispatch_glyph_image_jobs();');
END;
$$;
REVOKE ALL ON FUNCTION public.configure_glyph_image_worker(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.configure_glyph_image_worker(text,text) TO service_role;
