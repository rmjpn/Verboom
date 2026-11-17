// OWNER: agente srs-state. Persistência web com localStorage (fallback em memória).
// O Metro escolhe este arquivo automaticamente na plataforma web.
import type { CaptureRecord, PlayerState } from '../types/grammar';
import { parseJson, sanitizePlayer, sanitizeRecord, sanitizeSettings } from './sanitize';
import type { GameSettings, ProgressRepo, ProgressSnapshot } from './types';

/** Subconjunto de `Storage` usado (facilita testes). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PREFIX = 'verboom:v1:';
const KEY_RECORDS = `${PREFIX}records`;
const KEY_PLAYER = `${PREFIX}player`;
const KEY_SETTINGS = `${PREFIX}settings`;

/** Storage em memória (não persiste entre recarregamentos). */
export function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
}

/** Retorna o localStorage se utilizável (modo privado, SSR, bloqueio de cookies → null). */
function detectLocalStorage(): KeyValueStorage | null {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (!ls) return null;
    const probe = `${PREFIX}__probe__`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

/**
 * Cria um repositório sobre um key-value storage síncrono. Se `storage` for null ou falhar
 * (ex.: cota excedida), os dados continuam válidos em memória durante a sessão.
 */
export function createKeyValueProgressRepo(storage: KeyValueStorage | null): ProgressRepo {
  const memory = createMemoryStorage();

  function read(key: string): unknown {
    let raw: string | null = null;
    try {
      raw = storage ? storage.getItem(key) : null;
    } catch {
      raw = null;
    }
    if (raw == null) raw = memory.getItem(key);
    return parseJson(raw);
  }

  function write(key: string, value: unknown): void {
    const raw = JSON.stringify(value);
    memory.setItem(key, raw);
    try {
      storage?.setItem(key, raw);
    } catch (e) {
      console.warn('[verboom] Falha ao gravar no localStorage; mantendo em memória.', e);
    }
  }

  function remove(key: string): void {
    memory.removeItem(key);
    try {
      storage?.removeItem(key);
    } catch {
      /* ignora */
    }
  }

  function readRecords(): Record<string, CaptureRecord> {
    const raw = read(KEY_RECORDS);
    const out: Record<string, CaptureRecord> = {};
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const v of Object.values(raw as Record<string, unknown>)) {
        const rec = sanitizeRecord(v);
        if (rec) out[rec.verbId] = rec;
      }
    }
    return out;
  }

  return {
    async load(): Promise<ProgressSnapshot> {
      return {
        records: readRecords(),
        player: sanitizePlayer(read(KEY_PLAYER)),
        settings: sanitizeSettings(read(KEY_SETTINGS)),
      };
    },
    async saveRecord(r: CaptureRecord): Promise<void> {
      const records = readRecords();
      records[r.verbId] = r;
      write(KEY_RECORDS, records);
    },
    async savePlayer(p: PlayerState): Promise<void> {
      write(KEY_PLAYER, p);
    },
    async saveSettings(s: GameSettings): Promise<void> {
      write(KEY_SETTINGS, s);
    },
    async reset(): Promise<void> {
      remove(KEY_RECORDS);
      remove(KEY_PLAYER);
      remove(KEY_SETTINGS);
    },
  };
}

export const progressRepo: ProgressRepo = createKeyValueProgressRepo(detectLocalStorage());

export default progressRepo;
