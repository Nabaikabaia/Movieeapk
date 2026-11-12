export const NABEES_API = 'https://spcytnumhpqpiwfwhycx.supabase.co/functions/v1/rapid-function';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXJhYmFzZSIsInJlZiI6Imx1ZWZjdWZmY29qeGNxZG1ybmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzQxNDEsImV4cCI6MjA4MTg1MDE0MX0.AeAsdjzttMtweZZWsYbfzm8D_5Kg5bPDveg8Qytzu5w';
export const CONTENT_PROVIDERS = [
  { name: 'Nabees movie catalogue', host: 'rapid-function', feature: 'Discover, categories, search, details, recommendations, trailers' },
  { name: 'Movie API', host: 'movieapi.freesrv.com', feature: 'Single movie and series source for playback and downloads' },
  { name: 'Nabees search suggestions', host: 'mumubmrvkqcgzidqubcc.supabase.co', feature: 'Search suggestions' },
  { name: 'Pluto TV', host: 'api.nabeestech.com/pluto', feature: 'Live channels and verified channel streams' },
  { name: 'IPTV directory', host: 'luefcuffcojxcqdmrngi.supabase.co', feature: 'IPTV channel search, guide metadata, stream links' },
  { name: 'GlobeTV', host: 'movieapi.nabees.online/globetv', feature: 'International channels, countries and categories' },
  { name: 'Sports', host: 'movieapi.freesrv.com/moviebox/sports', feature: 'Live, upcoming and completed matches' },
  { name: 'Staff filmography', host: 'luefcuffcojxcqdmrngi.supabase.co', feature: 'Related filmography' },
  { name: 'Subtitles', host: 'movieapi.freesrv.com', feature: 'Subtitle lookup for supported streams' },
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
export type Stream = {
  id: string;
  url: string;
  proxyUrl: string;
  downloadUrl: string;
  quality: string;
  size: string;
  format: string;
  audioTracks: { id: string; language: string; code: string; label: string }[];
  subtitles: { language: string; code: string; url: string }[];
};
const safe = async (url: string, init?: RequestInit) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 16000);
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
export async function getMovies(slug = 'popular', page = 1, perPage = 30): Promise<Movie[]> {
  const d = await catalogue(`/movies/${slug}?page=${page}&perPage=${perPage}`);
  return d.subjectList || [];
}
export async function getHome() {
  const [movies, series, trending] = await Promise.all([
    getMovies('popular'),
    getMovies('new-tv'),
    getMovies('top-list'),
  ]);
  return { movies: movies.filter(x => x.subjectType === 1), series: series.filter(x => x.subjectType === 2), trending };
}
export async function findMovies(term: string): Promise<Movie[]> {
  const d = await safe(`${NABEES_API}/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword: term, page: 1, perPage: 30, subjectType: 0 }) });
  return d.data?.items || [];
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
    path = (items.find((x: any) => String(x.subjectId) === path) || items[0])?.detailPath || path;
  }
  const d = await catalogue(`/details?detailPath=${encodeURIComponent(path)}`);
  return d;
}
export async function getRecommendations(id: string, detailData?: any): Promise<Movie[]> {
  try {
    const d = detailData || await getDetails(id);
    const fromDetails = (d.you_may_also_like || d.subject?.you_may_also_like || []).map((m: any) => ({
      subjectId: m.subjectId,
      title: m.title,
      cover: m.cover,
      subjectType: m.type || 1,
      detailPath: m.detailPath,
      imdbRatingValue: m.imdbRating,
    }));
    if (fromDetails.length) return fromDetails;
    const genre = String(d.subject?.genre || '').split(',')[0].trim();
    if (!genre) return [];
    return (await findMovies(genre)).filter((movie) => movie.subjectId !== id).slice(0, 16);
  } catch {
    return [];
  }
}
export async function getStreams(movie: Movie, season = 0, episode = 0): Promise<Stream[]> {
  const p = new URLSearchParams({
    subjectId: String(movie.subjectId),
    detailPath: String(movie.detailPath || ''),
    season: String(season),
    episode: String(episode),
  });
  const d = await safe(`https://movieapi.freesrv.com/moviebox/sources?${p}`);
  const raw = d.data?.streams || d.streams || [];
  return raw.map((x: any, i: number) => {
    const rawAudio = x.audioTracks || x.audio_tracks || x.audios || x.audio || d.data?.audioTracks || d.data?.audio_tracks || [];
    const rawSubtitles = x.subtitles || x.captions || d.data?.subtitles || d.data?.captions || [];
    return {
      id: String(x.id || `stream-${i}`),
      url: x.playUrl || x.url || x.proxyUrl || x.stream_url || '',
      proxyUrl: x.playUrl || x.proxyUrl || x.stream_url || x.url || '',
      downloadUrl: x.downloadUrl || x.download_url || x.proxyUrl || x.url || '',
      quality: String(x.quality || x.resolution || '480').replace(/[^\d]/g, '') || '480',
      size: x.size || x.size_mb ? String(x.size || `${x.size_mb} MB`) : '—',
      format: x.format || 'MP4',
      audioTracks: (Array.isArray(rawAudio) ? rawAudio : []).map((track: any, trackIndex: number) => ({
        id: String(track.id || track.trackId || track.code || `audio-${trackIndex}`),
        language: String(track.language || track.lang || track.languageCode || ''),
        code: String(track.code || track.languageCode || track.language || track.lang || ''),
        label: String(track.label || track.name || track.title || track.language_name || track.language || `Audio ${trackIndex + 1}`),
      })),
      subtitles: (Array.isArray(rawSubtitles) ? rawSubtitles : []).filter((subtitle: any) => subtitle.url || subtitle.file || subtitle.src).map((subtitle: any) => ({
        language: String(subtitle.language_name || subtitle.lanName || subtitle.language || subtitle.lan || subtitle.label || 'Subtitle'),
        code: String(subtitle.language || subtitle.lan || subtitle.code || ''),
        url: String(subtitle.url || subtitle.file || subtitle.src || ''),
      })),
    };
  }).filter((stream: Stream) => !!stream.url);
}
export async function getPluto() {
  const d = await safe('https://api.nabeestech.com/pluto/channels');
  return d.channels || [];
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
