-- Response Archive 스키마: 테이블 + 인덱스 + 트리거 + RLS

CREATE TABLE public.glyphs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  is_interrogative boolean NOT NULL DEFAULT false,
  fingerprint text NOT NULL,
  encoder_version smallint NOT NULL DEFAULT 1,
  is_public boolean NOT NULL DEFAULT true,
  model_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  feature_vector jsonb NOT NULL DEFAULT '{}'::jsonb,
  contour_primary text,
  contour_quadrant text,
  contour_label text,
  contribution_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT glyphs_fingerprint_unique UNIQUE (fingerprint)
);

CREATE TABLE public.glyph_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  glyph_id uuid NOT NULL REFERENCES public.glyphs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  context_tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT glyph_contributions_unique UNIQUE (glyph_id, user_id)
);

CREATE TABLE public.glyph_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  glyph_a_id uuid NOT NULL REFERENCES public.glyphs(id) ON DELETE CASCADE,
  glyph_b_id uuid NOT NULL REFERENCES public.glyphs(id) ON DELETE CASCADE,
  relation_type text NOT NULL CHECK (relation_type IN ('FORM','ECHO','CONTEXT','CONTAINS','VARIANT','SAME')),
  score real NOT NULL DEFAULT 0,
  score_components jsonb NOT NULL DEFAULT '{}'::jsonb,
  reasons text[] NOT NULL DEFAULT '{}',
  algorithm_version smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT glyph_relations_pair_type UNIQUE (glyph_a_id, glyph_b_id, relation_type),
  CONSTRAINT glyph_relations_order CHECK (glyph_a_id < glyph_b_id OR relation_type = 'CONTAINS')
);

CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  glyph_id uuid NOT NULL REFERENCES public.glyphs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookmarks_unique UNIQUE (user_id, glyph_id)
);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  glyph_id uuid NOT NULL REFERENCES public.glyphs(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('offensive','privacy','copyright','spam','other')),
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_glyphs_canonical ON public.glyphs(canonical_name);
CREATE INDEX idx_glyphs_public ON public.glyphs(is_public) WHERE is_public = true;
CREATE INDEX idx_glyphs_contour ON public.glyphs(contour_primary, contour_quadrant);
CREATE INDEX idx_contributions_user ON public.glyph_contributions(user_id);
CREATE INDEX idx_contributions_glyph ON public.glyph_contributions(glyph_id);
CREATE INDEX idx_relations_a ON public.glyph_relations(glyph_a_id);
CREATE INDEX idx_relations_b ON public.glyph_relations(glyph_b_id);
CREATE INDEX idx_bookmarks_user ON public.bookmarks(user_id);

-- updated_at 트리거
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER glyphs_updated_at
  BEFORE UPDATE ON public.glyphs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- contribution_count 자동 갱신 + 마지막 기여 삭제 시 is_public=false
CREATE OR REPLACE FUNCTION public.update_contribution_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.glyphs SET contribution_count = contribution_count + 1 WHERE id = NEW.glyph_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.glyphs
      SET contribution_count = contribution_count - 1,
          is_public = CASE
            WHEN (SELECT count(*) FROM public.glyph_contributions WHERE glyph_id = OLD.glyph_id) <= 1
            THEN false ELSE is_public END
      WHERE id = OLD.glyph_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER contribution_count_insert
  AFTER INSERT ON public.glyph_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_contribution_count();

CREATE TRIGGER contribution_count_delete
  AFTER DELETE ON public.glyph_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_contribution_count();

-- RLS
ALTER TABLE public.glyphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glyph_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glyph_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY glyphs_select ON public.glyphs FOR SELECT USING (is_public = true);
CREATE POLICY glyphs_insert ON public.glyphs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY glyphs_update ON public.glyphs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY contributions_select ON public.glyph_contributions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.glyphs WHERE id = glyph_id AND is_public = true));
CREATE POLICY contributions_insert ON public.glyph_contributions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY contributions_delete ON public.glyph_contributions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY relations_select ON public.glyph_relations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.glyphs WHERE id = glyph_a_id AND is_public = true)
    AND EXISTS (SELECT 1 FROM public.glyphs WHERE id = glyph_b_id AND is_public = true)
  );

CREATE POLICY bookmarks_select ON public.bookmarks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY bookmarks_insert ON public.bookmarks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY bookmarks_delete ON public.bookmarks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY reports_insert ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
