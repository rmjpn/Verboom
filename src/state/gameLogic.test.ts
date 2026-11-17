/// <reference types="node" />
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DAY_MS } from '../engine/spacedRepetition';
import type { Challenge, NotebookLevel, VerbEntry } from '../types/grammar';
import { DECK_MIN, RECENTLY_SKIPPED_CAP, applyEncounter, applySkip, refillDeck, type CoreState } from './gameLogic';

const NOW = Date.UTC(2026, 0, 1);

function verb(id: string, level: NotebookLevel = 1): VerbEntry {
  return {
    id,
    infinitive: id,
    conjugation: 1,
    flexion: 'regular',
    rarity: 'comum',
    level,
    definition: '',
    transitivity: '',
    synonyms: [],
    examples: [],
  };
}

function challenge(v: VerbEntry): Challenge {
  return {
    verb: v,
    tense: 'pres_ind',
    person: 0,
    form: { tense: 'pres_ind', person: 0, word: 'x', morphemes: [], segmentable: true },
    mode: 'blocks',
    options: {},
  };
}

const LEX = Array.from({ length: 30 }, (_, i) => verb(`v${i}`));

function fresh(): CoreState {
  return { player: { xp: 0, level: 1, escapes: 0, recentlySkipped: [] }, records: {}, deck: [] };
}

describe('gameLogic', () => {
  it('refillDeck enche o baralho e não duplica', () => {
    const s = refillDeck(fresh(), LEX, NOW);
    assert.equal(s.deck.length, 20);
    const again = refillDeck({ ...s, deck: s.deck.slice(0, 3) }, LEX, NOW);
    const ids = again.deck.map((d) => d.verbId);
    assert.ok(ids.length >= DECK_MIN);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(refillDeck(fresh(), [], NOW).deck, []);
  });

  it('applySkip remove o topo e limita recentlySkipped', () => {
    let s = refillDeck(fresh(), LEX, NOW);
    const top = s.deck[0].verbId;
    s = applySkip(s);
    assert.equal(s.player.recentlySkipped.at(-1), top);
    assert.ok(!s.deck.some((d) => d.verbId === top));
    for (let i = 0; i < 30; i++) s = refillDeck(applySkip(s), LEX, NOW);
    assert.equal(s.player.recentlySkipped.length, RECENTLY_SKIPPED_CAP);
  });

  it('captura de verbo novo cria registro, dá XP e remove do baralho', () => {
    const s = refillDeck(fresh(), LEX, NOW);
    const v = LEX.find((x) => x.id === s.deck[0].verbId)!;
    const { state, outcome } = applyEncounter(s, challenge(v), true, NOW);
    assert.equal(outcome.xpGained, 10);
    assert.equal(outcome.record?.status, 'capturado');
    assert.equal(state.records[v.id].dueAt, NOW + DAY_MS);
    assert.equal(state.deck.length, s.deck.length - 1);
    assert.equal(state.player.xp, 10);
  });

  it('verbo novo que foge: sem registro, escapes+1, XP de consolação', () => {
    const s = refillDeck(fresh(), LEX, NOW);
    const v = LEX.find((x) => x.id === s.deck[0].verbId)!;
    const { state, outcome } = applyEncounter(s, challenge(v), false, NOW);
    assert.equal(outcome.record, undefined);
    assert.equal(outcome.xpGained, 2);
    assert.equal(state.player.escapes, 1);
    assert.equal(state.records[v.id], undefined);
  });

  it('revisão: falha → arisco; acerto → reconquista; level up', () => {
    const v = LEX[0];
    const base: CoreState = {
      player: { xp: 245, level: 1, escapes: 0, recentlySkipped: [] },
      records: {
        v0: {
          verbId: 'v0',
          status: 'capturado',
          capturedAt: 0,
          stage: 2,
          dueAt: NOW - 1,
          lapses: 0,
          masteredTenses: [],
        },
      },
      deck: [{ verbId: 'v0', kind: 'revisao' }],
    };
    const fail = applyEncounter(base, challenge(v), false, NOW);
    assert.equal(fail.outcome.record?.status, 'arisco');
    assert.equal(fail.outcome.record?.lapses, 1);
    assert.equal(fail.outcome.leveledUp, false);

    const win = applyEncounter({ ...fail.state, deck: [{ verbId: 'v0', kind: 'revisao' }] }, challenge(v), true, NOW);
    assert.equal(win.outcome.record?.status, 'capturado');
    assert.equal(win.outcome.record?.stage, 0);
    assert.equal(win.outcome.xpGained, 6);
    assert.equal(win.state.player.xp, 253);
    assert.equal(win.state.player.level, 2);
    assert.equal(win.outcome.leveledUp, true);
  });
});
