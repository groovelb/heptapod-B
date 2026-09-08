'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { shareLocale } from '../src/i18n/shareLocale.js';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { AppContent } from '../src/App';
import LocaleProvider from '../src/i18n/LocaleProvider';
import NextRouterProvider from '../src/routes/NextRouterProvider';
import NavigationSessionProvider from '../src/routes/NavigationSessionProvider';

function SharedLocale({ children }) {
  const params = useSearchParams();
  return <LocaleProvider syncMetadata={ false } urlLocale={ shareLocale(params.toString()) }>{ children }</LocaleProvider>;
}

export default function Providers({ children }) {
  return <AppRouterCacheProvider options={ { key: 'mui' } }>
    <Suspense fallback={ null }>
      <SharedLocale>
        <NextRouterProvider>
          <AppContent>
            <NavigationSessionProvider>{ children }</NavigationSessionProvider>
          </AppContent>
        </NextRouterProvider>
      </SharedLocale>
    </Suspense>
  </AppRouterCacheProvider>;
}
