// OWNER: agente srs-state. Transições puras do estado do jogo (testáveis sem React).
import {
  buildDeck,
  levelForXp,
  onCaptureSuccess,
  onReviewFail,
  onReviewSuccess,
  xpForEncounter,
} from '../engine/spacedRepetition';
import type { CaptureRecord, Challenge, DeckItem, PlayerState, VerbEntry } from '../types/grammar';
import type { EncounterOutcome } from './types';

/** Abaixo deste tamanho o baralho é reabastecido. */
export const DECK_MIN = 5;
/** Tamanho-alvo de cada reabastecimento. */
export const DECK_REFILL_SIZE = 20;
/** Máximo de verbos guardados em `recentlySkipped`. */
export const RECENTLY_SKIPPED_CAP = 15;

export interface CoreState {
  player: PlayerState;
  records: Record<string, CaptureRecord>;
  deck: DeckItem[];
}

function pushRecent(list: readonly string[], id: string): string[] {
  const next = list.filter((x) => x !== id);
  next.push(id);
  return next.slice(-RECENTLY_SKIPPED_CAP);
}

/** Garante deck.length >= DECK_MIN (se o léxico permitir), anexando itens sem duplicar. */
export function refillDeck(
  state: CoreState,
  lexicon: VerbEntry[],
  now: number,
  rng?: () => number,
): CoreState {
  if (state.deck.length >= DECK_MIN || lexicon.length === 0) return state;
  const inDeck = new Set(state.deck.map((d) => d.verbId));
  const fresh = buildDeck({
    lexicon,
    records: state.records,
    player: state.player,
    now,
    size: DECK_REFILL_SIZE,
    rng,
  }).filter((d) => !inDeck.has(d.verbId));
  if (fresh.length === 0) return state;
  return { ...state, deck: [...state.deck, ...fresh].slice(0, Math.max(DECK_REFILL_SIZE, state.deck.length)) };
}

/** Swipe para a esquerda: registra em recentlySkipped e remove o topo. */
export function applySkip(state: CoreState): CoreState {
  const top = state.deck[0];
  if (!top) return state;
  return {
    ...state,
    deck: state.deck.slice(1),
    player: { ...state.player, recentlySkipped: pushRecent(state.player.recentlySkipped, top.verbId) },
  };
}

/**
 * Fim de um encontro. Aplica as regras SRS conforme o tipo do item:
 * - 'novo' + sucesso → onCaptureSuccess; 'novo' + fuga → escapes+1 (sem registro) e o verbo
 *   entra em recentlySkipped para não reaparecer imediatamente.
 * - 'revisao' + sucesso → onReviewSuccess (que reconquista se estava 'arisco');
 *   'revisao' + falha → onReviewFail.
 * Concede XP, recalcula o nível e remove o item do baralho.
 */
export function applyEncounter(
  state: CoreState,
  challenge: Challenge,
  success: boolean,
  now: number,
): { state: CoreState; outcome: EncounterOutcome } {
  const verbId = challenge.verb.id;
  const idx = state.deck.findIndex((d) => d.verbId === verbId);
  const prev = state.records[verbId];
  const kind: DeckItem['kind'] = idx >= 0 ? state.deck[idx].kind : prev ? 'revisao' : 'novo';

  let record: CaptureRecord | undefined;
  let escapes = state.player.escapes;
  let recentlySkipped = state.player.recentlySkipped;

  if (kind === 'novo' || !prev) {
    if (success) {
      record = onCaptureSuccess(prev, verbId, challenge.tense, now);
    } else {
      escapes += 1;
      recentlySkipped = pushRecent(recentlySkipped, verbId);
    }
  } else {
    record = success ? onReviewSuccess(prev, challenge.tense, now) : onReviewFail(prev, now);
  }

  const xpGained = xpForEncounter(challenge.verb, kind, success);
  const xp = state.player.xp + xpGained;
  const level = Math.max(state.player.level, levelForXp(xp)) as PlayerState['level'];
  const leveledUp = level > state.player.level;

  const deck = idx >= 0 ? [...state.deck.slice(0, idx), ...state.deck.slice(idx + 1)] : state.deck;
  const records = record ? { ...state.records, [verbId]: record } : state.records;
  const player: PlayerState = { ...state.player, xp, level, escapes, recentlySkipped };

  return {
    state: { player, records, deck },
    outcome: { success, xpGained, leveledUp, record },
  };
}
