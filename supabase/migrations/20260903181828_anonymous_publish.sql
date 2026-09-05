-- 익명 게시 허용: 로그인 없이 publish 가능

-- user_id nullable
ALTER TABLE public.glyph_contributions ALTER COLUMN user_id DROP NOT NULL;

-- unique 제약 재설정 (nullable user_id 대응)
ALTER TABLE public.glyph_contributions DROP CONSTRAINT glyph_contributions_unique;

-- anon도 insert 허용
DROP POLICY IF EXISTS glyphs_insert ON public.glyphs;
CREATE POLICY glyphs_insert ON public.glyphs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS glyphs_update ON public.glyphs;
CREATE POLICY glyphs_update ON public.glyphs FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS contributions_insert ON public.glyph_contributions;
CREATE POLICY contributions_insert ON public.glyph_contributions FOR INSERT WITH CHECK (true);
