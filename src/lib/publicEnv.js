/** Public build settings only. Vite fallback keeps the existing isolated component tests usable. */
export const publicEnv = {
  supabaseUrl: import.meta.env?.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : '') || '',
  supabaseAnonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : '') || '',
  musicVideoId: import.meta.env?.VITE_MUSIC_VIDEO_ID || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MUSIC_VIDEO_ID : '') || 'KzaqrQuwr1k',
  musicVolume: import.meta.env?.VITE_MUSIC_VOLUME || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MUSIC_VOLUME : '') || '20',
  musicAutoplay: (import.meta.env?.VITE_MUSIC_AUTOPLAY || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MUSIC_AUTOPLAY : '')) !== 'false',
  relationsMode: import.meta.env?.VITE_ARCHIVE_RELATIONS_MODE || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ARCHIVE_RELATIONS_MODE : '') || '',
  development: import.meta.env?.DEV ?? (typeof process !== 'undefined' && process.env.NODE_ENV === 'development'),
};
