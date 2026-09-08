import { createContext, useContext } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const RenderScope = createContext('responsive');

/** The selected person's entire detail retains live forms, including fragments. */
export default function GlyphRenderScope({ mode = 'live', children }) {
  return <RenderScope.Provider value={ mode }>{ children }</RenderScope.Provider>;
}

// The policy hook intentionally shares its private context with the provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useStaticGlyphRendering() {
  const scope = useContext(RenderScope);
  const theme = useTheme();
  // A server without viewport knowledge must never briefly mount mobile Canvas.
  // noSsr reads the real viewport on the first client render.
  const mobile = useMediaQuery(theme.breakpoints.down('md'), { defaultMatches: true, noSsr: true });
  return scope === 'static' || (scope !== 'live' && mobile);
}
