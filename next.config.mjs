import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
// Only these existing public settings cross the client boundary. Never copy process.env.
const publicKeys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'MUSIC_VIDEO_ID', 'MUSIC_VOLUME', 'MUSIC_AUTOPLAY', 'ARCHIVE_RELATIONS_MODE'];
const env = Object.fromEntries(publicKeys.map((key) => [
  `NEXT_PUBLIC_${key}`, process.env[`NEXT_PUBLIC_${key}`] || process.env[`VITE_${key}`] || '',
]));

/** @type {import('next').NextConfig} */
const nextConfig = {
  env,
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
  transpilePackages: ['@mui/material', '@mui/icons-material', '@mui/lab'],
  outputFileTracingIncludes: {
    '/api/og': ['./public/og/NotoSerifKR-Bold.otf', './public/og/Cinzel-Bold.ttf'],
  },
  // Every share client receives complete head metadata without executing JavaScript.
  htmlLimitedBots: /.*/,
  async redirects() {
    return [
      { source: '/me', destination: '/archive', permanent: false },
      // 스토리북 정적 빌드(public/storybook). Next 가 /storybook/ 를 /storybook 으로 정규화하므로 index.html 로 보낸다.
      { source: '/storybook', destination: '/storybook/index.html', permanent: false },
    ];
  },
};

export default nextConfig;
