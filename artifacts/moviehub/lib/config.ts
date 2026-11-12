// Endpoints for the external Nabees services. Values can be overridden with
// EXPO_PUBLIC_* variables (the native replacement for the old import.meta.env).
const env = process.env;

export const SUPABASE_PROJECT_ID = env.EXPO_PUBLIC_SUPABASE_PROJECT_ID || 'luefcuffcojxcqdmrngi';
export const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
// Public anon (publishable) key that the original web client shipped with.
export const SUPABASE_PUBLISHABLE_KEY = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1ZWZjdWZmY29qeGNxZG1ybmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzQxNDEsImV4cCI6MjA4MTg1MDE0MX0.AeAsdjzttMtweZZWsYbfzm8D_5Kg5bPDveg8Qytzu5w';

export const NABEES_URL = 'https://spcytnumhpqpiwfwhycx.supabase.co/functions/v1/rapid-function';
export const SUGGEST_URL = 'https://mumubmrvkqcgzidqubcc.supabase.co/functions/v1/movies/search-suggest';
export const V1_API_BASE = 'https://raspy-shape-8d99.nabaikabaiaguo.workers.dev/v1';
export const V2_API_BASE = 'https://movieapi.freesrv.com';
export const V3_API_BASE = 'https://movie3.nabaikabaiaguo.workers.dev';
export const SUBTITLES_URL = 'https://movieapi.freesrv.com/moviebox/subtitles';
export const SPORTS_API = 'https://movieapi.freesrv.com/moviebox/sports';
export const PLUTO_API = 'https://api.nabeestech.com/pluto';
export const GLOBETV_API = 'https://movieapi.nabees.online/globetv';
export const WWE_API_BASE = 'https://wweapi.nabees.online';
