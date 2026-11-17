// OWNER: agente lexicon-data. Stub de contrato — substituir pela implementação.
import type { VerbEntry } from '../types/grammar';

export const LEXICON: VerbEntry[] = [];
export function getVerb(id: string): VerbEntry | undefined {
  return LEXICON.find((v) => v.id === id);
}
