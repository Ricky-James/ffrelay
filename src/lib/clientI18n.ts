// Helpers for the inline <script> blocks. Plain browser-safe TS — no Astro or
// Node deps, no JSON tables (those stay server-side in i18n.ts).

// Unknown `{tokens}` pass through unchanged so missing keys surface in dev.
export function fillTemplate(tpl: string | undefined, vars: Record<string, string | number>): string {
  return String(tpl || '').replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

// Falls back to `{}` so a missing/malformed data-* attribute can't break the script.
export function readDataJson<T = Record<string, string>>(
  el: HTMLElement,
  attr: string,
): T {
  try {
    return JSON.parse(el.dataset[attr] || '{}') as T;
  } catch {
    return {} as T;
  }
}

export function makeTranslator(map: Record<string, string>): (name: string) => string {
  return (name) => map[name] ?? name;
}

// For dynamic compound names like "Final Fantasy VI (Pixel Remaster)". `titleMap` is
// pre-built with both exact and gameKey-normalized keys so a paren suffix doesn't
// break the lookup; the original suffix is spliced back in unchanged.
export function makeCompoundTranslator(
  titleMap: Record<string, string>,
  gameKey: (s: string) => string,
): (name: string) => string {
  return (name) => {
    const titleJp = titleMap[name] ?? titleMap[gameKey(name)];
    if (!titleJp) return name;
    const parenIdx = name.indexOf('(');
    return parenIdx >= 0 ? `${titleJp} ${name.slice(parenIdx)}` : titleJp;
  };
}

// `undefined` on EN preserves the user's system default formatting (en-GB vs en-US).
export function intlLocaleFor(locale: string): string | undefined {
  return locale === 'ja' ? 'ja-JP' : undefined;
}

// Mirror of i18n.ts TEAM_NAME_TO_JA. Tiny fixed map — inlined rather than shipped via data-*.
const TEAM_NAME_TO_JA: Record<string, string> = {
  Mog: 'モーグリ',
  Choco: 'チョコボ',
  Tonberry: 'トンベリ',
};

export function tTeamName(name: string, locale: string): string {
  if (locale !== 'ja' || !name) return name;
  const canonical = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return TEAM_NAME_TO_JA[canonical] ?? name;
}
