import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Challenge, PersonIndex, TenseId, VerbEntry } from '../types/grammar';
import { conjugateAll, TENSE_ORDER, TENSES } from './conjugator';
import {
  buildChallenge, checkAttempt, explainMorphemes, modelSentence, mulberry32, normalize,
} from './morphemeParser';
import { KNOWN_VERBS } from './paradigms';

function verb(infinitive: string): VerbEntry {
  return {
    id: infinitive, infinitive, conjugation: 1, flexion: 'regular', rarity: 'comum', level: 1,
    definition: '', transitivity: '', synonyms: [], examples: [],
  };
}
function ch(inf: string, tense: TenseId, person: PersonIndex | null, opts: { advanced?: boolean; seed?: number } = {}): Challenge {
  return buildChallenge(verb(inf), 4, { tense, person, advanced: opts.advanced, rng: mulberry32(opts.seed ?? 1) });
}
function correctBlocks(c: Challenge) {
  return { VT: c.form.morphemes[1].text, DMT: c.form.morphemes[2].text, DNP: c.form.morphemes[3].text };
}

describe('normalize', () => {
  test('minúsculas, trim e NFC, mantendo acentos', () => {
    assert.equal(normalize('  CANTÁVAMOS '), 'cantávamos');
    assert.equal(normalize('canté'), 'canté');
    assert.notEqual(normalize('cantávamos'), normalize('cantavamos'));
  });
});

describe('buildChallenge', () => {
  test('respeita tempo/pessoa pedidos e escolhe o modo', () => {
    const c = ch('cantar', 'pret_mqp_ind', 3);
    assert.equal(c.form.word, 'cantáramos');
    assert.equal(c.mode, 'blocks');
    assert.equal(ch('cantar', 'pret_mqp_ind', 3, { advanced: true }).mode, 'type');
    assert.equal(ch('ser', 'pres_ind', 0).mode, 'type');
    assert.equal(ch('ir', 'fut_pres_ind', 0).mode, 'type');
  });
  test('sorteio sem tempo respeita o nível', () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 200; i++) {
      const c = buildChallenge(verb('vender'), 1, { rng });
      assert.ok(TENSES[c.tense].minLevel <= 1);
      assert.equal(c.form.tense, c.tense);
      assert.equal(c.form.person, c.person);
    }
  });
  test('forma inexistente pedida cai num sorteio válido', () => {
    const c = buildChallenge(verb('abolir'), 4, { tense: 'pres_ind', person: 0, rng: mulberry32(5) });
    assert.ok(c.form);
    assert.ok(!(c.tense === 'pres_ind' && c.person === 0));
  });
  test('opções: correta presente, únicas, 4 por slot e sem combinação ambígua', () => {
    let checked = 0;
    for (const inf of ['cantar', 'vender', 'partir', 'ficar', 'fazer', 'ter', 'sair', 'possuir', 'passear', 'chover', 'pôr']) {
      for (const tense of TENSE_ORDER) {
        const persons: (PersonIndex | null)[] = TENSES[tense].personal ? [0, 1, 2, 3, 4, 5] : [null];
        for (const p of persons) {
          for (const seed of [1, 2, 3]) {
            const c = buildChallenge(verb(inf), 4, { tense, person: p, rng: mulberry32(seed) });
            if (c.tense !== tense || c.person !== p || c.mode !== 'blocks') continue;
            checked++;
            const right = correctBlocks(c);
            const rad = c.form.morphemes[0].text;
            for (const slot of ['VT', 'DMT', 'DNP'] as const) {
              const opts = c.options[slot]!;
              assert.equal(opts.length, 4, `${inf} ${tense} ${p} ${slot}: ${JSON.stringify(opts)}`);
              assert.equal(new Set(opts).size, opts.length, `${inf} ${tense} ${p} ${slot} duplicada`);
              assert.ok(opts.includes(right[slot]), `${inf} ${tense} ${p} ${slot} sem a correta`);
            }
            for (const v of c.options.VT!) for (const d of c.options.DMT!) for (const n of c.options.DNP!) {
              if (v === right.VT && d === right.DMT && n === right.DNP) continue;
              assert.notEqual(rad + v + d + n, c.form.word, `${inf} ${tense} ${p}: combinação ambígua ${v}|${d}|${n}`);
            }
          }
        }
      }
    }
    assert.ok(checked > 500, `desafios verificados: ${checked}`);
  });
  test('é determinístico com rng semeado', () => {
    const a = buildChallenge(verb('partir'), 3, { rng: mulberry32(42) });
    const b = buildChallenge(verb('partir'), 3, { rng: mulberry32(42) });
    assert.deepEqual(a, b);
  });
  test('todos os verbos suportados geram desafios em todos os níveis', () => {
    const rng = mulberry32(2024);
    for (const inf of KNOWN_VERBS) {
      for (const level of [1, 2, 3, 4] as const) {
        const c = buildChallenge(verb(inf), level, { rng });
        assert.ok(c.form.word, inf);
        if (c.mode === 'blocks') assert.ok(c.options.VT && c.options.DMT && c.options.DNP);
      }
    }
  });
});

