// WWE API client — wraps https://wweapi.nabees.online
// Provides paginated channel listing + per-video detail.

import { WWE_API_BASE } from './config';

export interface WWEThumbnails {
  small: string;
  medium: string;
  large: string;
  hd: string;
  full?: string;
}

export interface WWEVideo {
  id: string;
  title: string;
  duration: number;
  createdAt: string;
  thumbnails: WWEThumbnails;
  streamUrl: string;
}

export interface WWEChannelResponse {
  success: boolean;
  channel: string;
  page: number;
  hasNextPage: boolean;
  nextPage: number | null;
  total: number;
  videos: WWEVideo[];
}

export interface WWEDetailsResponse {
  success: boolean;
  video: WWEVideo & {
    description: string;
    aspectRatio: number;
    category: string;
    views: number;
    channel: {
      id: string;
      name: string;
      displayName: string;
      isArtist: boolean;
      logo: string;
      stats: { followers: number; views: number; videos: number };
    };
    tags: string[];
  };
}

async function fetchJSON<T>(url: string, timeoutMs = 12_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function getWWEChannel(page = 1, channel = 'wwe'): Promise<WWEChannelResponse> {
  return fetchJSON<WWEChannelResponse>(
    `${WWE_API_BASE}/channel?c=${encodeURIComponent(channel)}&p=${page}`,
  );
}

export function getWWEDetails(xid: string): Promise<WWEDetailsResponse> {
  return fetchJSON<WWEDetailsResponse>(`${WWE_API_BASE}/details?xid=${encodeURIComponent(xid)}`);
}

export function formatWWEDuration(secs: number): string {
  if (!Number.isFinite(secs) || secs <= 0) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export function formatWWEDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function formatViews(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Parse a WWE title like "WWE SMACKDOWN 05 JUNE 2003 FULL SHOW" into:
 *   { show: 'SMACKDOWN', date: '05 JUNE 2003' }
 * Falls back gracefully if the pattern doesn't match.
 */
export function parseWWETitle(title: string): { show: string | null; date: string | null } {
  const upper = title.toUpperCase();
  const showMatch = upper.match(/\b(SMACKDOWN|RAW|WRESTLEMANIA|NXT|SURVIVOR\s+SERIES|ROYAL\s+RUMBLE|SUMMERSLAM|BACKLASH|EXTREME\s+RULES|MONEY\s+IN\s+THE\s+BANK|HELL\s+IN\s+A\s+CELL|TLC|PAYBACK|CLASH)\b/);
  const dateMatch = upper.match(/\b\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+\d{4}\b/);
  return {
    show: showMatch ? showMatch[1].replace(/\s+/g, ' ') : null,
    date: dateMatch ? dateMatch[0] : null,
  };
}