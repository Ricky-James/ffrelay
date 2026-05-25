import en from '../data/i18n/en.json';
import ja from '../data/i18n/ja.json';
import bossTranslations from '../data/i18n/boss-translations.json';
import categoryTranslations from '../data/i18n/category-translations.json';
import games from '../data/games.json';
import { gameKey } from './sheetParse';

export type Locale = 'en' | 'ja';
export const LOCALES: readonly Locale[] = ['en', 'ja'] as const;
export const DEFAULT_LOCALE: Locale = 'en';

const STRINGS: Record<Locale, unknown> = { en, ja };

function lookup(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// Substitutes {placeholder} tokens. Unknown tokens pass through unchanged so they
// surface in dev rather than silently dropping out.
function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function t(
  key: string,
  locale: Locale = DEFAULT_LOCALE,
  vars?: Record<string, string | number>,
): string {
  const fromLocale = lookup(STRINGS[locale], key);
  const v = typeof fromLocale === 'string' ? fromLocale : lookup(STRINGS[DEFAULT_LOCALE], key);
  if (typeof v !== 'string') return key;
  return interpolate(v, vars);
}

// Like `t` but returns the raw value (object/array/string). Useful for nav entries
// whose value is a structured object.
export function tRaw<T = unknown>(key: string, locale: Locale = DEFAULT_LOCALE): T | undefined {
  const fromLocale = lookup(STRINGS[locale], key);
  if (fromLocale !== undefined) return fromLocale as T;
  return lookup(STRINGS[DEFAULT_LOCALE], key) as T | undefined;
}

const GAME_NAME_TO_JA: Record<string, string> = Object.fromEntries(
  games.games.map((g) => [g.name, (g as { nameJa?: string }).nameJa ?? g.name]),
);

export function tGameName(englishName: string, locale: Locale = DEFAULT_LOCALE): string {
  if (locale === 'en') return englishName;
  return GAME_NAME_TO_JA[englishName] ?? englishName;
}

const BOSS_NAME_TO_JA: Record<string, string> = Object.fromEntries(
  Object.entries(bossTranslations as Record<string, string>).filter(([k]) => !k.startsWith('_')),
);

export function tBossName(englishName: string, locale: Locale = DEFAULT_LOCALE): string {
  if (locale === 'en') return englishName;
  return BOSS_NAME_TO_JA[englishName] ?? GAME_NAME_TO_JA[englishName] ?? englishName;
}

// Picks the JA sibling (`<key>Ja`) when present, else the default. Lets event.json /
// site.json stay single-source while supporting per-field JP overrides.
export function tField<T extends Record<string, unknown>, K extends Extract<keyof T, string>>(
  data: T,
  key: K,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (locale === 'ja') {
    const jaKey = `${key}Ja` as keyof T;
    const v = data[jaKey];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return String(data[key] ?? '');
}

const TEAM_NAME_TO_JA: Record<string, string> = {
  Mog: 'モーグリ',
  Choco: 'チョコボ',
  Tonberry: 'トンベリ',
};

export function tTeamName(name: string, locale: Locale = DEFAULT_LOCALE): string {
  if (locale === DEFAULT_LOCALE || !name) return name;
  const canonical = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return TEAM_NAME_TO_JA[canonical] ?? name;
}

// JA falls back to the EN channel when no `twitchJa` is configured so the embed still resolves.
export function localizedTwitchHandle(
  event: { twitch: string; twitchJa?: string },
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (locale === 'ja' && event.twitchJa) return event.twitchJa;
  return event.twitch;
}

const PLATFORMS: Set<string> = new Set(
  ((categoryTranslations as { _platforms?: string[] })._platforms ?? []),
);

// `_`-prefixed keys are metadata (e.g. `_platforms`, `_comment`) and excluded from the lookup.
const CATEGORY_TO_JA: Record<string, string> = Object.fromEntries(
  Object.entries(categoryTranslations as Record<string, unknown>)
    .filter(([k, v]) => !k.startsWith('_') && typeof v === 'string') as [string, string][],
);

// Empty in EN — callers use it as a no-op lookup table for category-token translation.
export function buildCategoryMap(locale: Locale): Record<string, string> {
  if (locale === DEFAULT_LOCALE) return {};
  return { ...CATEGORY_TO_JA };
}

// "Final Fantasy I (GBA Any%)" / "Final Fantasy I: Any% (PSP)" → localized recomposition.
// Title prefix translates via games.json (full match, then `:` strip-fallback for the
// Relay I form); paren tokens pass through if platforms, else CATEGORY_TO_JA → raw.
export function tCompoundName(rawName: string, locale: Locale = DEFAULT_LOCALE): string {
  if (locale === DEFAULT_LOCALE) return rawName;

  const parenIdx = rawName.indexOf('(');
  const titleRaw = (parenIdx >= 0 ? rawName.slice(0, parenIdx) : rawName).trim();
  const parenRaw = parenIdx >= 0 ? rawName.slice(parenIdx).trim() : '';

  let titleJp = GAME_NAME_TO_JA[titleRaw];
  if (!titleJp && titleRaw.includes(':')) {
    titleJp = GAME_NAME_TO_JA[titleRaw.split(':')[0].trim()];
  }
  const title = titleJp ?? titleRaw;

  // Split keeps separators (capture group) so original spacing is preserved on rejoin.
  const parenJp = parenRaw.replace(/\(([^)]*)\)/g, (_match, inner: string) => {
    const translated = inner.split(/(\s+|\/)/).map((tok) => {
      const trimmed = tok.trim();
      if (!trimmed) return tok;
      if (PLATFORMS.has(trimmed)) return tok;
      return CATEGORY_TO_JA[trimmed] ?? tok;
    }).join('');
    return `(${translated})`;
  });

  return parenJp ? `${title} ${parenJp}` : title;
}

// Keyed by both the exact name and `gameKey()`-normalized form so clients can resolve
// raw sheet strings carrying paren suffixes without shipping a parser.
export function buildGameNameMap(locale: Locale): Record<string, string> {
  if (locale === DEFAULT_LOCALE) return {};
  const out: Record<string, string> = {};
  for (const [en, ja] of Object.entries(GAME_NAME_TO_JA)) {
    if (ja === en) continue;
    out[en] = ja;
    out[gameKey(en)] = ja;
  }
  return out;
}

// Merged boss + game map for splits/chart. Boss names aren't gameKey-normalized —
// they rarely carry paren suffixes and normalizing risks collisions with game keys.
export function buildBossNameMap(locale: Locale): Record<string, string> {
  if (locale === DEFAULT_LOCALE) return {};
  const out: Record<string, string> = {};
  for (const [en, ja] of Object.entries(GAME_NAME_TO_JA)) {
    if (ja === en) continue;
    out[en] = ja;
    out[gameKey(en)] = ja;
  }
  for (const [en, ja] of Object.entries(BOSS_NAME_TO_JA)) {
    if (ja !== en) out[en] = ja;
  }
  return out;
}

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');

// Produces the locale-aware URL for an absolute site path. Default locale stays
// unprefixed; non-default locales get `/<locale>` inserted after the base.
// `path` is treated as site-absolute ('/schedule', '/') — base is added here.
export function localizedPath(path: string, locale: Locale = DEFAULT_LOCALE): string {
  const clean = path.replace(/^\/+/, '');
  if (locale === DEFAULT_LOCALE) {
    return BASE + clean;
  }
  return BASE + locale + (clean ? '/' + clean : '');
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'ja' : 'en';
}

// Astro.currentLocale is `string | undefined` (any string the user navigates to).
// Narrow to our Locale type with a default fallback.
export function localeFromAstro(astro: { currentLocale?: string | undefined }): Locale {
  const c = astro.currentLocale;
  return (LOCALES as readonly string[]).includes(c ?? '') ? (c as Locale) : DEFAULT_LOCALE;
}

// Reduce a pathname to a locale-agnostic route token. Handles Astro's
// `build: { format: 'file' }` output where paths carry a `.html` suffix and
// the homepage is `index.html` (or, for non-default locales, `ja.html` because
// `src/pages/ja/index.astro` collapses to a single file at the dist root).
function pathToRoute(pathname: string, locale: Locale): string {
  let p = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\/+/, '');
  p = p.replace(/\.html$/, '').replace(/\/$/, '');
  if (p === 'index') p = '';
  if (locale !== DEFAULT_LOCALE) {
    if (p === locale) {
      p = '';
    } else if (p.startsWith(locale + '/')) {
      p = p.slice(locale.length + 1);
      if (p === 'index') p = '';
    }
  }
  return p; // '', 'schedule', 'history', etc.
}

