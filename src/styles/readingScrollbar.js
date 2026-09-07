/** Transparent reading surfaces; only the thumb takes a semantic palette color. */
export const readingScrollbarSx = (theme) => ({
  bgcolor: 'transparent', scrollbarWidth: 'thin',
  scrollbarColor: `${theme.palette.text.secondary} transparent`,
  '&::-webkit-scrollbar': { width: theme.editorial.readingScrollbar.size, height: theme.editorial.readingScrollbar.size, backgroundColor: 'transparent' },
  '&::-webkit-scrollbar-track, &::-webkit-scrollbar-corner': { backgroundColor: 'transparent' },
  '&::-webkit-scrollbar-thumb': { backgroundColor: 'text.secondary', borderRadius: theme.editorial.observationChip.borderRadius },
  '&::-webkit-scrollbar-thumb:hover': { backgroundColor: 'text.primary' },
});