describe('checkAttempt — blocos', () => {
  test('resposta certa', () => {
    const c = ch('cantar', 'pret_imp_ind', 3);
    assert.deepEqual(checkAttempt(c, { VT: 'á', DMT: 'va', DNP: 'mos' }), { correct: true, wrongSlots: [] });
  });
  test('"∅" da UI vale como morfema zero', () => {
    const c = ch('cantar', 'pret_perf_ind', 0);
    assert.equal(checkAttempt(c, { VT: 'e', DMT: '∅', DNP: 'i' }).correct, true);
    assert.equal(checkAttempt(c, { VT: 'e', DMT: '', DNP: 'i' }).correct, true);
  });
  test('aponta o slot errado sem revelar a resposta', () => {
    const c = ch('cantar', 'pret_imp_ind', 3);
    const r = checkAttempt(c, { VT: 'á', DMT: 'va', DNP: 'm' });
    assert.equal(r.correct, false);
    assert.deepEqual(r.wrongSlots, ['DNP']);
    assert.equal(r.hint, 'A desinência número-pessoal não indica a 1ª pessoa do plural.');
    assert.ok(!r.hint!.includes('"mos"'));
  });
  test('erro só de acento gera dica específica', () => {
    const c = ch('cantar', 'pret_imp_ind', 3);
    const r = checkAttempt(c, { VT: 'a', DMT: 'va', DNP: 'mos' });
    assert.deepEqual(r.wrongSlots, ['VT']);
    assert.match(r.hint!, /acentuação/);
  });
  test('vários slots errados', () => {
    const c = ch('vender', 'pret_mqp_ind', 3);
    const r = checkAttempt(c, { VT: 'a', DMT: 'va', DNP: 'mos' });
    assert.deepEqual(r.wrongSlots, ['VT', 'DMT']);
    assert.match(r.hint!, /outro bloco/);
  });
  test('DMT errada menciona o tempo pedido', () => {
    const c = ch('partir', 'pret_imp_subj', 0);
    const r = checkAttempt(c, { VT: 'i', DMT: 'ra', DNP: '' });
    assert.deepEqual(r.wrongSlots, ['DMT']);
    assert.match(r.hint!, /Pretérito Imperfeito do Subjuntivo/);
  });
});

