import { useEffect } from 'react';
import { Link, useInRouterContext, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';
import VolumeOffOutlinedIcon from '@mui/icons-material/VolumeOffOutlined';
import { GNB, useGNB } from './GNB';
import { useI18n } from '../../i18n/useI18n';
import { useNavigationSession, navigationSection } from '../../routes/navigationSession';
import { APP_PATHS } from '../../routes/paths';

const HEIGHT = { xs: 'calc(64px + env(safe-area-inset-top, 0px))', md: 'calc(80px + env(safe-area-inset-top, 0px))' };
const linkSx = {
  minHeight: 44, color: 'inherit', borderRadius: 0, textTransform: 'none', fontSize: 13,
  fontFamily: (theme) => theme.typography.custom.mono.fontFamily, letterSpacing: '0.04em',
  '&.Mui-focusVisible': { outline: '1px solid currentColor', outlineOffset: -2 },
};

function NavigationLinks({ pathname, targets, routed }) {
  const { t } = useI18n();
  const { isMobile, closeDrawer } = useGNB();
  const active = navigationSection(pathname);
  return <Box component="nav" aria-label={ t('appNav.navigation') } sx={ { display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, py: isMobile ? 3 : 0 } }>
    { ['story', 'create', 'archive'].map((section) => <Button key={ section }
      component={ routed ? Link : 'a' } { ...(routed ? { to: targets[section] } : { href: targets[section] }) }
      aria-current={ active === section ? 'page' : undefined }
      onClick={ (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (pathname === APP_PATHS.landing && section === 'story'
          || pathname === APP_PATHS.canvas && section === 'create'
          || pathname === APP_PATHS.archive && section === 'archive') event.preventDefault();
        closeDrawer();
      } }
      sx={ { ...linkSx, justifyContent: isMobile ? 'flex-start' : 'center', px: 1,
        minHeight: isMobile ? 88 : 44, opacity: active === section ? 1 : 0.65,
        ...(isMobile && { fontSize: 'clamp(40px, 12vw, 72px)', lineHeight: 1.2, letterSpacing: '-0.04em', py: 2 }),
        textDecoration: active === section ? 'underline' : 'none', textUnderlineOffset: '8px',
        '&:hover': { opacity: 1, textDecoration: active === section ? 'underline' : 'none', bgcolor: 'action.hover' },
      } }>{ t(`appNav.${section}`) }</Button>) }
  </Box>;
}

function NavigationView({ pathname = '/', locationKey = 'preview', routed = false, targets, overlay = false, tone = 'light', soundOn = true, soundLoading = false, onToggleSound, children }) {
  const { t } = useI18n();
  const dark = tone === 'dark';
  const colors = { color: dark ? 'text.primary' : 'custom.chamber.ink', bgcolor: dark ? 'background.paper' : 'custom.chamber.fog' };
  return <>
    <GNB isFixed height={ HEIGHT } resetKey={ locationKey } drawerWidth={ 320 } hasBorder={ false }
      logo={ <Button component={ routed ? Link : 'a' } { ...(routed ? { to: '/' } : { href: '/' }) }
        aria-label={ t('appNav.home') }
        onClick={ (event) => { if (pathname === '/' && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) event.preventDefault(); } }
        sx={ { ...linkSx, minWidth: 0, px: 0, fontSize: { xs: 12, sm: 14 }, letterSpacing: '0.12em', fontFamily: "'Cinzel', 'Noto Serif KR', Georgia, serif" } }>{ t('appNav.brand') }</Button> }
      navContent={ <NavigationLinks pathname={ pathname } targets={ targets } routed={ routed } /> }
      persistent={ <>
        { onToggleSound && <IconButton onClick={ onToggleSound } disabled={ soundLoading } aria-pressed={ soundOn }
          aria-label={ t(soundOn ? 'soundFab.muteSound' : 'soundFab.enableSound') } title={ t(soundOn ? 'soundFab.muteSound' : 'soundFab.enableSound') }
          sx={ { color: 'inherit', width: 44, height: 44, borderRadius: 0, '&.Mui-focusVisible': { outline: '1px solid currentColor', outlineOffset: -2 } } }>
          { soundOn ? <VolumeUpOutlinedIcon sx={ { fontSize: 20 } } /> : <VolumeOffOutlinedIcon sx={ { fontSize: 20 } } /> }
        </IconButton> }
        { children }
      </> }
      drawerSx={ { ...colors, width: '100vw', maxWidth: 'none', height: '100dvh', pb: 'env(safe-area-inset-bottom, 0px)' } }
      sx={ { color: colors.color, bgcolor: 'transparent', height: HEIGHT, pt: 'env(safe-area-inset-top, 0px)', boxSizing: 'border-box', px: { xs: 2, md: 5 },
        background: overlay && dark ? 'linear-gradient(to bottom, rgba(8,12,11,0.65), transparent)' : 'none', backdropFilter: 'none',
      } } />
    { !overlay && <Box aria-hidden sx={ { height: HEIGHT, flexShrink: 0 } } /> }
  </>;
}

function RoutedNavigation(props) {
  const location = useLocation();
  const session = useNavigationSession();
  useEffect(() => {
    if (!session) return;
    if (location.pathname === APP_PATHS.archive) session.lastPaths.set('archive', `${location.pathname}${location.search}${location.hash}`);
    if (location.pathname === APP_PATHS.canvas) session.lastPaths.set('create', `${location.pathname}${location.search}${location.hash}`);
  }, [location, session]);
  return <NavigationView { ...props } routed pathname={ location.pathname } locationKey={ location.key }
    targets={ { story: '/', create: session?.lastPaths.get('create') || '/canvas', archive: session?.lastPaths.get('archive') || '/archive' } } />;
}

/** Shared fixed route navigation; standalone stories work without a router. */
export default function AppGNB(props) {
  const routed = useInRouterContext();
  return routed ? <RoutedNavigation { ...props } /> : <NavigationView targets={ { story: '/', create: '/canvas', archive: '/archive' } } { ...props } />;
}
