import {
  MOVIEBOX_API_HOST,
  MOVIEBOX_CLIENT_TOKEN,
  MOVIEBOX_STREAM_HEADERS,
  MOVIEBOX_WEB_ORIGIN,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from './config';

export const NABEES_API = 'https://spcytnumhpqpiwfwhycx.supabase.co/functions/v1/rapid-function';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXJhYmFzZSIsInJlZiI6Imx1ZWZjdWZmY29qeGNxZG1ybmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzQxNDEsImV4cCI6MjA4MTg1MDE0MX0.AeAsdjzttMtweZZWsYbfzm8D_5Kg5bPDveg8Qytzu5w';
export const CONTENT_PROVIDERS = [
  { name: 'Nabees movie catalogue', host: 'rapid-function', feature: 'Discover, categories, search, details, recommendations, trailers' },
  { name: 'MovieBox sources', host: 'h5-api.aoneroom.com', feature: 'Direct movie and series source and subtitle lookups' },
  { name: 'Nabees search suggestions', host: 'mumubmrvkqcgzidqubcc.supabase.co', feature: 'Search suggestions' },
  { name: 'Pluto TV', host: 'api.nabeestech.com/pluto', feature: 'Live channels and verified channel streams' },
  { name: 'IPTV directory', host: 'luefcuffcojxcqdmrngi.supabase.co', feature: 'IPTV channel search, guide metadata, stream links' },
  { name: 'GlobeTV', host: 'movieapi.nabees.online/globetv', feature: 'International channels, countries and categories' },
  { name: 'Sports', host: 'movieapi.freesrv.com/moviebox/sports', feature: 'Live, upcoming and completed matches' },
  { name: 'Staff filmography', host: 'luefcuffcojxcqdmrngi.supabase.co', feature: 'Related filmography' },
  { name: 'Subtitles', host: 'h5-api.aoneroom.com', feature: 'Direct caption lookup for supported streams' },
] as const;

export type Movie = {
  subjectId: string;
  subjectType: number;
  title: string;
  detailPath?: string;
  cover?: { url?: string };
  description?: string;
  releaseDate?: string;
  imdbRatingValue?: string;
  [key: string]: any;
};

const ADULT_CONTENT_TERMS = /\b(adult|erotic|porn(?:ographic)?|xxx|hentai|explicit|sex(?:ual)?|uncensored|uncut)\b/i;

/**
 * The catalog sometimes returns isPornographic: false even on titles tagged
 * with Adult/Erotic genres, so check both explicit flags and descriptive tags.
 */
export function isAdultContent(movie: Movie | Record<string, any> | null | undefined): boolean {
  if (!movie) return false;
  const flags = [
    movie.isPornographic,
    movie.isAdult,
    movie.adult,
    movie.webHighRisk,
    movie.isExplicit,
  ];
  if (flags.some((flag) => flag === true || flag === 1 || flag === 'true')) return true;

  const metadata = [
    movie.genre,
    movie.genres,
    movie.tags,
    movie.categories,
    movie.contentRating,
    movie.ageRating,
    movie.ratingLabel,
    movie.title,
    movie.description,
    movie.postTitle,
  ].flatMap((value) => Array.isArray(value)
    ? value.map((item) => typeof item === 'string' ? item : item?.name || item?.label || '')
    : [typeof value === 'string' ? value : ''])
    .join(' ');

  return ADULT_CONTENT_TERMS.test(metadata);
}
export type AudioOption = {
  id: string;
  language: string;
  code: string;
  label: string;
  kind?: 'dub' | 'embedded';
  sourceSubjectId?: string;
  sourceDetailPath?: string;
  isOriginal?: boolean;
};
export type Stream = {
  id: string;
  url: string;
  proxyUrl: string;
  downloadUrl: string;
  quality: string;
  size: string;
  format: string;
  audioTracks: AudioOption[];
  subtitles: { language: string; code: string; url: string }[];
  headers?: Record<string, string>;
};
const safe = async (url: string, init?: RequestInit, timeout = 16000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const abort = () => controller.abort();
  init?.signal?.addEventListener('abort', abort, { once: true });
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const data: any = await res.json();
    if (!res.ok || data?.success === false || (typeof data?.status === 'number' && data.status >= 400)) {
      throw new Error(data?.message || data?.error || `Provider returned ${res.status}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
    init?.signal?.removeEventListener('abort', abort);
  }
};
const catalogue = async (path: string) => {
  const x = await safe(`${NABEES_API}${path}`);
  return x.data ?? x;
};
export type MoviePage = { items: Movie[]; hasMore: boolean; currentPage: number };
function moviePage(data: any, key: 'subjectList' | 'items', page: number): MoviePage {
  const items: Movie[] = Array.isArray(data?.[key]) ? data[key] : [];
  const pager = data?.pager || data?.pagination || {};
  const hasMore = typeof pager.hasMore === 'boolean'
    ? pager.hasMore
    : typeof data?.hasMore === 'boolean'
      ? data.hasMore
      : items.length > 0;
  return { items, hasMore, currentPage: Number(pager.page || data?.currentPage) || page };
}
export async function getMoviesPage(slug = 'popular', page = 1, perPage = 30): Promise<MoviePage> {
  const d = await catalogue(`/movies/${slug}?page=${page}&perPage=${perPage}`);
  return moviePage(d, 'subjectList', page);
}
export async function getMovies(slug = 'popular', page = 1, perPage = 30): Promise<Movie[]> {
  return (await getMoviesPage(slug, page, perPage)).items;
}
export async function getHome() {
  const [movies, series, trending] = await Promise.all([
    getMovies('popular'),
    getMovies('new-tv'),
    getMovies('top-list'),
  ]);
  return { movies: movies.filter(x => x.subjectType === 1), series: series.filter(x => x.subjectType === 2), trending };
}
export async function findMoviesPage(term: string, page = 1, perPage = 30): Promise<MoviePage> {
  const response = await safe(`${NABEES_API}/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword: term, page, perPage, subjectType: 0 }) });
  return moviePage(response.data ?? response, 'items', page);
}
export async function findMovies(term: string, page = 1, perPage = 30): Promise<Movie[]> {
  return (await findMoviesPage(term, page, perPage)).items;
}
export type StaffFilmographyPage = { items: Movie[]; hasMore: boolean; totalCount: number; currentPage: number };
export async function getStaffFilmography(staffId: string, page = 1, perPage = 24): Promise<StaffFilmographyPage> {
  const query = new URLSearchParams({
    id: staffId,
    p: String(page),
    perPage: String(perPage),
  });
  const response = await safe(`${SUPABASE_URL}/functions/v1/staff?${query}`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  const rawItems: Movie[] = response.data?.items || [];
  const seen = new Set<string>();
  const items = rawItems.filter((movie) => {
    const title = String(movie.title || '')
      .replace(/[\[(（【][^\])）】]*[\])）】]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    if (!movie.subjectId || !title || seen.has(title)) return false;
    seen.add(title);
    return true;
  });
  return {
    items,
    hasMore: Boolean(response.data?.hasMore),
    totalCount: Number(response.data?.totalCount) || items.length,
    currentPage: Number(response.data?.currentPage) || page,
  };
}
export async function getSuggestions(term: string): Promise<Movie[]> {
  if (!term.trim()) return [];
  const d = await safe('https://mumubmrvkqcgzidqubcc.supabase.co/functions/v1/movies/search-suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword: term, perPage: 8 }) });
  return (d.suggestions || d.data || []).map((x: any) => ({
    ...(x.subject || x),
    title: x.title || x.word || x.subject?.title || '',
    subjectId: x.subject?.subjectId || x.subjectId,
    cover: x.subject?.cover || x.cover,
    subjectType: x.subject?.subjectType ?? x.subjectType,
  })).filter((x: Movie) => !!x.title);
}
export async function getDetails(idOrPath: string) {
  let path = idOrPath;
  if (/^\d+$/.test(path)) {
    const d = await safe(`${NABEES_API}/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword: path, page: 1, perPage: 5, subjectType: 0 }) });
    const items = d.data?.items || [];
    const exactMatch = items.find((x: any) => String(x.subjectId) === path);
    if (!exactMatch?.detailPath) {
      throw new Error('Could not resolve this title to an exact details page.');
    }
    path = exactMatch.detailPath;
  }
  const d = await catalogue(`/details?detailPath=${encodeURIComponent(path)}`);
  return d;
}
export async function getRecommendations(id: string, detailData?: any): Promise<Movie[]> {
  try {
    const d = detailData || await getDetails(id);
    const fromDetails = (d.you_may_also_like || d.subject?.you_may_also_like || []).map((m: any) => ({
      ...m,
      subjectId: m.subjectId,
      title: m.title,
      cover: m.cover,
      subjectType: m.type || 1,
      detailPath: m.detailPath,
      imdbRatingValue: m.imdbRating,
      genre: m.genre || m.subject?.genre,
    }));
    if (fromDetails.length) return fromDetails;
    const genre = String(d.subject?.genre || '').split(',')[0].trim();
    if (!genre) return [];
    return (await findMovies(genre)).filter((movie) => movie.subjectId !== id).slice(0, 16);
  } catch {
    return [];
  }
}
const MOVIEBOX_REQUEST_HEADERS = {
  Accept: 'application/json',
  'User-Agent': MOVIEBOX_STREAM_HEADERS['User-Agent'],
  Origin: MOVIEBOX_WEB_ORIGIN,
  Referer: `${MOVIEBOX_WEB_ORIGIN}/`,
  'x-client-info': '{"timezone":"Africa/Lagos"}',
  'x-request-lang': 'en',
  'save-data': 'on',
};
let movieboxTokenCache: { value: string; expiresAt: number } | undefined;

async function getMovieboxToken(): Promise<string> {
  if (movieboxTokenCache && movieboxTokenCache.expiresAt > Date.now()) {
    return movieboxTokenCache.value;
  }
  if (!MOVIEBOX_CLIENT_TOKEN) {
    throw new Error('MovieBox client configuration is missing.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${MOVIEBOX_API_HOST}/wefeed-h5api-bff/home`, {
      headers: { ...MOVIEBOX_REQUEST_HEADERS, 'x-client-token': MOVIEBOX_CLIENT_TOKEN },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`MovieBox token request failed (${response.status}).`);
    const userHeader = response.headers.get('x-user');
    let token = '';
    try {
      token = String(JSON.parse(userHeader || '{}').token || '');
    } catch {
      token = '';
    }
    if (!token) throw new Error('MovieBox did not return an access token.');
    movieboxTokenCache = { value: token, expiresAt: Date.now() + 6 * 60 * 60 * 1000 };
    return token;
  } finally {
    clearTimeout(timeout);
  }
}

async function movieboxRequest(
  url: string,
  token: string,
  timeoutMs = 25_000,
  extraHeaders: Record<string, string> = {},
): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        ...MOVIEBOX_REQUEST_HEADERS,
        Authorization: `Bearer ${token}`,
        ...(url.includes('/subject/play')
          ? { Referer: `${MOVIEBOX_WEB_ORIGIN}/videoPlayPage/` }
          : {}),
        ...extraHeaders,
      },
      signal: controller.signal,
    });
    let payload: any;
    try {
      payload = await response.json();
    } catch {
      throw new Error(`MovieBox returned an unreadable response (${response.status}).`);
    }
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || `MovieBox request failed (${response.status}).`);
    }
    if (payload?.code !== undefined && Number(payload.code) !== 0) {
      throw new Error(payload?.message || payload?.msg || `MovieBox returned code ${payload.code}.`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function formatMovieboxSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export async function getStreams(movie: Movie, season = 0, episode = 0): Promise<Stream[]> {
  const sourceUrl = new URL('/wefeed-h5api-bff/subject/play', MOVIEBOX_WEB_ORIGIN);
  sourceUrl.search = new URLSearchParams({
    subjectId: String(movie.subjectId),
    se: String(season),
    ep: String(episode),
    detailPath: String(movie.detailPath || ''),
  }).toString();
  const token = await getMovieboxToken();
  const payload = await movieboxRequest(sourceUrl.toString(), token, 25_000, {
    Referer: `${MOVIEBOX_WEB_ORIGIN}/videoPlayPage/${movie.detailPath || ''}`,
  });
  const raw = Array.isArray(payload.data?.streams) ? payload.data.streams : [];
  return raw.map((x: any, i: number) => {
    const rawAudio = x.audioTracks || x.audio_tracks || x.audios || x.audio || [];
    const rawSubtitles = x.subtitles || x.captions || [];
    const url = String(x.url || x.playUrl || x.play_url || '');
    const rawSize = Number.parseInt(String(x.size_bytes ?? x.size ?? ''), 10);
    const sizeMb = Number(x.size_mb);
    const rawQuality = String(x.resolutions || x.quality || '480');
    const quality = rawQuality.replace(/[^\d]/g, '') || rawQuality;
    return {
      id: String(x.id || `${movie.subjectId}-${season}-${episode}-stream-${i}`),
      url,
      proxyUrl: url,
      downloadUrl: url,
      quality,
      size: rawSize > 0
        ? formatMovieboxSize(rawSize)
        : sizeMb > 0
          ? `${sizeMb} MB`
          : '—',
      format: x.format || 'MP4',
      audioTracks: (Array.isArray(rawAudio) ? rawAudio : []).map((track: any, trackIndex: number) => ({
        id: String(track.id || track.trackId || track.code || `audio-${trackIndex}`),
        language: String(track.language || track.lang || track.languageCode || ''),
        code: String(track.code || track.languageCode || track.language || track.lang || ''),
        label: String(track.label || track.name || track.title || track.language_name || track.language || `Audio ${trackIndex + 1}`),
        kind: 'embedded' as const,
      })),
      subtitles: (Array.isArray(rawSubtitles) ? rawSubtitles : []).filter((subtitle: any) => subtitle.url || subtitle.file || subtitle.src).map((subtitle: any) => ({
        language: String(subtitle.language_name || subtitle.lanName || subtitle.language || subtitle.lan || subtitle.label || 'Subtitle'),
        code: String(subtitle.language || subtitle.lan || subtitle.code || ''),
        url: String(subtitle.url || subtitle.file || subtitle.src || ''),
      })),
      headers: MOVIEBOX_STREAM_HEADERS,
    };
  }).filter((stream: Stream) => /^https?:\/\//i.test(stream.url));
}
export async function getSubtitles(movie: Movie, stream: Stream, season = 0, episode = 0): Promise<Stream['subtitles']> {
  const params = new URLSearchParams({
    format: String(stream.format || 'MP4'),
    id: String(stream.id),
    subjectId: String(movie.subjectId),
    detailPath: String(movie.detailPath || ''),
  });
  try {
    const token = await getMovieboxToken();
    const payload = await movieboxRequest(
      `${MOVIEBOX_API_HOST}/wefeed-h5api-bff/subject/caption?${params}`,
      token,
      20_000,
    );
    const captions = Array.isArray(payload.data?.captions) ? payload.data.captions : [];
    return captions.flatMap((caption: any) => {
      const rawUrl = String(caption.url || '').trim();
      if (!rawUrl) return [];
      try {
        const url = new URL(rawUrl, MOVIEBOX_WEB_ORIGIN);
        if (url.protocol !== 'https:') return [];
        const code = String(caption.lan || caption.language || caption.code || '');
        return [{
          language: String(caption.lanName || caption.lan || caption.language || 'Subtitle'),
          code,
          url: url.toString(),
        }];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}
export async function getPluto() {
  const d = await safe('https://api.nabeestech.com/pluto/channels');
  const channels = Array.isArray(d.channels) ? d.channels : [];
  const flagged = (value: unknown) => value === true || value === 1 || value === '1' || value === 'true';
  return channels.filter((channel: any) => !flagged(channel.closed) && !flagged(channel.is_nsfw) && !flagged(channel.nsfw));
}
export async function getGlobeCountries() {
  const d = await safe('https://movieapi.nabees.online/globetv/co'); return d.data || [];
}
export async function getGlobeChannels() {
  const [a,b] = await Promise.all([safe('https://movieapi.nabees.online/globetv/ch'),safe('https://movieapi.nabees.online/globetv/st')]);
  const channels: any[] = a.data || []; const streams: any[] = b.data || [];
  const by = new Map<string,any[]>();
  streams.filter(s=>s.url).forEach(s=>by.set(s.channel,[...(by.get(s.channel)||[]),s]));
  return channels.filter(c=>!c.is_nsfw&&!c.closed&&by.has(c.id)).map(c=>({...c,streams:by.get(c.id)})).sort((x,y)=>x.name.localeCompare(y.name));
}
export async function getSports() {
  const d = await safe('https://movieapi.freesrv.com/moviebox/sports'); return d.matches || {};
}
export async function getIptv(query = '') {
  const p = new URLSearchParams({ resource:'channels', limit:'40', ...(query ? { q:query }: {}) });
  const d = await safe(`https://luefcuffcojxcqdmrngi.supabase.co/functions/v1/iptv?${p}`, {headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`}});
  return d.data || [];
}
export async function verifyPluto(id: string) {
  const d = await safe(`https://api.nabeestech.com/pluto/verify?id=${encodeURIComponent(id)}`);
  if (!d.ok || !d.m3u8) throw new Error('This live channel is temporarily offline.');
  return d.m3u8 as string;
}
export async function getIptvStream(url: string, ua?: string | null, ref?: string | null) {
  const p = new URLSearchParams({u:url}); if(ua)p.set('ua',ua);if(ref)p.set('r',ref);
  return `https://luefcuffcojxcqdmrngi.supabase.co/functions/v1/iptv-stream?${p}`;
}
