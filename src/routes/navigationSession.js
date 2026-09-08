import { createContext, useContext } from 'react';

// In-memory only. No personal draft is written to storage or sent to a server.
export const NavigationSessionContext = createContext(null);
export const useNavigationSession = () => useContext(NavigationSessionContext);
export const createNavigationSession = () => ({ canvas: new Map(), archiveScroll: new Map(), lastPaths: new Map([['create', '/canvas']]) });

export function navigationSection(pathname) {
  if (pathname === '/') return 'story';
  if (pathname === '/canvas') return 'create';
  return 'archive';
}
