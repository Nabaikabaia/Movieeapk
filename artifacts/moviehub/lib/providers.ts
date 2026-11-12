export const NABEES_API = 'https://spcytnumhpqpiwfwhycx.supabase.co/functions/v1/rapid-function';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXJhYmFzZSIsInJlZiI6Imx1ZWZjdWZmY29qeGNxZG1ybmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzQxNDEsImV4cCI6MjA4MTg1MDE0MX0.AeAsdjzttMtweZZWsYbfzm8D_5Kg5bPDveg8Qytzu5w';
export const CONTENT_PROVIDERS = [
  { name: 'Nabees movie catalogue', host: 'rapid-function', feature: 'Discover, categories, search, details, recommendations, trailers' },
  { name: 'Moviebox streams v1', host: 'raspy-shape-8d99.nabaikabaiaguo.workers.dev', feature: 'Alternate movie and series playback sources' },
  { name: 'Moviebox streams v2', host: 'movieapi.freesrv.com', feature: 'Primary playback and direct-download sources' },
  { name: 'Moviebox streams v3', host: 'movie3.nabaikabaiaguo.workers.dev', feature: 'Alternate playback and caption sources' },
  { name: 'Nabees search suggestions', host: 'mumubmrvkqcgzidqubcc.supabase.co', feature: 'Search suggestions' },
  { name: 'Pluto TV', host: 'api.nabeestech.com/pluto', feature: 'Live channels and verified channel streams' },
  { name: 'IPTV directory', host: 'luefcuffcojxcqdmrngi.supabase.co', feature: 'IPTV channel search, guide metadata, stream links' },
  { name: 'GlobeTV', host: 'movieapi.nabees.online/globetv', feature: 'International channels, countries and categories' },
  { name: 'Sports', host: 'movieapi.freesrv.com/moviebox/sports', feature: 'Live, upcoming and completed matches' },
  { name: 'WWE', host: 'wweapi.nabees.online', feature: 'WWE channel and video details (upstream may require authorization)' },
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
export type Stream = { id: string; url: string; proxyUrl: string; downloadUrl: string; quality: string; size: string; format: string; subtitles: { language: string; code: string; url: string }[] };
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
export async function getRecommendations(id: string): Promise<Movie[]> {
  try { const d = await getDetails(id); return (d.you_may_also_like || []).map((m: any) => ({ subjectId: m.subjectId, title: m.title, cover: m.cover, subjectType: m.type || 1, detailPath: m.detailPath, imdbRatingValue: m.imdbRating })); } catch { return []; }
}
export type StreamVersion = 'v1'|'v2'|'v3';
export async function getStreams(movie: Movie, season = 0, episode = 0, version: StreamVersion = 'v2'): Promise<Stream[]> {
  const p = new URLSearchParams({ subjectId: String(movie.subjectId), detailPath: movie.detailPath || '', season: String(season), episode: String(episode) });
  const base = version === 'v1' ? 'https://raspy-shape-8d99.nabaikabaiaguo.workers.dev/v1/movie' : version === 'v3' ? 'https://movie3.nabaikabaiaguo.workers.dev/movie' : 'https://movieapi.freesrv.com/moviebox/sources';
  if (version === 'v3') { p.set('id', String(movie.subjectId)); p.set('se', String(season)); p.set('ep', String(episode)); }
  const d = await safe(`${base}?${p}`);
  const raw = version === 'v3' ? (d.data?.processedSources?.length ? d.data.processedSources : d.data?.downloads || []) : d.data?.streams || d.streams || [];
  return raw.map((x: any, i: number) => ({
    id: String(x.id || `stream-${i}`), url: x.playUrl || x.url || x.proxyUrl || x.stream_url || '',
    proxyUrl: x.playUrl || x.proxyUrl || x.stream_url || x.url || '',
    downloadUrl: x.downloadUrl || x.download_url || x.proxyUrl || x.url || '',
    quality: String(x.quality || x.resolution || '480').replace(/[^\d]/g, '') || '480',
    size: x.size || x.size_mb ? String(x.size || `${x.size_mb} MB`) : '—', format: x.format || 'MP4',
    subtitles: (d.data?.subtitles || d.data?.captions || []).map((s: any) => ({ language: s.language_name || s.lanName || s.language || s.lan || 'Subtitle', code: s.language || s.lan || '', url: s.url })),
  })).filter((x: Stream) => !!x.url);
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
export async function getWwe(page = 1) {
  const d = await safe(`https://wweapi.nabees.online/channel?c=wwe&p=${page}`); return d.videos || [];
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