describe('checkAttempt — digitação', () => {
  test('aceita a palavra inteira ou só a terminação', () => {
    const c = ch('cantar', 'pret_mqp_ind', 3, { advanced: true });
    assert.equal(checkAttempt(c, 'cantáramos').correct, true);
    assert.equal(checkAttempt(c, 'áramos').correct, true);
    assert.equal(checkAttempt(c, '-áramos').correct, true);
    assert.equal(checkAttempt(c, '  CANTÁRAMOS ').correct, true);
  });
  test('acento é obrigatório, com dica "Quase!"', () => {
    const c = ch('cantar', 'pret_mqp_ind', 3, { advanced: true });
    const r = checkAttempt(c, 'cantaramos');
    assert.equal(r.correct, false);
    assert.equal(r.hint, 'Quase! Confira a acentuação.');
    assert.equal(checkAttempt(c, 'aramos').hint, 'Quase! Confira a acentuação.');
  });
  test('forma irregular digitada inteira', () => {
    const c = ch('ser', 'pres_ind', 0);
    assert.equal(c.mode, 'type');
    assert.equal(checkAttempt(c, 'sou').correct, true);
    const r = checkAttempt(c, 'so');
    assert.equal(r.correct, false);
    assert.match(r.hint!, /irregular/);
    assert.ok(!r.hint!.includes('sou'));
    assert.equal(checkAttempt(ch('pôr', 'pret_perf_ind', 2), 'pos').hint, 'Quase! Confira a acentuação.');
  });
  test('imperativo negativo aceita com ou sem "não"', () => {
    const c = ch('cantar', 'imp_neg', 1, { advanced: true });
    assert.equal(c.form.word, 'cantes');
    assert.equal(checkAttempt(c, 'cantes').correct, true);
    assert.equal(checkAttempt(c, 'não cantes').correct, true);
  });
  test('dicas para pessoa errada', () => {
    const c = ch('vender', 'pres_ind', 3, { advanced: true });
    const r = checkAttempt(c, 'vendem');
    assert.equal(r.correct, false);
    assert.match(r.hint!, /1ª pessoa do plural/);
    const r2 = checkAttempt(c, 'vendiamos');
    assert.match(r2.hint!, /desinência número-pessoal está certa/);
  });
});

describe('explainMorphemes', () => {
  test('quatro explicações, com TEM e desinência zero', () => {
    const c = ch('cantar', 'pret_imp_ind', 2);
    const ex = explainMorphemes(c);
    assert.deepEqual(ex.map((e) => e.kind), ['RAD', 'VT', 'DMT', 'DNP']);
    assert.deepEqual(ex.map((e) => e.text), ['cant', 'a', 'va', '']);
    assert.match(ex[1].explanation, /TEM\) = RAD \+ VT = "canta"/);
    assert.match(ex[3].explanation, /zero/);
  });
  test('VT zero e alomorfe', () => {
    assert.match(explainMorphemes(ch('cantar', 'pres_subj', 0))[1].explanation, /zero/);
    assert.match(explainMorphemes(ch('cantar', 'pret_perf_ind', 0))[1].explanation, /[Aa]lomorfe/);
    assert.match(explainMorphemes(ch('ficar', 'pret_perf_ind', 0))[0].explanation, /[Aa]lomorfe gráfico/);
  });
  test('forma irregular', () => {
    const ex = explainMorphemes(ch('ser', 'pres_ind', 2));
    assert.match(ex[0].explanation, /irregular/);
    assert.equal(ex.length, 4);
  });
  test('todas as formas de todos os verbos têm explicações não vazias', () => {
    for (const inf of ['cantar', 'fazer', 'ir', 'sair', 'chover', 'aceitar']) {
      for (const f of conjugateAll(inf)) {
        const c = ch(inf, f.tense, f.person);
        for (const e of explainMorphemes(c)) assert.ok(e.explanation.length > 10, `${inf} ${f.tense} ${f.person} ${e.kind}`);
      }
    }
  });
});

describe('modelSentence', () => {
  test('frases com pista temporal', () => {
    assert.equal(modelSentence(ch('cantar', 'pret_perf_ind', 3)), 'Ontem, nós cantamos.');
    assert.equal(modelSentence(ch('cantar', 'pres_ind', 0)), 'Todos os dias, eu canto.');
    assert.equal(modelSentence(ch('cantar', 'pret_imp_subj', 5)), 'Se eles cantassem, tudo seria diferente.');
    assert.equal(modelSentence(ch('cantar', 'imp_afirm', 1)), 'Canta, tu!');
    assert.equal(modelSentence(ch('cantar', 'imp_neg', 1)), 'Não cantes, tu!');
    assert.equal(modelSentence(ch('cantar', 'gerundio', null)), 'Estou cantando agora.');
    assert.equal(modelSentence(ch('chover', 'pret_perf_ind', 2)), 'Ontem, choveu.');
  });
  test('toda forma gera frase contendo a palavra', () => {
    for (const inf of ['vender', 'ser', 'nevar', 'pôr']) {
      for (const f of conjugateAll(inf)) {
        const s = modelSentence(ch(inf, f.tense, f.person));
        assert.ok(s.toLowerCase().includes(f.word), `${inf}: ${s}`);
        assert.match(s, /[.!]$/);
      }
    }
  });
});
