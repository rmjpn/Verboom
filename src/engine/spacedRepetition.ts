// OWNER: agente srs-state. Stub de contrato — substituir pela implementação.
import type { CaptureRecord, DeckItem, NotebookLevel, PlayerState, TenseId, VerbEntry } from '../types/grammar';

/** Intervalos em dias (PRD §4.1). */
export const INTERVAL_DAYS = [1, 3, 7, 15, 30] as const;
export const LEVEL_NAMES: Record<NotebookLevel, string> = {
  1: 'Caderno de Caligrafia',
  2: 'Caderno Brochura',
  3: 'Caderno Universitário',
  4: 'Grimório do Léxico',
};

export function levelForXp(xp: number): NotebookLevel { throw new Error('not implemented'); }
export function xpToNextLevel(xp: number): { current: number; next: number | null } { throw new Error('not implemented'); }
export function xpForEncounter(verb: VerbEntry, kind: 'novo' | 'revisao', success: boolean): number { throw new Error('not implemented'); }

/** Captura inicial ou reconquista. */
export function onCaptureSuccess(prev: CaptureRecord | undefined, verbId: string, tense: TenseId, now: number): CaptureRecord { throw new Error('not implemented'); }
/** Revisão: acertou dentro das 3 chances. */
export function onReviewSuccess(rec: CaptureRecord, tense: TenseId, now: number): CaptureRecord { throw new Error('not implemented'); }
/** Revisão: errou 3 vezes → status "arisco" (PRD §4.1). */
export function onReviewFail(rec: CaptureRecord, now: number): CaptureRecord { throw new Error('not implemented'); }

/** Gera o baralho mesclando ~70% verbos novos e ~30% revisões vencidas (PRD §4.1). */
export function buildDeck(args: {
  lexicon: VerbEntry[];
  records: Record<string, CaptureRecord>;
  player: PlayerState;
  now: number;
  size: number;
  rng?: () => number;
}): DeckItem[] { throw new Error('not implemented'); }
