-- anon 역할도 공개 glyphs/relations/contributions SELECT 허용

DROP POLICY IF EXISTS glyphs_select ON public.glyphs;
CREATE POLICY glyphs_select ON public.glyphs FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS contributions_select ON public.glyph_contributions;
CREATE POLICY contributions_select ON public.glyph_contributions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.glyphs WHERE id = glyph_id AND is_public = true)
);

DROP POLICY IF EXISTS relations_select ON public.glyph_relations;
CREATE POLICY relations_select ON public.glyph_relations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.glyphs WHERE id = glyph_a_id AND is_public = true)
  AND EXISTS (SELECT 1 FROM public.glyphs WHERE id = glyph_b_id AND is_public = true)
);
