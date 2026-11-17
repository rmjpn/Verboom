// OWNER: agente srs-state. Validação defensiva de dados persistidos (versões antigas / corrupção).
import type { CaptureRecord, NotebookLevel, PlayerState, TenseId } from '../types/grammar';
import { defaultPlayer, type GameSettings } from './types';

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function parseJson(raw: string | null | undefined): unknown {
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function sanitizeRecord(v: unknown): CaptureRecord | null {
  if (!isObj(v) || typeof v.verbId !== 'string' || !v.verbId) return null;
  const status = v.status === 'arisco' ? 'arisco' : 'capturado';
  const now = Date.now();
  const tenses = Array.isArray(v.masteredTenses)
    ? (v.masteredTenses.filter((t) => typeof t === 'string') as TenseId[])
    : [];
  return {
    verbId: v.verbId,
    status,
    capturedAt: num(v.capturedAt, now),
    stage: Math.min(4, Math.max(0, Math.floor(num(v.stage, 0)))),
    dueAt: num(v.dueAt, now),
    lapses: Math.max(0, Math.floor(num(v.lapses, 0))),
    masteredTenses: [...new Set(tenses)],
  };
}

export function sanitizePlayer(v: unknown): PlayerState {
  const d = defaultPlayer();
  if (!isObj(v)) return d;
  const level = num(v.level, 1);
  return {
    xp: Math.max(0, num(v.xp, 0)),
    level: (level >= 1 && level <= 4 ? Math.floor(level) : 1) as NotebookLevel,
    escapes: Math.max(0, Math.floor(num(v.escapes, 0))),
    recentlySkipped: Array.isArray(v.recentlySkipped)
      ? v.recentlySkipped.filter((s): s is string => typeof s === 'string')
      : [],
  };
}

export function sanitizeSettings(v: unknown): GameSettings | null {
  if (!isObj(v)) return null;
  return {
    advancedMode: typeof v.advancedMode === 'boolean' ? v.advancedMode : false,
    autoSpeak: typeof v.autoSpeak === 'boolean' ? v.autoSpeak : true,
  };
}
