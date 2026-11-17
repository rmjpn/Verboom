// OWNER: agente srs-state. Motor puro de repetição espaçada, XP e baralho (PRD §4).
// Sem imports de React/React Native/Expo.
import type {
  CaptureRecord,
  DeckItem,
  NotebookLevel,
  PlayerState,
  Rarity,
  TenseId,
  VerbEntry,
} from '../types/grammar';

/** Intervalos em dias (PRD §4.1). O índice é `CaptureRecord.stage`. */
export const INTERVAL_DAYS = [1, 3, 7, 15, 30] as const;
/** Último estágio possível (30 dias). */
export const MAX_STAGE = INTERVAL_DAYS.length - 1;

export const DAY_MS = 24 * 60 * 60 * 1000;

export const LEVEL_NAMES: Record<NotebookLevel, string> = {
  1: 'Caderno de Caligrafia',
  2: 'Caderno Brochura',
  3: 'Caderno Universitário',
  4: 'Grimório do Léxico',
};

/** XP mínimo (inclusivo) para estar em cada nível. */
export const LEVEL_THRESHOLDS: Record<NotebookLevel, number> = {
  1: 0,
  2: 250,
  3: 800,
  4: 2000,
};

/** XP por captura de verbo novo, por raridade. */
export const XP_BY_RARITY: Record<Rarity, number> = {
  comum: 10,
  incomum: 20,
  raro: 35,
  lendario: 60,
};
/** Fração do XP de captura concedida numa revisão bem-sucedida. */
export const REVIEW_XP_FACTOR = 0.6;
/** XP de consolação quando o verbo foge / a revisão falha. */
export const CONSOLATION_XP = 2;

/** Proporção de revisões no baralho (PRD §4.1: 70% novos / 30% revisões). */
export const REVIEW_RATIO = 0.3;
/** Entre os verbos novos: fração do nível atual do jogador (o resto vem de níveis inferiores). */
export const CURRENT_LEVEL_RATIO = 0.6;

const LEVELS: NotebookLevel[] = [1, 2, 3, 4];

/* ---------------- XP e níveis ---------------- */

/** Nível do caderno para um total de XP (1 a partir de 0, 2 de 250, 3 de 800, 4 de 2000). */
export function levelForXp(xp: number): NotebookLevel {
  let level: NotebookLevel = 1;
  for (const l of LEVELS) if (xp >= LEVEL_THRESHOLDS[l]) level = l;
  return level;
}

/**
 * Progresso dentro do nível atual.
 * - `current`: XP acumulado desde o limiar do nível atual (`xp - LEVEL_THRESHOLDS[nivel]`).
 * - `next`: XP total que o nível atual exige para chegar ao próximo
 *   (`LEVEL_THRESHOLDS[nivel+1] - LEVEL_THRESHOLDS[nivel]`), ou `null` no nível 4.
 * Barra de progresso: `current / next`. Faltam `next - current` XP para subir.
 * Ex.: xp=300 → nível 2 → { current: 50, next: 550 }.
 */
export function xpToNextLevel(xp: number): { current: number; next: number | null } {
  const safeXp = Math.max(0, xp);
  const level = levelForXp(safeXp);
  const base = LEVEL_THRESHOLDS[level];
  const current = safeXp - base;
  if (level === 4) return { current, next: null };
  const nextLevel = (level + 1) as NotebookLevel;
  return { current, next: LEVEL_THRESHOLDS[nextLevel] - base };
}

/** XP de um encontro: captura (raridade), revisão (60% arredondado) ou consolação (2). */
export function xpForEncounter(verb: VerbEntry, kind: 'novo' | 'revisao', success: boolean): number {
  if (!success) return CONSOLATION_XP;
  const base = XP_BY_RARITY[verb.rarity] ?? XP_BY_RARITY.comum;
  return kind === 'novo' ? base : Math.round(base * REVIEW_XP_FACTOR);
}

/* ---------------- Transições SRS ---------------- */

function addTense(list: readonly TenseId[], tense: TenseId): TenseId[] {
  return list.includes(tense) ? [...list] : [...list, tense];
}

/**
 * Captura inicial ou reconquista.
 * - sem registro: status 'capturado', estágio 0, revisão em 1 dia, lapses 0.
 * - registro 'arisco' (reconquista): volta a 'capturado', estágio 0, revisão em 1 dia,
 *   mantém lapses e capturedAt original.
 * - registro 'capturado' (caso defensivo): idem, reinicia o ciclo no estágio 0.
 */
export function onCaptureSuccess(
  prev: CaptureRecord | undefined,
  verbId: string,
  tense: TenseId,
  now: number,
): CaptureRecord {
  return {
    verbId,
    status: 'capturado',
    capturedAt: prev?.capturedAt ?? now,
    stage: 0,
    dueAt: now + INTERVAL_DAYS[0] * DAY_MS,
    lapses: prev?.lapses ?? 0,
    masteredTenses: addTense(prev?.masteredTenses ?? [], tense),
  };
}

/**
 * Revisão: acertou dentro das 3 chances → avança um estágio (máx. 4 = 30 dias).
 * Se o registro estava 'arisco', o acerto é uma reconquista (delegado a `onCaptureSuccess`).
 */
export function onReviewSuccess(rec: CaptureRecord, tense: TenseId, now: number): CaptureRecord {
  if (rec.status === 'arisco') return onCaptureSuccess(rec, rec.verbId, tense, now);
  const stage = Math.min(Math.max(0, rec.stage) + 1, MAX_STAGE);
  return {
    ...rec,
    status: 'capturado',
    stage,
    dueAt: now + INTERVAL_DAYS[stage] * DAY_MS,
    masteredTenses: addTense(rec.masteredTenses, tense),
  };
}