// Clean URLs (no `.html`) so hreflang / language-switcher URLs match nav links AND
// `astro dev` (which doesn't serve `.html`). Static hosts auto-resolve `/ja/schedule`.
function routeToPath(route: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) {
    return BASE + route;
  }
  return BASE + locale + (route ? '/' + route : '');
}

// Strips the leading `/<locale>` segment from a pathname so the language switcher
// can target the same page in the other locale. Pathname is the URL pathname
// (already includes base), not a site-absolute route.
export function stripLocaleFromPath(pathname: string, locale: Locale): string {
  return routeToPath(pathToRoute(pathname, locale), DEFAULT_LOCALE);
}

// Normalize to clean-URL form. Without this, `<link rel="canonical">` inherits `.html`
// from `Astro.url.pathname` while hreflang alternates don't — keeps the two forms in sync.
export function canonicalPath(pathname: string, locale: Locale): string {
  return routeToPath(pathToRoute(pathname, locale), locale);
}

// Given the current URL pathname and locale, return the equivalent pathname in
// the other locale. Used by the EN/JA switcher + hreflang alternates to stay
// on the same logical page across locales.
export function pathInOtherLocale(pathname: string, locale: Locale): string {
  return routeToPath(pathToRoute(pathname, locale), otherLocale(locale));
}
