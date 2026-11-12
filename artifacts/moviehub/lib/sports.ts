import { SPORTS_API } from './config';

export type SportType = 'football' | 'basketball';

export interface SportsTeam {
  id: string;
  name: string;
  score: string;
  avatar: string;
  abbreviation: string;
  type: string;
}

export interface PlaySource {
  title: string;
  path: string;
  id: string;
  cover: { url: string } | null;
}

export interface Highlight {
  id: string;
  title: string;
  path: string;
  cover: { url: string };
  duration: string;
  createTime: string;
  stat?: { viewCount: string };
}

export interface Match {
  id: string;
  team1: SportsTeam;
  team2: SportsTeam;
  status: 'MatchNotStart' | 'MatchInProgress' | 'MatchEnded' | string;
  statusLive: string;
  playType: string;
  playPath: string;
  streamUrl: string;
  startTime: string;
  endTime: string;
  type: SportType;
  timeDesc: string;
  playSource: PlaySource[];
  highlights: Highlight[];
  replay: PlaySource[];
  league: string;
  leagueId: string;
  leagueLogo: string;
  matchRound: string;
  matchResult: string;
  hasStream: boolean;
}

export interface MatchPage {
  matches: Match[];
  page: number;
  size: number;
  total: number;
}

export interface League {
  slug: string;
  id: string;
  name: string;
  sport: SportType;
  logo: string;
}

interface RawTeam {
  name?: string;
  score?: string | number;
  avatar?: string;
}

interface RawSource {
  id?: string;
  title?: string;
  name?: string;
  path?: string;
  url?: string;
  streamUrl?: string;
  cover?: { url?: string } | null;
}

interface RawMatch {
  id: string;
  status?: string;
  statusLive?: string | number;
  type?: SportType;
  league?: string;
  leagueId?: string;
  leagueLogo?: string;
  matchRound?: string;
  matchResult?: string;
  team1?: RawTeam;
  team2?: RawTeam;
  startTime?: string | number;
  endTime?: string | number;
  playPath?: string | null;
  playUrl?: string | null;
  streamUrl?: string | null;
  playSource?: RawSource[];
  replay?: RawSource[];
  highlights?: Array<RawSource & { duration?: string; createTime?: string; stat?: { viewCount: string } }>;
}

interface ApiEnvelope {
  status?: number | string;
  error?: string;
  message?: string;
  matches?: RawMatch[] | Record<string, RawMatch[]>;
  match?: RawMatch;
  playPath?: string | null;
  streamUrl?: string | null;
  playSources?: RawSource[];
  sources?: RawSource[];
  list?: Array<{ id: string; name?: string; localName?: string }>;
}

const cache = new Map<string, { at: number; data: ApiEnvelope }>();
const CACHE_MS = 45_000;

async function fetchSports<T extends ApiEnvelope>(path: string, signal?: AbortSignal, cacheResult = true): Promise<T> {
  const url = `${SPORTS_API}/${path}`;
  const cached = cacheResult ? cache.get(url) : undefined;
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data as T;

  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  const data = await response.json().catch(() => null) as T | null;
  if (!response.ok || !data || (typeof data.status === 'number' && data.status >= 400) || data.error) {
    throw new Error(data?.error || data?.message || `Sports API request failed (${response.status})`);
  }
  if (cacheResult) cache.set(url, { at: Date.now(), data });
  return data;
}

function collectMatches(value: ApiEnvelope['matches']): RawMatch[] {
  const entries = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.values(value).flatMap(item => Array.isArray(item) ? item : [])
      : [];
  const seen = new Set<string>();
  return entries.filter(match => {
    if (!match?.id || seen.has(String(match.id))) return false;
    seen.add(String(match.id));
    return true;
  });
}

function abbreviation(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
}

function normalizeStatus(status: unknown): Match['status'] {
  switch (String(status ?? '')) {
    case 'MatchIng': return 'MatchInProgress';
    case 'MatchNotStart': return 'MatchNotStart';
    case 'MatchEnded': return 'MatchEnded';
    default: return String(status ?? 'MatchNotStart');
  }
}

function mapSource(source: RawSource, index: number, prefix: string): PlaySource | null {
  const sourceUrl = source?.streamUrl || source?.path || source?.url;
  if (!sourceUrl) return null;
  return {
    id: String(source.id || `${prefix}-${index + 1}`),
    title: source.title || source.name || `Stream ${index + 1}`,
    path: toStreamProxyUrl(sourceUrl),
    cover: source.cover?.url ? { url: source.cover.url } : null,
  };
}

function toStreamProxyUrl(sourceUrl: string): string {
  if (!sourceUrl) return '';
  try {
    const parsed = new URL(sourceUrl, `${SPORTS_API}/`);
    const streamPath = `${new URL(SPORTS_API).pathname}/stream`;
    if (parsed.origin === new URL(SPORTS_API).origin && parsed.pathname === streamPath && parsed.searchParams.has('url')) {
      return parsed.toString();
    }
  } catch {
    return sourceUrl;
  }
  return `${SPORTS_API}/stream?url=${encodeURIComponent(sourceUrl)}`;
}