/** Revisão: errou 3 vezes → status "arisco", lapses+1, estágio 0, vence imediatamente (PRD §4.1). */
export function onReviewFail(rec: CaptureRecord, now: number): CaptureRecord {
  return {
    ...rec,
    status: 'arisco',
    stage: 0,
    lapses: rec.lapses + 1,
    dueAt: now,
    masteredTenses: [...rec.masteredTenses],
  };
}

/* ---------------- Baralho ---------------- */

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Intercala as revisões de forma uniforme entre os novos, preservando a ordem de cada lista. */
function interleave(news: DeckItem[], reviews: DeckItem[]): DeckItem[] {
  const total = news.length + reviews.length;
  if (reviews.length === 0) return [...news];
  if (news.length === 0) return [...reviews];
  const out: DeckItem[] = [];
  let n = 0;
  let r = 0;
  for (let i = 0; i < total; i++) {
    // Insere revisão quando a proporção acumulada de revisões fica abaixo da ideal.
    const idealReviews = ((i + 1) * reviews.length) / total;
    if (r < reviews.length && (r < Math.round(idealReviews) || n >= news.length)) {
      out.push(reviews[r++]);
    } else {
      out.push(news[n++]);
    }
  }
  return out;
}

/**
 * Gera o baralho mesclando ~70% verbos novos e ~30% revisões vencidas (PRD §4.1).
 *
 * - Revisões: registros com `dueAt <= now` cujo verbo existe no léxico; 'arisco' primeiro,
 *   depois os mais atrasados. Revisões puladas recentemente vão para o fim da fila.
 * - Novos: verbos do léxico sem registro, com `verb.level <= player.level`, excluindo
 *   `player.recentlySkipped`; ~60% do nível atual e ~40% de níveis inferiores (embaralhados).
 * - Se um lado não tem itens suficientes, completa com o outro. Sem duplicatas.
 * - Último recurso: se ainda faltar, usa verbos novos pulados recentemente (evita baralho vazio
 *   quando o jogador pulou tudo).
 * - Determinístico dado `rng`.
 */
export function buildDeck(args: {
  lexicon: VerbEntry[];
  records: Record<string, CaptureRecord>;
  player: PlayerState;
  now: number;
  size: number;
  rng?: () => number;
}): DeckItem[] {
  const { lexicon, records, player, now } = args;
  const rng = args.rng ?? Math.random;
  const size = Math.max(0, Math.floor(args.size));
  if (lexicon.length === 0 || size === 0) return [];

  const skipped = new Set(player.recentlySkipped);
  const lexiconIds = new Set<string>();
  const uniqueLexicon: VerbEntry[] = [];
  for (const v of lexicon) {
    if (lexiconIds.has(v.id)) continue;
    lexiconIds.add(v.id);
    uniqueLexicon.push(v);
  }

  // --- revisões vencidas ---
  const due = Object.values(records)
    .filter((r) => r && r.dueAt <= now && lexiconIds.has(r.verbId))
    .sort((a, b) => {
      const sa = skipped.has(a.verbId) ? 1 : 0;
      const sb = skipped.has(b.verbId) ? 1 : 0;
      if (sa !== sb) return sa - sb;
      const pa = a.status === 'arisco' ? 0 : 1;
      const pb = b.status === 'arisco' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (a.dueAt !== b.dueAt) return a.dueAt - b.dueAt;
      return a.verbId < b.verbId ? -1 : a.verbId > b.verbId ? 1 : 0;
    });

  // --- verbos novos ---
  const unlocked = uniqueLexicon.filter((v) => !records[v.id] && v.level <= player.level);
  const fresh = unlocked.filter((v) => !skipped.has(v.id));
  const currentPool = shuffle(
    fresh.filter((v) => v.level === player.level),
    rng,
  );
  const lowerPool = shuffle(
    fresh.filter((v) => v.level < player.level),
    rng,
  );

  // Ordena os novos: mistura nível atual / inferiores na proporção 60/40.
  const newOrdered: VerbEntry[] = [];
  let ci = 0;
  let li = 0;
  while (ci < currentPool.length || li < lowerPool.length) {
    const takenCurrent = ci;
    const total = ci + li;
    const wantCurrent = takenCurrent < Math.round((total + 1) * CURRENT_LEVEL_RATIO);
    if ((wantCurrent && ci < currentPool.length) || li >= lowerPool.length) {
      newOrdered.push(currentPool[ci++]);
    } else {
      newOrdered.push(lowerPool[li++]);
    }
  }

  // --- cotas ---
  let reviewQuota = Math.round(size * REVIEW_RATIO);
  let newQuota = size - reviewQuota;
  if (due.length < reviewQuota) {
    newQuota += reviewQuota - due.length;
    reviewQuota = due.length;
  }
  if (newOrdered.length < newQuota) {
    const missing = newQuota - newOrdered.length;
    newQuota = newOrdered.length;
    reviewQuota = Math.min(due.length, reviewQuota + missing);
  }

  const reviews: DeckItem[] = due.slice(0, reviewQuota).map((r) => ({ verbId: r.verbId, kind: 'revisao' }));
  const news: DeckItem[] = newOrdered.slice(0, newQuota).map((v) => ({ verbId: v.id, kind: 'novo' }));
  const deck = interleave(news, reviews);

  // Último recurso: verbos novos pulados recentemente (mais antigos primeiro).
  if (deck.length < size) {
    const unlockedIds = new Set(unlocked.map((v) => v.id));
    for (const id of player.recentlySkipped) {
      if (deck.length >= size) break;
      if (unlockedIds.has(id) && !deck.some((d) => d.verbId === id)) {
        deck.push({ verbId: id, kind: 'novo' });
      }
    }
  }
  return deck;
}
