// OWNER: agente srs-state. Persistência nativa (Android/iOS) com expo-sqlite (API assíncrona).
// Na web o Metro usa `progressRepo.web.ts` (localStorage), pois expo-sqlite na web exige
// cabeçalhos COOP/COEP + wasm, o que quebra hospedagem estática simples.
import * as SQLite from 'expo-sqlite';
import type { CaptureRecord, PlayerState } from '../types/grammar';
import { parseJson, sanitizePlayer, sanitizeRecord, sanitizeSettings } from './sanitize';
import type { GameSettings, ProgressRepo, ProgressSnapshot } from './types';

const DB_NAME = 'verboom-progress.db';
const KEY_PLAYER = 'player';
const KEY_SETTINGS = 'settings';

/** Migrações indexadas por `PRAGMA user_version` (a de índice i leva da versão i à i+1). */
const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS captures (
     verb_id TEXT PRIMARY KEY NOT NULL,
     status TEXT NOT NULL,
     captured_at INTEGER NOT NULL,
     stage INTEGER NOT NULL DEFAULT 0,
     due_at INTEGER NOT NULL,
     lapses INTEGER NOT NULL DEFAULT 0,
     mastered_tenses TEXT NOT NULL DEFAULT '[]'
   );
   CREATE INDEX IF NOT EXISTS idx_captures_due ON captures (due_at);
   CREATE TABLE IF NOT EXISTS kv (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL
   );`,
];

interface CaptureRow {
  verb_id: string;
  status: string;
  captured_at: number;
  stage: number;
  due_at: number;
  lapses: number;
  mastered_tenses: string;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    const target = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${target}`);
    });
    version = target;
  }
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await migrate(db);
      return db;
    })();
    // Permite nova tentativa se a abertura falhar.
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

async function setKv(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value),
  );
}

export const progressRepo: ProgressRepo = {
  async load(): Promise<ProgressSnapshot> {
    const db = await getDb();
    const rows = await db.getAllAsync<CaptureRow>('SELECT * FROM captures');
    const records: Record<string, CaptureRecord> = {};
    for (const r of rows) {
      const rec = sanitizeRecord({
        verbId: r.verb_id,
        status: r.status,
        capturedAt: r.captured_at,
        stage: r.stage,
        dueAt: r.due_at,
        lapses: r.lapses,
        masteredTenses: parseJson(r.mastered_tenses),
      });
      if (rec) records[rec.verbId] = rec;
    }
    const kvRows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM kv WHERE key IN (?, ?)',
      KEY_PLAYER,
      KEY_SETTINGS,
    );
    const kv = new Map(kvRows.map((r) => [r.key, parseJson(r.value)]));
    return {
      records,
      player: sanitizePlayer(kv.get(KEY_PLAYER)),
      settings: sanitizeSettings(kv.get(KEY_SETTINGS)),
    };
  },

  async saveRecord(r: CaptureRecord): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO captures (verb_id, status, captured_at, stage, due_at, lapses, mastered_tenses)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(verb_id) DO UPDATE SET
         status = excluded.status,
         captured_at = excluded.captured_at,
         stage = excluded.stage,
         due_at = excluded.due_at,
         lapses = excluded.lapses,
         mastered_tenses = excluded.mastered_tenses`,
      r.verbId,
      r.status,
      r.capturedAt,
      r.stage,
      r.dueAt,
      r.lapses,
      JSON.stringify(r.masteredTenses),
    );
  },

  async savePlayer(p: PlayerState): Promise<void> {
    await setKv(KEY_PLAYER, p);
  },

  async saveSettings(s: GameSettings): Promise<void> {
    await setKv(KEY_SETTINGS, s);
  },

  async reset(): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM captures; DELETE FROM kv;');
    });
  },
};

export default progressRepo;
