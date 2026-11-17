// OWNER: agente srs-state. Contrato de persistência do progresso (igual em nativo e web).
import type { CaptureRecord, PlayerState } from '../types/grammar';

export interface GameSettings {
  advancedMode: boolean;
  autoSpeak: boolean;
}

export interface ProgressSnapshot {
  records: Record<string, CaptureRecord>;
  /** Sempre preenchido (DEFAULT_PLAYER quando não há nada salvo). */
  player: PlayerState;
  /** null quando o usuário nunca salvou preferências. */
  settings: GameSettings | null;
}

export interface ProgressRepo {
  load(): Promise<ProgressSnapshot>;
  saveRecord(r: CaptureRecord): Promise<void>;
  savePlayer(p: PlayerState): Promise<void>;
  saveSettings(s: GameSettings): Promise<void>;
  /** Apaga todo o progresso (registros, jogador e preferências). */
  reset(): Promise<void>;
}

export const DEFAULT_SETTINGS: GameSettings = { advancedMode: false, autoSpeak: true };

export function defaultPlayer(): PlayerState {
  return { xp: 0, level: 1, escapes: 0, recentlySkipped: [] };
}
