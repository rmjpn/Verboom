// OWNER: agente engine-morphology. Utilidades de texto puras (sem React/Expo).

/** Minúsculas + trim + NFC + espaços colapsados. Acentos são preservados. */
export function normalizeText(s: string): string {
  return s.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Remove diacríticos (acentos, til, cedilha). Usado só para diagnósticos ("errou só o acento"). */
export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

const ACCENT: Record<string, string> = { a: 'á', e: 'ê', i: 'í', o: 'ô' };
const UNACCENT: Record<string, string> = { á: 'a', â: 'a', é: 'e', ê: 'e', í: 'i', ó: 'o', ô: 'o', ú: 'u' };

/** Acentua uma vogal temática (a→á, e→ê, i→í, o→ô). Outros textos voltam inalterados. */
export function accentVowel(v: string): string {
  return ACCENT[v] ?? v;
}

/** Alterna o acento da primeira letra (á↔a, ê↔e…), útil para distratores. */
export function toggleAccent(s: string): string {
  if (!s) return s;
  const first = s[0];
  if (UNACCENT[first]) return UNACCENT[first] + s.slice(1);
  if (ACCENT[first]) return (first === 'e' ? 'é' : ACCENT[first]) + s.slice(1);
  return s;
}

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
