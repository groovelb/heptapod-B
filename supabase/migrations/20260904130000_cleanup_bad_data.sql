-- 잘못된 fingerprint 데이터 정리
DELETE FROM public.glyph_contributions WHERE glyph_id IN (
  SELECT id FROM public.glyphs WHERE fingerprint = 'v1-[OBJECT OBJECT]'
);
DELETE FROM public.glyphs WHERE fingerprint = 'v1-[OBJECT OBJECT]';
