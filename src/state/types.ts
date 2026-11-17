// Contrato do estado global do jogo — implementado por GameProvider (agente srs-state), consumido pela UI.
import type { CaptureRecord, Challenge, DeckItem, PlayerState, VerbEntry } from '../types/grammar';

export interface EncounterOutcome {
  success: boolean;
  xpGained: number;
  leveledUp: boolean;
  /** Novo registro (undefined se o verbo novo fugiu). */
  record?: CaptureRecord;
}

export interface GameContextValue {
  ready: boolean;
  player: PlayerState;
  records: Record<string, CaptureRecord>;
  lexicon: VerbEntry[];
  /** Baralho atual (o topo é deck[0]). Reabastecido automaticamente. */
  deck: DeckItem[];
  getVerb(id: string): VerbEntry | undefined;
  /** Swipe para a esquerda: deixa passar. */
  skip(): void;
  /** Swipe para a direita: gera o desafio para o topo do baralho. */
  startEncounter(opts?: { advanced?: boolean }): Challenge | null;
  /** Fim do encontro (sucesso dentro de 3 chances ou fuga). Remove o item do topo. */
  finishEncounter(challenge: Challenge, success: boolean): EncounterOutcome;
  /** Preferências. */
  settings: { advancedMode: boolean; autoSpeak: boolean };
  setSettings(patch: Partial<GameContextValue['settings']>): void;
  resetProgress(): Promise<void>;
}
