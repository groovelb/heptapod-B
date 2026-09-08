-- Derived image data only. Stored glyph models remain untouched.
CREATE TABLE public.glyph_image_jobs (
  glyph_id uuid PRIMARY KEY REFERENCES public.glyphs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','failed','unsupported')),
  model_hash text CHECK (model_hash IS NULL OR model_hash ~ '^[a-f0-9]{64}$'),
  renderer_version integer NOT NULL DEFAULT 1,
  variants jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  lease_token uuid,
  lease_until timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.glyph_image_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.glyph_image_jobs FROM anon, authenticated;
GRANT SELECT (glyph_id,status,model_hash,renderer_version,variants,updated_at) ON public.glyph_image_jobs TO anon, authenticated;
GRANT ALL ON public.glyph_image_jobs TO service_role;
CREATE POLICY glyph_images_public_state ON public.glyph_image_jobs FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.glyphs g WHERE g.id = glyph_id AND g.is_public));
CREATE INDEX glyph_image_jobs_pending ON public.glyph_image_jobs (next_attempt_at, glyph_id)
WHERE status IN ('pending','failed','processing');

-- The publication transaction itself enqueues work, so request cancellation
-- cannot lose an image job. Model/public changes invalidate in-flight leases.
CREATE FUNCTION public.queue_glyph_image() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '' AS $$
BEGIN
  IF NOT NEW.is_public THEN
    DELETE FROM public.glyph_image_jobs WHERE glyph_id = NEW.id;
  ELSIF TG_OP = 'INSERT' OR OLD.is_public IS DISTINCT FROM NEW.is_public OR OLD.model_data IS DISTINCT FROM NEW.model_data THEN
    INSERT INTO public.glyph_image_jobs (glyph_id) VALUES (NEW.id)
    ON CONFLICT (glyph_id) DO UPDATE SET status='pending', model_hash=NULL, renderer_version=1,
      variants='{}'::jsonb, attempts=0, lease_token=NULL, lease_until=NULL,
      next_attempt_at=now(), error=NULL, updated_at=now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_glyph_image() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER glyph_image_queue AFTER INSERT OR UPDATE OF model_data,is_public ON public.glyphs
FOR EACH ROW EXECUTE FUNCTION public.queue_glyph_image();

CREATE FUNCTION public.claim_glyph_image_jobs(p_limit integer DEFAULT 2)
RETURNS SETOF public.glyph_image_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.glyph_image_jobs SET status='failed', lease_token=NULL, lease_until=NULL, error='lease_expired', updated_at=now()
  WHERE status='processing' AND lease_until < now() AND attempts >= 5;
  RETURN QUERY
  WITH candidates AS (
    SELECT j.glyph_id FROM public.glyph_image_jobs j
    JOIN public.glyphs g ON g.id=j.glyph_id AND g.is_public
    WHERE j.attempts < 5 AND (
      (j.status IN ('pending','failed') AND j.next_attempt_at <= now()) OR
      (j.status='processing' AND j.lease_until < now()))
    ORDER BY j.next_attempt_at,j.glyph_id
    FOR UPDATE OF j SKIP LOCKED
    LIMIT greatest(1,least(coalesce(p_limit,2),4))
  )
  UPDATE public.glyph_image_jobs j SET status='processing', attempts=j.attempts+1,
    lease_token=gen_random_uuid(), lease_until=now()+interval '5 minutes', updated_at=now()
  FROM candidates c WHERE j.glyph_id=c.glyph_id RETURNING j.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_glyph_image_jobs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_glyph_image_jobs(integer) TO service_role;

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('glyph-images','glyph-images',false,1048576,ARRAY['image/png'])
ON CONFLICT (id) DO NOTHING;
-- Only generated current variants of currently public glyphs are readable.
-- Storage is private; no public bucket URL or reusable signed URL is issued.
CREATE POLICY glyph_images_ready_objects ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id='glyph-images' AND EXISTS (
  SELECT 1 FROM public.glyph_image_jobs j JOIN public.glyphs g ON g.id=j.glyph_id
  WHERE g.is_public AND j.status='ready' AND j.renderer_version=1
    AND (name=j.variants->'256'->>'path' OR name=j.variants->'512'->>'path')
));

INSERT INTO public.glyph_image_jobs (glyph_id)
SELECT id FROM public.glyphs WHERE is_public ON CONFLICT DO NOTHING;
