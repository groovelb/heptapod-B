import { useState } from 'react';
import { NavigationSessionContext, createNavigationSession } from './navigationSession';

export default function NavigationSessionProvider({ children }) {
  const [session] = useState(createNavigationSession);
  return <NavigationSessionContext.Provider value={ session }>{ children }</NavigationSessionContext.Provider>;
}
