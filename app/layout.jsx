import Providers from './providers';
import '../src/index.css';

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export const metadata = {
  icons: {
    icon: [
      { url: '/favicon.ico?v=1', sizes: '16x16 32x32 48x48' },
      { url: '/favicon-32.png?v=1', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.svg?v=1', type: 'image/svg+xml', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png?v=1', sizes: '180x180', type: 'image/png' }],
  },
};

// Keep the existing font families, weights and root dimensions during the migration.
export default function RootLayout({ children }) {
  return <html lang="ko" suppressHydrationWarning>
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Fraunces:ital,wght@0,300;0,400;1,300;1,400&family=Newsreader:ital,wght@0,300;0,400;1,300;1,400&family=Noto+Serif+KR:wght@300;400;500;700&family=Noto+Serif+SC:wght@300;400;500;700&display=swap" rel="stylesheet" />
    </head>
    <body><div id="root"><Providers>{ children }</Providers></div></body>
  </html>;
}
