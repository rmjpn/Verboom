// OWNER: agente engine-morphology. Stub de contrato — substituir pela implementação.
import type { AttemptResult, Challenge, MorphemeKind, NotebookLevel, PersonIndex, TenseId, VerbEntry } from '../types/grammar';

export type SlotKind = Exclude<MorphemeKind, 'RAD'>;
export type BlockAnswer = Partial<Record<SlotKind, string>>;

/** Normaliza para comparação (minúsculas, trim). Acentos SÃO relevantes na resposta final. */
export function normalize(s: string): string {
  throw new Error('not implemented');
}

/** Monta um encontro de captura: sorteia flexão, segmenta e gera distratores plausíveis. */
export function buildChallenge(
  verb: VerbEntry,
  level: NotebookLevel,
  opts?: { rng?: () => number; advanced?: boolean; tense?: TenseId; person?: PersonIndex | null },
): Challenge {
  throw new Error('not implemented');
}

/** Valida uma tentativa. Em modo 'blocks' recebe BlockAnswer; em modo 'type' recebe a terminação/forma digitada. */
export function checkAttempt(challenge: Challenge, answer: BlockAnswer | string): AttemptResult {
  throw new Error('not implemented');
}

/** Explicação didática de cada morfema para a "Dissecação Morfológica" (PRD §3.3.5). */
export function explainMorphemes(challenge: Challenge): { kind: MorphemeKind; text: string; explanation: string }[] {
  throw new Error('not implemented');
}

/** Frase-modelo com pista temporal usando a forma conjugada, ex.: "Ontem, nós cantamos." */
export function modelSentence(challenge: Challenge): string {
  throw new Error('not implemented');
}
