export type CaptionCue = { start: number; end: number; text: string };

function secondsFromTimestamp(value: string): number {
  const normalized = value.trim().replace(',', '.');
  const parts = normalized.split(':');
  const time = parts.pop() || '0';
  const [whole, fraction = '0'] = time.split('.');
  const seconds = Number(whole || 0) + Number(`0.${fraction}`);
  const minutes = Number(parts.pop() || 0);
  const hours = Number(parts.pop() || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

export function parseCaptions(input: string): CaptionCue[] {
  const body = input.replace(/^\uFEFF/, '').replace(/\r/g, '').replace(/^WEBVTT[^\n]*\n/i, '');
  return body
    .split(/\n{2,}/)
    .flatMap((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      const timingIndex = lines.findIndex((line) => line.includes('-->'));
      if (timingIndex < 0) return [];
      const timing = lines[timingIndex].split('-->');
      if (timing.length < 2) return [];
      const start = secondsFromTimestamp(timing[0]);
      const end = secondsFromTimestamp(timing[1].trim().split(/\s+/)[0]);
      const text = lines.slice(timingIndex + 1)
        .join('\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
      return Number.isFinite(start) && end > start && text ? [{ start, end, text }] : [];
    })
    .sort((a, b) => a.start - b.start);
}
