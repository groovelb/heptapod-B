import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { APP_PATHS, canvasEntry, legacyCanvasLocation } from './paths';
import { useNavigationSession } from './navigationSession';

const HeptapodHeroIntro = lazy(() => import('../components/templates/HeptapodHeroIntro'));
const HeptapodEncoderPage = lazy(() => import('../components/templates/HeptapodEncoderPage'));
const loadingView = <Box sx={ { minHeight: '100svh', display: 'grid', placeItems: 'center', bgcolor: 'custom.chamber.fog' } }>
  <CircularProgress sx={ { color: 'text.secondary' } } />
</Box>;

/** The hero reports completion; only this boundary knows the destination. */
export function LandingRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const complete = useCallback(() => navigate(APP_PATHS.canvas, { replace: true }), [navigate]);
  const legacy = legacyCanvasLocation(location);
  if (legacy) return <Navigate to={ legacy } replace />;
  return <Suspense fallback={ loadingView }><HeptapodHeroIntro onComplete={ complete } /></Suspense>;
}

/** Canvas mounts independently, without the video, scroll track or hero audio.
 * URL name/version changes remount only the encode session; locale changes do not.
 */
export function CanvasRoute({ client, audioActive = true }) {
  const { search } = useLocation();
  const entry = canvasEntry(search);
  return <CanvasSession key={ JSON.stringify(entry) } entry={ entry } client={ client } audioActive={ audioActive } />;
}

function CanvasSession({ entry, client, audioActive }) {
  const navigation = useNavigationSession();
  const key = JSON.stringify(entry);
  const [session] = useState(() => navigation?.canvas.get(key) || {});
  useEffect(() => { navigation?.canvas.set(key, session); }, [navigation, key, session]);
  return <Suspense fallback={ loadingView }><HeptapodEncoderPage { ...entry } client={ client } audioActive={ audioActive } session={ session } /></Suspense>;
}