function mapMatch(raw: RawMatch): Match {
  const type: SportType = raw.type === 'basketball' ? 'basketball' : 'football';
  const team = (value?: RawTeam): SportsTeam => {
    const name = value?.name || 'Team';
    return { id: '', name, score: String(value?.score ?? '0'), avatar: value?.avatar || '', abbreviation: abbreviation(name), type };
  };
  const directPath = typeof raw.playPath === 'string' ? raw.playPath : '';
  const streamUrl = toStreamProxyUrl(raw.streamUrl || directPath || raw.playUrl || '');
  const playSource = (raw.playSource || []).map((source, index) => mapSource(source, index, String(raw.id))).filter((source): source is PlaySource => !!source);
  const replay = (raw.replay || []).map((source, index) => mapSource(source, index, `${raw.id}-replay`)).filter((source): source is PlaySource => !!source);
  const highlights = (raw.highlights || []).filter(source => !!source.path).map((source, index) => ({
    id: String(source.id || `${raw.id}-highlight-${index + 1}`),
    title: source.title || `Highlight ${index + 1}`,
    path: source.path!,
    cover: source.cover?.url ? { url: source.cover.url } : { url: '' },
    duration: source.duration || '',
    createTime: source.createTime || '',
    stat: source.stat,
  }));
  return {
    id: String(raw.id),
    team1: team(raw.team1),
    team2: team(raw.team2),
    status: normalizeStatus(raw.status),
    statusLive: String(raw.statusLive ?? ''),
    playType: '',
    playPath: streamUrl,
    streamUrl,
    startTime: String(raw.startTime ?? ''),
    endTime: String(raw.endTime ?? ''),
    type,
    timeDesc: '',
    playSource,
    highlights,
    replay,
    league: raw.league || 'Sports',
    leagueId: String(raw.leagueId || ''),
    leagueLogo: raw.leagueLogo || '',
    matchRound: raw.matchRound || '',
    matchResult: raw.matchResult || '',
    hasStream: !!(streamUrl || playSource.length),
  };
}

export async function getMatches(
  sport: SportType,
  page = 1,
  size = 24,
  competitionId?: string | null,
  signal?: AbortSignal,
  liveOnly = false,
): Promise<MatchPage> {
  const route = competitionId
    ? `league?id=${encodeURIComponent(competitionId)}`
    : liveOnly ? 'live' : 'list';
  const payload = await fetchSports<ApiEnvelope>(route, signal);
  const matches = collectMatches(payload.matches)
    .map(mapMatch)
    .filter(match => match.type === sport && (!competitionId || match.leagueId === competitionId));
  const start = Math.max(0, page - 1) * size;
  return { matches: matches.slice(start, start + size), page, size, total: matches.length };
}

export async function getMatchById(
  matchId: string,
  _sport: SportType,
  signal?: AbortSignal,
  _initialMatch?: Match,
): Promise<Match> {
  const payload = await fetchSports<ApiEnvelope & RawMatch>(`match?id=${encodeURIComponent(matchId)}`, signal);
  const raw = payload.match || payload as RawMatch;
  if (!raw?.id || String(raw.id) !== String(matchId)) throw new Error('Match not found');
  return mapMatch(raw);
}

export async function getCompetitions(sport: SportType, signal?: AbortSignal): Promise<League[]> {
  const payload = await fetchSports<ApiEnvelope>('leagues', signal);
  return (payload.list || [])
    .filter(league => league.id && league.id !== '0' && (league.name || league.localName))
    .map(league => ({
      slug: String(league.id),
      id: String(league.id),
      name: league.name || league.localName || 'Competition',
      sport,
      logo: '',
    }));
}

export async function getMatchDetail(
  matchId: string,
  sport: SportType,
  signal?: AbortSignal,
  initialMatch?: Match,
): Promise<{ match: Match; newsList: NewsItem[] }> {
  const match = await getMatchById(matchId, sport, signal, initialMatch);
  if (match.type !== sport) throw new Error('Match sport does not match the selected sport');
  if (match.hasStream) {
    const payload = await fetchSports<ApiEnvelope>(`play?id=${encodeURIComponent(matchId)}`, signal, false);
    const directUrl = payload.streamUrl || payload.playPath || match.streamUrl || match.playPath;
    const directPath = directUrl ? toStreamProxyUrl(directUrl) : '';
    const channels = (payload.playSources || payload.sources || []).map((source, index) => mapSource(source, index, `${matchId}-play`)).filter((source): source is PlaySource => !!source);
    match.playSource = [
      ...(directPath ? [{ id: `${matchId}-direct`, title: 'Direct stream', path: directPath, cover: null }] : []),
      ...channels.filter(source => source.path !== directPath),
    ];
    match.playPath = directPath;
    match.streamUrl = directPath;
    match.hasStream = match.playSource.length > 0;
  }
  return { match, newsList: [] };
}

export function isLive(match: Match): boolean {
  return match.status === 'MatchInProgress';
}

export function isEnded(match: Match): boolean {
  return match.status === 'MatchEnded';
}

function timestampMs(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed < 100_000_000_000 ? parsed * 1000 : parsed;
}

export function formatMatchTime(startTime: string): string {
  const ms = timestampMs(startTime);
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today · ${time}`;
  if (isTomorrow) return `Tomorrow · ${time}`;
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`;
}

export function formatHighlightDuration(secs: string): string {
  const s = parseInt(secs, 10) || 0;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  cover: { url: string; width?: number; height?: number };
  createdAt: string;
  detailPath: string;
  stat: { viewCount: number };
}
