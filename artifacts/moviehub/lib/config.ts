// Endpoints for the external Nabees services. Values can be overridden with
// EXPO_PUBLIC_* variables (the native replacement for the old import.meta.env).
const env = process.env;

export const SUPABASE_PROJECT_ID = env.EXPO_PUBLIC_SUPABASE_PROJECT_ID || 'luefcuffcojxcqdmrngi';
export const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
// Public anon (publishable) key that the original web client shipped with.
export const SUPABASE_PUBLISHABLE_KEY = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1ZWZjdWZmY29qeGNxZG1ybmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzQxNDEsImV4cCI6MjA4MTg1MDE0MX0.AeAsdjzttMtweZZWsYbfzm8D_5Kg5bPDveg8Qytzu5w';

export const NABEES_URL = 'https://spcytnumhpqpiwfwhycx.supabase.co/functions/v1/rapid-function';
export const SUGGEST_URL = 'https://mumubmrvkqcgzidqubcc.supabase.co/functions/v1/movies/search-suggest';
export const MOVIEBOX_WEB_ORIGIN = 'https://netnaija.film';
export const MOVIEBOX_SOURCES_API = 'https://movieapi.freesrv.com/moviebox';
export const MOVIEBOX_STREAM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'video/mp4,*/*;q=0.8',
  'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
  Origin: MOVIEBOX_WEB_ORIGIN,
  Referer: `${MOVIEBOX_WEB_ORIGIN}/`,
  'Sec-Fetch-Site': 'cross-site',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'video',
};
export const SPORTS_API = 'https://movieapi.freesrv.com/moviebox/sports';
export const PLUTO_API = 'https://api.nabeestech.com/pluto';
export const GLOBETV_API = 'https://movieapi.nabees.online/globetv';
