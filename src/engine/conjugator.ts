// OWNER: agente engine-morphology. Stub de contrato — substituir pela implementação.
import type {
  Conjugation, ConjugatedForm, FlexionClass, NotebookLevel, PersonIndex, TenseId, TenseInfo, VerbEntry,
} from '../types/grammar';

/** Metadados dos 14 tempos/formas suportados (PRD §2). */
export const TENSES: Record<TenseId, TenseInfo> = {} as Record<TenseId, TenseInfo>;

export interface VerbClassification {
  conjugation: Conjugation;
  flexion: FlexionClass;
  /** id do paradigma (modelo de conjugação), ex.: "cantar", "vender", "partir", "ser", "fazer"... */
  paradigmId: string;
}

/** Classifica um infinitivo e associa a um paradigma (80–100 modelos no alvo final). */
export function classify(infinitive: string): VerbClassification {
  throw new Error('not implemented');
}

/** Conjuga uma forma segmentada. Retorna null quando a forma não existe (verbos defectivos). */
export function conjugate(infinitive: string, tense: TenseId, person: PersonIndex | null): ConjugatedForm | null {
  throw new Error('not implemented');
}

/** Todas as formas existentes do verbo (tabela completa). */
export function conjugateAll(infinitive: string): ConjugatedForm[] {
  throw new Error('not implemented');
}

/** Sorteio aleatório de modo/tempo/pessoa compatível com o nível do caderno (PRD §3.2.1). */
export function pickRandomFlexion(
  verb: VerbEntry,
  level: NotebookLevel,
  rng?: () => number,
): { tense: TenseId; person: PersonIndex | null } {
  throw new Error('not implemented');
}
