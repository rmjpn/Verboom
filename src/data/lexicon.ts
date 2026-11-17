// OWNER: agente lexicon-data.
// Léxico curado (semente). Definições e frases são originais — não copiadas de dicionários protegidos.
// A importação dos ~11.000 verbos de fonte licenciada é uma fase posterior (PRD §2).
import type { Rarity, VerbEntry } from '../types/grammar';
import level1 from './verbs.level1.json';
import level2 from './verbs.level2.json';
import level3 from './verbs.level3.json';
import level4 from './verbs.level4.json';

/** Todos os verbos, ordenados por nível do caderno (1 → 4). */
export const LEXICON: VerbEntry[] = [
  ...(level1 as VerbEntry[]),
  ...(level2 as VerbEntry[]),
  ...(level3 as VerbEntry[]),
  ...(level4 as VerbEntry[]),
];

/** Índice por id (slug). */
export const LEXICON_BY_ID: ReadonlyMap<string, VerbEntry> = new Map(LEXICON.map((v) => [v.id, v]));

export function getVerb(id: string): VerbEntry | undefined {
  return LEXICON_BY_ID.get(id);
}

/** Quantidade de verbos por raridade. */
export function countByRarity(): Record<Rarity, number> {
  const counts: Record<Rarity, number> = { comum: 0, incomum: 0, raro: 0, lendario: 0 };
  for (const v of LEXICON) counts[v.rarity] += 1;
  return counts;
}
