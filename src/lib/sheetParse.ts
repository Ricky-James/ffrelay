export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

export function timeToSeconds(s: unknown): number | null {
  const m = String(s ?? '').trim();
  if (!/^\d+(:\d+){1,2}$/.test(m)) return null;
  return m.split(':').reduce((acc, n) => acc * 60 + parseInt(n, 10), 0);
}

export function durationToMs(s: unknown): number | null {
  const secs = timeToSeconds(s);
  return secs == null ? null : secs * 1000;
}

export function teamSlug(label: string): string {
  return label.toLowerCase().replace(/^team\s+/i, '').trim().replace(/\s+/g, '-');
}

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};
export function escapeHtml(s: unknown): string {
  return String(s).replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]);
}

// Canonical key for cross-sheet game lookup. The Info sheet annotates names with
// category/version tags in parens ("Final Fantasy I (Pixel Remaster)") that the
// splits sheet leaves bare ("Final Fantasy I"), so we iteratively strip parens
// before normalising punctuation/case. The loop handles nested parens like "(PC (3D) Any%)".
export function gameKey(name: string): string {
  let s = String(name).toLowerCase();
  let prev;
  do {
    prev = s;
    s = s.replace(/\([^()]*\)/g, ' ');
  } while (s !== prev);
  return s.replace(/[^a-z0-9]+/g, ' ').trim();
}

export interface RunnerInfo { team: string; name: string; url: string | null; }
export interface CommentatorInfo { name: string; url: string | null; }
export interface GameInfoEntry {
  name: string;
  runners: RunnerInfo[];
  commentators: CommentatorInfo[];
}

// Hidden URL columns sit immediately after each name column. Only accept values
// starting with http(s):// so adjacent unrelated cells never become links.
const safeUrl = (s: string): string | null => /^https?:\/\//i.test(s) ? s : null;

// Header row needs "Game" in col 0, team columns matching "(Team )?Mog/Choco/Tonberry",
// and a commentary column whose header starts with "commenta" — matches both
// "Commentary" and "Commentators".
export function parseInfo(text: string): Map<string, GameInfoEntry> | null {
  const rows = parseCsv(text);
  const headerIdx = rows.findIndex((r) => /^game( name)?$/i.test((r[0] ?? '').trim()));
  if (headerIdx === -1) return null;
  const header = rows[headerIdx];

  const teamCols: { col: number; team: string }[] = [];
  let commentaryCol = -1;
  for (let i = 1; i < header.length; i++) {
    const raw = (header[i] ?? '').trim();
    if (!raw) continue;
    const teamMatch = raw.match(/^(?:team\s+)?(mog|choco|tonberry)$/i);
    if (teamMatch) {
      teamCols.push({ col: i, team: teamMatch[1].toLowerCase() });
      continue;
    }
    if (commentaryCol === -1 && /^commenta/i.test(raw)) commentaryCol = i;
  }

  const map = new Map<string, GameInfoEntry>();
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const name = (row[0] ?? '').trim();
    if (!name) continue;
    const runners: RunnerInfo[] = [];
    for (const c of teamCols) {
      const v = (row[c.col] ?? '').trim();
      if (!v) continue;
      runners.push({ team: c.team, name: v, url: safeUrl((row[c.col + 1] ?? '').trim()) });
    }
    let commentators: CommentatorInfo[] = [];
    if (commentaryCol >= 0) {
      // Names split on `,`, `/`, `&`, ` and `; URLs only on comma because the
      // others (especially `/`) are legitimate URL characters.
      const names = (row[commentaryCol] ?? '').split(/[,/&]| and /i).map((s) => s.trim()).filter(Boolean);
      const urls  = (row[commentaryCol + 1] ?? '').split(',').map((s) => s.trim());
      commentators = names.map((n, i) => ({ name: n, url: safeUrl(urls[i] ?? '') }));
    }
    map.set(gameKey(name), { name, runners, commentators });
  }
  return map;
}

export function linkName(p: { name: string; url: string | null }, linkClass: string): string {
  const safe = escapeHtml(p.name);
  return p.url
    ? `<a class="${linkClass}" href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer">${safe}</a>`
    : safe;
}
