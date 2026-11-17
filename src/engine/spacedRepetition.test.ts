/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CaptureRecord, NotebookLevel, PlayerState, Rarity, VerbEntry } from '../types/grammar';
import {
  DAY_MS,
  INTERVAL_DAYS,
  LEVEL_THRESHOLDS,
  buildDeck,
  levelForXp,
  onCaptureSuccess,
  onReviewFail,
  onReviewSuccess,
  xpForEncounter,
  xpToNextLevel,
} from './spacedRepetition';

const NOW = Date.UTC(2026, 0, 1);

function verb(id: string, level: NotebookLevel = 1, rarity: Rarity = 'comum'): VerbEntry {
  return {
    id,
    infinitive: id,
    conjugation: 1,
    flexion: 'regular',
    rarity,
    level,
    definition: 'def',
    transitivity: 'intransitivo',
    synonyms: [],
    examples: [],
  };
}

function player(over: Partial<PlayerState> = {}): PlayerState {
  return { xp: 0, level: 1, escapes: 0, recentlySkipped: [], ...over };
}

/** PRNG determinístico (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rec(verbId: string, over: Partial<CaptureRecord> = {}): CaptureRecord {
  return {
    verbId,
    status: 'capturado',
    capturedAt: NOW - 10 * DAY_MS,
    stage: 0,
    dueAt: NOW - DAY_MS,
    lapses: 0,
    masteredTenses: ['pres_ind'],
    ...over,
  };
}

describe('SRS — progressão de intervalos', () => {
  it('captura inicial: capturado, estágio 0, revisão em 1 dia', () => {
    const r = onCaptureSuccess(undefined, 'cantar', 'pres_ind', NOW);
    assert.equal(r.status, 'capturado');
    assert.equal(r.stage, 0);
    assert.equal(r.dueAt, NOW + DAY_MS);
    assert.equal(r.lapses, 0);
    assert.equal(r.capturedAt, NOW);
    assert.deepEqual(r.masteredTenses, ['pres_ind']);
  });

  it('revisões avançam 1 → 3 → 7 → 15 → 30 → 30 dias', () => {
    let r = onCaptureSuccess(undefined, 'cantar', 'pres_ind', NOW);
    const gaps: number[] = [];
    let t = NOW;
    for (let i = 0; i < 5; i++) {
      t = r.dueAt;
      r = onReviewSuccess(r, 'pres_ind', t);
      gaps.push((r.dueAt - t) / DAY_MS);
    }
    assert.deepEqual(gaps, [3, 7, 15, 30, 30]);
    assert.equal(r.stage, INTERVAL_DAYS.length - 1);
  });

  it('acumula tempos dominados sem repetir', () => {
    let r = onCaptureSuccess(undefined, 'cantar', 'pres_ind', NOW);
    r = onReviewSuccess(r, 'pret_perf_ind', NOW);
    r = onReviewSuccess(r, 'pres_ind', NOW);
    assert.deepEqual(r.masteredTenses, ['pres_ind', 'pret_perf_ind']);
  });

  it('não muta o registro anterior', () => {
    const r = onCaptureSuccess(undefined, 'cantar', 'pres_ind', NOW);
    const snapshot = structuredClone(r);
    onReviewSuccess(r, 'fut_subj', NOW);
    onReviewFail(r, NOW);
    assert.deepEqual(r, snapshot);
  });
});

describe('SRS — fluxo arisco', () => {
  it('falha na revisão → arisco, lapses+1, estágio 0, vence agora', () => {
    const r = onReviewFail(rec('cantar', { stage: 3, lapses: 1, dueAt: NOW - 5 }), NOW);
    assert.equal(r.status, 'arisco');
    assert.equal(r.lapses, 2);
    assert.equal(r.stage, 0);
    assert.equal(r.dueAt, NOW);
  });

  it('reconquista via onCaptureSuccess mantém lapses e capturedAt', () => {
    const arisco = onReviewFail(rec('cantar', { stage: 2 }), NOW);
    const back = onCaptureSuccess(arisco, 'cantar', 'pret_imp_ind', NOW + 1000);
    assert.equal(back.status, 'capturado');
    assert.equal(back.stage, 0);
    assert.equal(back.lapses, 1);
    assert.equal(back.capturedAt, arisco.capturedAt);
    assert.equal(back.dueAt, NOW + 1000 + DAY_MS);
    assert.deepEqual(back.masteredTenses, ['pres_ind', 'pret_imp_ind']);
  });

  it('onReviewSuccess num arisco também reconquista (estágio 0, 1 dia)', () => {
    const arisco = onReviewFail(rec('cantar', { stage: 4 }), NOW);
    const back = onReviewSuccess(arisco, 'pres_ind', NOW);
    assert.equal(back.status, 'capturado');
    assert.equal(back.stage, 0);
    assert.equal(back.dueAt, NOW + DAY_MS);
    assert.equal(back.lapses, 1);
  });
});

describe('XP e níveis', () => {
  it('XP por raridade, revisão 60% e consolação', () => {
    assert.equal(xpForEncounter(verb('a', 1, 'comum'), 'novo', true), 10);
    assert.equal(xpForEncounter(verb('a', 1, 'incomum'), 'novo', true), 20);
    assert.equal(xpForEncounter(verb('a', 1, 'raro'), 'novo', true), 35);
    assert.equal(xpForEncounter(verb('a', 1, 'lendario'), 'novo', true), 60);
    assert.equal(xpForEncounter(verb('a', 1, 'comum'), 'revisao', true), 6);
    assert.equal(xpForEncounter(verb('a', 1, 'incomum'), 'revisao', true), 12);
    assert.equal(xpForEncounter(verb('a', 1, 'raro'), 'revisao', true), 21);
    assert.equal(xpForEncounter(verb('a', 1, 'lendario'), 'revisao', true), 36);
    assert.equal(xpForEncounter(verb('a', 1, 'lendario'), 'novo', false), 2);
    assert.equal(xpForEncounter(verb('a', 1, 'comum'), 'revisao', false), 2);
  });

  it('limiares de nível', () => {
    assert.deepEqual(LEVEL_THRESHOLDS, { 1: 0, 2: 250, 3: 800, 4: 2000 });
    assert.equal(levelForXp(0), 1);
    assert.equal(levelForXp(249), 1);
    assert.equal(levelForXp(250), 2);
    assert.equal(levelForXp(799), 2);
    assert.equal(levelForXp(800), 3);
    assert.equal(levelForXp(1999), 3);
    assert.equal(levelForXp(2000), 4);
    assert.equal(levelForXp(99999), 4);
  });

  it('xpToNextLevel', () => {
    assert.deepEqual(xpToNextLevel(0), { current: 0, next: 250 });
    assert.deepEqual(xpToNextLevel(100), { current: 100, next: 250 });
    assert.deepEqual(xpToNextLevel(300), { current: 50, next: 550 });
    assert.deepEqual(xpToNextLevel(800), { current: 0, next: 1200 });
    assert.deepEqual(xpToNextLevel(2500), { current: 500, next: null });
  });
});

describe('buildDeck', () => {
  /** 40 verbos por nível (níveis 1..4). */
  const LEX: VerbEntry[] = ([1, 2, 3, 4] as NotebookLevel[]).flatMap((lvl) =>
    Array.from({ length: 40 }, (_, i) => verb(`v${lvl}_${i}`, lvl)),
  );
  const byId = new Map(LEX.map((v) => [v.id, v]));

  /** 15 registros vencidos de nível 1 + 5 ainda não vencidos. */
  function someRecords(): Record<string, CaptureRecord> {
    const out: Record<string, CaptureRecord> = {};
    for (let i = 0; i < 15; i++) out[`v1_${i}`] = rec(`v1_${i}`, { dueAt: NOW - i * 1000 });
    for (let i = 15; i < 20; i++) out[`v1_${i}`] = rec(`v1_${i}`, { dueAt: NOW + DAY_MS });
    return out;
  }

  it('léxico vazio → []', () => {
    assert.deepEqual(buildDeck({ lexicon: [], records: {}, player: player(), now: NOW, size: 20 }), []);
  });

  it('~70% novos / ~30% revisões', () => {
    const deck = buildDeck({
      lexicon: LEX,
      records: someRecords(),
      player: player({ level: 2 }),
      now: NOW,
      size: 20,
      rng: seeded(1),
    });
    assert.equal(deck.length, 20);
    assert.equal(deck.filter((d) => d.kind === 'revisao').length, 6);
    assert.equal(deck.filter((d) => d.kind === 'novo').length, 14);
    // revisões intercaladas, não todas no início
    const firstHalfReviews = deck.slice(0, 10).filter((d) => d.kind === 'revisao').length;
    assert.ok(firstHalfReviews >= 2 && firstHalfReviews <= 4, `revisões na 1ª metade: ${firstHalfReviews}`);
  });

  it('revisões: arisco primeiro, depois as mais atrasadas; nunca as não vencidas', () => {
    const records = someRecords();
    records.v1_3 = rec('v1_3', { status: 'arisco', dueAt: NOW });
    const deck = buildDeck({ lexicon: LEX, records, player: player(), now: NOW, size: 10, rng: seeded(2) });
    const reviews = deck.filter((d) => d.kind === 'revisao').map((d) => d.verbId);
    assert.equal(reviews.length, 3);
    assert.deepEqual(reviews, ['v1_3', 'v1_14', 'v1_13']);
    for (const d of deck) if (d.kind === 'revisao') assert.ok(records[d.verbId].dueAt <= NOW);
  });

  it('sem duplicatas e novos nunca têm registro', () => {
    const records = someRecords();
    for (let seed = 0; seed < 20; seed++) {
      const deck = buildDeck({ lexicon: LEX, records, player: player({ level: 4 }), now: NOW, size: 40, rng: seeded(seed) });
      const ids = deck.map((d) => d.verbId);
      assert.equal(new Set(ids).size, ids.length);
      for (const d of deck) if (d.kind === 'novo') assert.equal(records[d.verbId], undefined);
    }
  });

  it('léxico com ids duplicados não gera duplicatas', () => {
    const deck = buildDeck({ lexicon: [verb('a'), verb('a'), verb('b')], records: {}, player: player(), now: NOW, size: 5 });
    assert.deepEqual(deck.map((d) => d.verbId).sort(), ['a', 'b']);
  });

  it('exclui verbos pulados recentemente', () => {
    const skippedIds = Array.from({ length: 15 }, (_, i) => `v1_${i}`);
    const deck = buildDeck({
      lexicon: LEX,
      records: {},
      player: player({ recentlySkipped: skippedIds }),
      now: NOW,
      size: 20,
      rng: seeded(3),
    });
    assert.equal(deck.length, 20);
    for (const d of deck) assert.ok(!skippedIds.includes(d.verbId), d.verbId);
  });

  it('pulados só voltam como último recurso', () => {
    const lex = [verb('a'), verb('b'), verb('c')];
    const deck = buildDeck({ lexicon: lex, records: {}, player: player({ recentlySkipped: ['a', 'b'] }), now: NOW, size: 5 });
    assert.deepEqual(deck.map((d) => d.verbId), ['c', 'a', 'b']);
  });

  it('respeita o nível do jogador e mistura ~60% atual / ~40% inferiores', () => {
    const deck = buildDeck({ lexicon: LEX, records: {}, player: player({ level: 2 }), now: NOW, size: 20, rng: seeded(4) });
    assert.equal(deck.length, 20);
    const levels = deck.map((d) => byId.get(d.verbId)!.level);
    assert.ok(levels.every((l) => l <= 2));
    assert.equal(levels.filter((l) => l === 2).length, 12);
    assert.equal(levels.filter((l) => l === 1).length, 8);

    const deck1 = buildDeck({ lexicon: LEX, records: {}, player: player({ level: 1 }), now: NOW, size: 20, rng: seeded(4) });
    assert.ok(deck1.every((d) => byId.get(d.verbId)!.level === 1));
  });

  it('completa com o outro lado quando falta', () => {
    // Sem revisões vencidas → só novos.
    const onlyNew = buildDeck({ lexicon: LEX, records: {}, player: player(), now: NOW, size: 20, rng: seeded(5) });
    assert.equal(onlyNew.length, 20);
    assert.ok(onlyNew.every((d) => d.kind === 'novo'));

    // Todos os verbos liberados capturados e vencidos → só revisões.
    const records: Record<string, CaptureRecord> = {};
    for (const v of LEX.filter((x) => x.level === 1)) records[v.id] = rec(v.id);
    const onlyReview = buildDeck({ lexicon: LEX, records, player: player(), now: NOW, size: 20, rng: seeded(5) });
    assert.equal(onlyReview.length, 20);
    assert.ok(onlyReview.every((d) => d.kind === 'revisao'));
  });

  it('determinístico com o mesmo rng', () => {
    const a = buildDeck({ lexicon: LEX, records: someRecords(), player: player({ level: 3 }), now: NOW, size: 20, rng: seeded(9) });
    const b = buildDeck({ lexicon: LEX, records: someRecords(), player: player({ level: 3 }), now: NOW, size: 20, rng: seeded(9) });
    assert.deepEqual(a, b);
  });

  it('ignora registros de verbos fora do léxico', () => {
    const deck = buildDeck({
      lexicon: [verb('a')],
      records: { fantasma: rec('fantasma') },
      player: player(),
      now: NOW,
      size: 5,
    });
    assert.deepEqual(deck, [{ verbId: 'a', kind: 'novo' }]);
  });
});
