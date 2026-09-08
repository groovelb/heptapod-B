import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { LandingRoute, CanvasRoute } from './EncoderRoutes';
import { APP_PATHS } from './paths';
import NavigationSessionProvider from './NavigationSessionProvider';
import AppGNB from '../components/navigation/AppGNB';

const GlyphDetailPage = lazy(() => import('../components/templates/GlyphDetailPage'));
const ResonanceFieldPage = lazy(() => import('../components/templates/ResonanceFieldPage'));
const MyArchivePage = lazy(() => import('../components/templates/MyArchivePage'));
const ArchiveComparePage = lazy(() => import('../components/templates/ArchiveComparePage'));

const RouteFallback = () => (
  <Box sx={ { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'custom.chamber.fog' } }>
    <AppGNB overlay />
    <CircularProgress sx={ { color: 'text.secondary' } } />
  </Box>
);

/** Route ownership is independent of the app's theme, locale and Lenis lifetime. */
export default function AppRoutes({ withSession = true }) {
  const routes = <Routes>
    <Route path={ APP_PATHS.landing } element={ <LandingRoute /> } />
    <Route path={ APP_PATHS.canvas } element={ <CanvasRoute /> } />
    <Route path={ APP_PATHS.archive } element={ <Suspense fallback={ <RouteFallback /> }><MyArchivePage /></Suspense> } />
    <Route path="/glyph/:id" element={ <Suspense fallback={ <RouteFallback /> }><GlyphDetailPage /></Suspense> } />
    <Route path="/field/:id" element={ <Suspense fallback={ <RouteFallback /> }><ResonanceFieldPage /></Suspense> } />
    <Route path="/compare/:leftId/:rightId?" element={ <Suspense fallback={ <RouteFallback /> }><ArchiveComparePage /></Suspense> } />
    <Route path="/me" element={ <Navigate to={ APP_PATHS.archive } replace /> } />
  </Routes>;
  return withSession ? <NavigationSessionProvider>{ routes }</NavigationSessionProvider> : routes;
}
