import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { PersonIndex, TenseId, VerbEntry } from '../types/grammar';
import {
  classify, conjugate, conjugateAll, PARADIGM_COUNT, pickRandomFlexion, TENSE_ORDER, TENSES,
} from './conjugator';
import { KNOWN_VERBS } from './paradigms';
import { mulberry32 } from './rng';

const P: PersonIndex[] = [0, 1, 2, 3, 4, 5];

function w(inf: string, tense: TenseId, person: PersonIndex | null = null): string | null {
  return conjugate(inf, tense, person)?.word ?? null;
}
function row(inf: string, tense: TenseId): (string | null)[] {
  return P.map((p) => w(inf, tense, p));
}
function seg(inf: string, tense: TenseId, person: PersonIndex | null = null): string {
  const f = conjugate(inf, tense, person);
  assert.ok(f, `${inf} ${tense} ${person} deveria existir`);
  return f.morphemes.map((m) => m.text || '∅').join('-');
}
function verb(infinitive: string): VerbEntry {
  return {
    id: infinitive, infinitive, conjugation: 1, flexion: 'regular', rarity: 'comum', level: 1,
    definition: '', transitivity: '', synonyms: [], examples: [],
  };
}

const FULL: Record<string, Partial<Record<TenseId, (string | null)[]>>> = {
  cantar: {
    pres_ind: ['canto', 'cantas', 'canta', 'cantamos', 'cantais', 'cantam'],
    pret_perf_ind: ['cantei', 'cantaste', 'cantou', 'cantamos', 'cantastes', 'cantaram'],
    pret_imp_ind: ['cantava', 'cantavas', 'cantava', 'cantávamos', 'cantáveis', 'cantavam'],
    pret_mqp_ind: ['cantara', 'cantaras', 'cantara', 'cantáramos', 'cantáreis', 'cantaram'],
    fut_pres_ind: ['cantarei', 'cantarás', 'cantará', 'cantaremos', 'cantareis', 'cantarão'],
    fut_pret_ind: ['cantaria', 'cantarias', 'cantaria', 'cantaríamos', 'cantaríeis', 'cantariam'],
    pres_subj: ['cante', 'cantes', 'cante', 'cantemos', 'canteis', 'cantem'],
    pret_imp_subj: ['cantasse', 'cantasses', 'cantasse', 'cantássemos', 'cantásseis', 'cantassem'],
    fut_subj: ['cantar', 'cantares', 'cantar', 'cantarmos', 'cantardes', 'cantarem'],
    imp_afirm: [null, 'canta', 'cante', 'cantemos', 'cantai', 'cantem'],
    imp_neg: [null, 'cantes', 'cante', 'cantemos', 'canteis', 'cantem'],
  },
  vender: {
    pres_ind: ['vendo', 'vendes', 'vende', 'vendemos', 'vendeis', 'vendem'],
    pret_perf_ind: ['vendi', 'vendeste', 'vendeu', 'vendemos', 'vendestes', 'venderam'],
    pret_imp_ind: ['vendia', 'vendias', 'vendia', 'vendíamos', 'vendíeis', 'vendiam'],
    pret_mqp_ind: ['vendera', 'venderas', 'vendera', 'vendêramos', 'vendêreis', 'venderam'],
    fut_pres_ind: ['venderei', 'venderás', 'venderá', 'venderemos', 'vendereis', 'venderão'],
    fut_pret_ind: ['venderia', 'venderias', 'venderia', 'venderíamos', 'venderíeis', 'venderiam'],
    pres_subj: ['venda', 'vendas', 'venda', 'vendamos', 'vendais', 'vendam'],
    pret_imp_subj: ['vendesse', 'vendesses', 'vendesse', 'vendêssemos', 'vendêsseis', 'vendessem'],
    fut_subj: ['vender', 'venderes', 'vender', 'vendermos', 'venderdes', 'venderem'],
    imp_afirm: [null, 'vende', 'venda', 'vendamos', 'vendei', 'vendam'],
    imp_neg: [null, 'vendas', 'venda', 'vendamos', 'vendais', 'vendam'],
  },
  partir: {
    pres_ind: ['parto', 'partes', 'parte', 'partimos', 'partis', 'partem'],
    pret_perf_ind: ['parti', 'partiste', 'partiu', 'partimos', 'partistes', 'partiram'],
    pret_imp_ind: ['partia', 'partias', 'partia', 'partíamos', 'partíeis', 'partiam'],
    pret_mqp_ind: ['partira', 'partiras', 'partira', 'partíramos', 'partíreis', 'partiram'],
    fut_pres_ind: ['partirei', 'partirás', 'partirá', 'partiremos', 'partireis', 'partirão'],
    fut_pret_ind: ['partiria', 'partirias', 'partiria', 'partiríamos', 'partiríeis', 'partiriam'],
    pres_subj: ['parta', 'partas', 'parta', 'partamos', 'partais', 'partam'],
    pret_imp_subj: ['partisse', 'partisses', 'partisse', 'partíssemos', 'partísseis', 'partissem'],
    fut_subj: ['partir', 'partires', 'partir', 'partirmos', 'partirdes', 'partirem'],
    imp_afirm: [null, 'parte', 'parta', 'partamos', 'parti', 'partam'],
    imp_neg: [null, 'partas', 'parta', 'partamos', 'partais', 'partam'],
  },
};

describe('TENSES', () => {
  test('14 tempos com níveis do PRD §4.2', () => {
    assert.equal(TENSE_ORDER.length, 14);
    assert.equal(TENSES.pres_ind.minLevel, 1);
    assert.equal(TENSES.pret_perf_ind.minLevel, 1);
    assert.equal(TENSES.pret_imp_ind.minLevel, 1);
    assert.equal(TENSES.fut_pres_ind.minLevel, 1);
    assert.equal(TENSES.gerundio.minLevel, 1);
    assert.equal(TENSES.pret_mqp_ind.minLevel, 2);
    assert.equal(TENSES.fut_pret_ind.minLevel, 2);
    assert.equal(TENSES.pres_subj.minLevel, 2);
    assert.equal(TENSES.imp_afirm.minLevel, 2);
    assert.equal(TENSES.pret_imp_subj.minLevel, 3);
    assert.equal(TENSES.fut_subj.minLevel, 3);
    assert.equal(TENSES.participio.personal, false);
    assert.equal(TENSES.imp_neg.personal, true);
  });
});

describe('tabelas completas dos regulares', () => {
  for (const [inf, table] of Object.entries(FULL)) {
    test(inf, () => {
      for (const [tense, forms] of Object.entries(table)) {
        assert.deepEqual(row(inf, tense as TenseId), forms, `${inf} ${tense}`);
      }
    });
  }
  test('formas nominais', () => {
    assert.deepEqual(['cantar', 'vender', 'partir'].map((v) => [w(v, 'infinitivo'), w(v, 'gerundio'), w(v, 'participio')]), [
      ['cantar', 'cantando', 'cantado'],
      ['vender', 'vendendo', 'vendido'],
      ['partir', 'partindo', 'partido'],
    ]);
  });
});

describe('segmentação (PRD §5)', () => {
  test('exemplos do PRD', () => {
    assert.equal(seg('cantar', 'pret_perf_ind', 0), 'cant-e-∅-i');
    assert.equal(seg('cantar', 'pret_mqp_ind', 3), 'cant-á-ra-mos');
    assert.equal(seg('cantar', 'pret_imp_ind', 5), 'cant-a-va-m');
    assert.equal(seg('cantar', 'pret_imp_ind', 3), 'cant-á-va-mos');
    assert.equal(seg('cantar', 'pret_imp_subj', 3), 'cant-á-sse-mos');
  });
  test('alomorfe da VT em cant-e-i', () => {
    const f = conjugate('cantar', 'pret_perf_ind', 0)!;
    assert.equal(f.morphemes[1].allomorph, true);
    assert.deepEqual(f.morphemes.map((m) => m.kind), ['RAD', 'VT', 'DMT', 'DNP']);
    assert.ok(f.morphemes.every((m) => typeof m.note === 'string' && m.note.length > 0));
  });
  test('análises de referência', () => {
    assert.equal(seg('cantar', 'pres_ind', 0), 'cant-∅-∅-o');
    assert.equal(seg('cantar', 'pres_ind', 1), 'cant-a-∅-s');
    assert.equal(seg('cantar', 'fut_pres_ind', 0), 'cant-a-re-i');
    assert.equal(seg('cantar', 'fut_pres_ind', 5), 'cant-a-rã-o');
    assert.equal(seg('cantar', 'fut_pret_ind', 3), 'cant-a-ría-mos');
    assert.equal(seg('cantar', 'pres_subj', 3), 'cant-∅-e-mos');
    assert.equal(seg('vender', 'pres_subj', 3), 'vend-∅-a-mos');
    assert.equal(seg('cantar', 'fut_subj', 3), 'cant-a-r-mos');
    assert.equal(seg('cantar', 'gerundio'), 'cant-a-ndo-∅');
    assert.equal(seg('cantar', 'participio'), 'cant-a-do-∅');
    assert.equal(seg('cantar', 'infinitivo'), 'cant-a-r-∅');
    assert.equal(seg('vender', 'pret_mqp_ind', 3), 'vend-ê-ra-mos');
    assert.equal(seg('partir', 'pret_imp_subj', 3), 'part-í-sse-mos');
    assert.equal(seg('fazer', 'fut_pres_ind', 0), 'fa-∅-re-i');
  });
  test('radicais com mudança ortográfica são alomorfes segmentáveis', () => {
    for (const [inf, tense, p, s] of [
      ['ficar', 'pret_perf_ind', 0, 'fiqu-e-∅-i'],
      ['chegar', 'pret_perf_ind', 0, 'chegu-e-∅-i'],
      ['começar', 'pres_subj', 0, 'comec-∅-e-∅'],
      ['conhecer', 'pres_ind', 0, 'conheç-∅-∅-o'],
    ] as const) {
      const f = conjugate(inf, tense, p)!;
      assert.equal(seg(inf, tense, p), s);
      assert.equal(f.segmentable, true);
      assert.equal(f.morphemes[0].allomorph, true, inf);
    }
  });
  test('formas fortemente irregulares não são segmentáveis', () => {
    for (const [inf, tense, p] of [
      ['ser', 'pres_ind', 0], ['ser', 'pres_ind', 2], ['ser', 'pret_perf_ind', 2], ['ir', 'pret_perf_ind', 0],
      ['ir', 'pres_ind', 0], ['pôr', 'pret_perf_ind', 2], ['fazer', 'pret_perf_ind', 2], ['trazer', 'pret_perf_ind', 0],
      ['caber', 'pret_perf_ind', 0],
    ] as const) {
      assert.equal(conjugate(inf, tense, p)!.segmentable, false, `${inf} ${tense} ${p}`);
    }
    assert.equal(conjugate('fazer', 'pret_mqp_ind', 3)!.segmentable, true);
    assert.equal(seg('fazer', 'pret_mqp_ind', 3), 'fiz-é-ra-mos');
  });
});

const SPOT: [string, TenseId, PersonIndex | null, string][] = [
  ['ser', 'pres_ind', 0, 'sou'], ['ser', 'pres_ind', 4, 'sois'], ['ser', 'pret_imp_ind', 3, 'éramos'],
  ['ser', 'pret_perf_ind', 2, 'foi'], ['ser', 'pret_mqp_ind', 3, 'fôramos'], ['ser', 'pret_imp_subj', 3, 'fôssemos'],
  ['ser', 'fut_subj', 3, 'formos'], ['ser', 'imp_afirm', 1, 'sê'], ['ser', 'imp_afirm', 4, 'sede'], ['ser', 'participio', null, 'sido'],
  ['ir', 'pres_ind', 0, 'vou'], ['ir', 'pres_ind', 4, 'ides'], ['ir', 'pret_imp_ind', 3, 'íamos'], ['ir', 'pret_perf_ind', 0, 'fui'],
  ['ir', 'pres_subj', 0, 'vá'], ['ir', 'imp_afirm', 1, 'vai'], ['ir', 'imp_afirm', 4, 'ide'], ['ir', 'fut_pres_ind', 0, 'irei'],
  ['estar', 'pres_ind', 0, 'estou'], ['estar', 'pres_ind', 2, 'está'], ['estar', 'pret_perf_ind', 2, 'esteve'],
  ['estar', 'pres_subj', 0, 'esteja'], ['estar', 'pret_mqp_ind', 3, 'estivéramos'], ['estar', 'imp_afirm', 1, 'está'],
  ['ter', 'pres_ind', 0, 'tenho'], ['ter', 'pres_ind', 5, 'têm'], ['ter', 'pret_imp_ind', 3, 'tínhamos'],
  ['ter', 'pret_perf_ind', 2, 'teve'], ['ter', 'pret_imp_subj', 4, 'tivésseis'], ['ter', 'imp_afirm', 1, 'tem'], ['ter', 'imp_afirm', 4, 'tende'],
  ['manter', 'pres_ind', 2, 'mantém'], ['manter', 'pres_ind', 1, 'manténs'], ['conter', 'pres_ind', 5, 'contêm'],
  ['obter', 'pret_perf_ind', 0, 'obtive'], ['deter', 'pret_imp_ind', 0, 'detinha'], ['manter', 'imp_afirm', 1, 'mantém'],
  ['haver', 'pres_ind', 0, 'hei'], ['haver', 'pres_ind', 2, 'há'], ['haver', 'pres_ind', 5, 'hão'], ['haver', 'pres_subj', 0, 'haja'],
  ['haver', 'pret_perf_ind', 2, 'houve'], ['haver', 'pret_mqp_ind', 3, 'houvéramos'],
  ['vir', 'pres_ind', 0, 'venho'], ['vir', 'pres_ind', 2, 'vem'], ['vir', 'pres_ind', 3, 'vimos'], ['vir', 'pres_ind', 5, 'vêm'],
  ['vir', 'pret_perf_ind', 0, 'vim'], ['vir', 'pret_perf_ind', 2, 'veio'], ['vir', 'pret_perf_ind', 5, 'vieram'],
  ['vir', 'pret_imp_ind', 3, 'vínhamos'], ['vir', 'pret_mqp_ind', 3, 'viéramos'], ['vir', 'fut_subj', 0, 'vier'],
  ['vir', 'participio', null, 'vindo'], ['vir', 'gerundio', null, 'vindo'], ['vir', 'imp_afirm', 4, 'vinde'],
  ['convir', 'pres_ind', 2, 'convém'], ['intervir', 'pres_ind', 5, 'intervêm'], ['provir', 'pret_perf_ind', 2, 'proveio'],
  ['ver', 'pres_ind', 0, 'vejo'], ['ver', 'pres_ind', 1, 'vês'], ['ver', 'pres_ind', 4, 'vedes'], ['ver', 'pres_ind', 5, 'veem'],
  ['ver', 'pret_perf_ind', 0, 'vi'], ['ver', 'pret_perf_ind', 2, 'viu'], ['ver', 'pret_imp_subj', 3, 'víssemos'],
  ['ver', 'fut_subj', 0, 'vir'], ['ver', 'participio', null, 'visto'], ['ver', 'imp_afirm', 1, 'vê'],
  ['prever', 'pres_ind', 5, 'preveem'], ['prever', 'participio', null, 'previsto'], ['rever', 'pret_perf_ind', 0, 'revi'],
  ['dar', 'pres_ind', 0, 'dou'], ['dar', 'pres_ind', 1, 'dás'], ['dar', 'pres_ind', 5, 'dão'], ['dar', 'pret_perf_ind', 0, 'dei'],
  ['dar', 'pret_perf_ind', 2, 'deu'], ['dar', 'pret_mqp_ind', 3, 'déramos'], ['dar', 'pres_subj', 0, 'dê'],
  ['dar', 'pres_subj', 5, 'deem'], ['dar', 'pret_imp_subj', 3, 'déssemos'], ['dar', 'imp_afirm', 4, 'dai'],
  ['fazer', 'pres_ind', 0, 'faço'], ['fazer', 'pres_ind', 2, 'faz'], ['fazer', 'pret_perf_ind', 0, 'fiz'],
  ['fazer', 'pret_perf_ind', 2, 'fez'], ['fazer', 'pret_mqp_ind', 3, 'fizéramos'], ['fazer', 'fut_pres_ind', 0, 'farei'],
  ['fazer', 'fut_pret_ind', 3, 'faríamos'], ['fazer', 'participio', null, 'feito'], ['fazer', 'imp_afirm', 1, 'faz'],
  ['desfazer', 'participio', null, 'desfeito'], ['satisfazer', 'pret_perf_ind', 2, 'satisfez'], ['refazer', 'pres_subj', 0, 'refaça'],
  ['dizer', 'pres_ind', 0, 'digo'], ['dizer', 'pres_ind', 2, 'diz'], ['dizer', 'pret_perf_ind', 0, 'disse'],
  ['dizer', 'fut_pres_ind', 0, 'direi'], ['dizer', 'participio', null, 'dito'], ['bendizer', 'participio', null, 'bendito'],
  ['trazer', 'pres_ind', 0, 'trago'], ['trazer', 'pret_perf_ind', 2, 'trouxe'], ['trazer', 'fut_pres_ind', 0, 'trarei'],
  ['trazer', 'pret_imp_subj', 3, 'trouxéssemos'], ['trazer', 'participio', null, 'trazido'],
  ['caber', 'pres_ind', 0, 'caibo'], ['caber', 'pret_perf_ind', 0, 'coube'], ['caber', 'pres_subj', 3, 'caibamos'],
  ['saber', 'pres_ind', 0, 'sei'], ['saber', 'pres_subj', 0, 'saiba'], ['saber', 'pret_perf_ind', 3, 'soubemos'],
  ['poder', 'pres_ind', 0, 'posso'], ['poder', 'pret_perf_ind', 0, 'pude'], ['poder', 'pret_perf_ind', 2, 'pôde'],
  ['poder', 'pres_subj', 0, 'possa'],
  ['querer', 'pres_ind', 2, 'quer'], ['querer', 'pret_perf_ind', 0, 'quis'], ['querer', 'pres_subj', 0, 'queira'],
  ['querer', 'pret_mqp_ind', 3, 'quiséramos'],
  ['requerer', 'pres_ind', 0, 'requeiro'], ['requerer', 'pres_ind', 2, 'requer'], ['requerer', 'pret_perf_ind', 0, 'requeri'],
  ['pôr', 'infinitivo', null, 'pôr'], ['pôr', 'pres_ind', 0, 'ponho'], ['pôr', 'pres_ind', 1, 'pões'], ['pôr', 'pres_ind', 2, 'põe'],
  ['pôr', 'pres_ind', 3, 'pomos'], ['pôr', 'pres_ind', 5, 'põem'], ['pôr', 'pret_imp_ind', 3, 'púnhamos'],
  ['pôr', 'pret_perf_ind', 0, 'pus'], ['pôr', 'pret_perf_ind', 2, 'pôs'], ['pôr', 'pret_perf_ind', 3, 'pusemos'],
  ['pôr', 'pret_mqp_ind', 3, 'puséramos'], ['pôr', 'fut_pres_ind', 0, 'porei'], ['pôr', 'gerundio', null, 'pondo'],
  ['pôr', 'participio', null, 'posto'], ['pôr', 'imp_afirm', 1, 'põe'], ['pôr', 'imp_afirm', 4, 'ponde'],
  ['compor', 'infinitivo', null, 'compor'], ['compor', 'pret_perf_ind', 2, 'compôs'], ['propor', 'pres_ind', 0, 'proponho'],
  ['supor', 'participio', null, 'suposto'], ['dispor', 'pret_imp_subj', 0, 'dispusesse'], ['expor', 'pres_ind', 2, 'expõe'],
  ['ler', 'pres_ind', 0, 'leio'], ['ler', 'pres_ind', 2, 'lê'], ['ler', 'pres_ind', 5, 'leem'], ['ler', 'pret_perf_ind', 0, 'li'],
  ['ler', 'pret_imp_ind', 0, 'lia'], ['ler', 'pres_subj', 0, 'leia'], ['ler', 'participio', null, 'lido'],
  ['crer', 'pres_ind', 0, 'creio'], ['crer', 'pres_ind', 5, 'creem'], ['crer', 'pres_ind', 4, 'credes'], ['crer', 'pres_subj', 3, 'creiamos'],
  ['rir', 'pres_ind', 0, 'rio'], ['rir', 'pres_ind', 1, 'ris'], ['rir', 'pres_ind', 4, 'rides'], ['rir', 'pres_ind', 5, 'riem'],
  ['rir', 'pret_perf_ind', 0, 'ri'], ['rir', 'pres_subj', 0, 'ria'], ['sorrir', 'pres_ind', 2, 'sorri'],
  ['sair', 'pres_ind', 0, 'saio'], ['sair', 'pres_ind', 2, 'sai'], ['sair', 'pres_ind', 3, 'saímos'], ['sair', 'pres_ind', 4, 'saís'],
  ['sair', 'pret_perf_ind', 0, 'saí'], ['sair', 'pret_perf_ind', 2, 'saiu'], ['sair', 'pret_imp_ind', 0, 'saía'],
  ['sair', 'fut_subj', 1, 'saíres'], ['sair', 'fut_subj', 3, 'sairmos'], ['sair', 'participio', null, 'saído'], ['sair', 'gerundio', null, 'saindo'],
  ['cair', 'pres_ind', 5, 'caem'], ['cair', 'pres_subj', 0, 'caia'], ['sobressair', 'pres_ind', 0, 'sobressaio'],
  ['ouvir', 'pres_ind', 0, 'ouço'], ['ouvir', 'pres_subj', 3, 'ouçamos'], ['ouvir', 'pres_ind', 1, 'ouves'],
  ['pedir', 'pres_ind', 0, 'peço'], ['pedir', 'pres_subj', 2, 'peça'], ['impedir', 'pres_ind', 0, 'impeço'], ['medir', 'pres_ind', 0, 'meço'],
  ['dormir', 'pres_ind', 0, 'durmo'], ['dormir', 'pres_ind', 2, 'dorme'], ['dormir', 'pres_subj', 3, 'durmamos'],
  ['sentir', 'pres_ind', 0, 'sinto'], ['sentir', 'pres_subj', 0, 'sinta'], ['mentir', 'pres_ind', 0, 'minto'],
  ['seguir', 'pres_ind', 0, 'sigo'], ['seguir', 'pres_ind', 1, 'segues'], ['conseguir', 'pres_subj', 0, 'consiga'],
  ['servir', 'pres_ind', 0, 'sirvo'], ['ferir', 'pres_ind', 0, 'firo'], ['preferir', 'pres_subj', 0, 'prefira'],
  ['vestir', 'pres_ind', 0, 'visto'], ['despir', 'pres_ind', 0, 'dispo'], ['repetir', 'pres_ind', 0, 'repito'],
  ['convergir', 'pres_ind', 0, 'convirjo'], ['agredir', 'pres_ind', 2, 'agride'], ['prevenir', 'pres_ind', 5, 'previnem'],
  ['subir', 'pres_ind', 0, 'subo'], ['subir', 'pres_ind', 2, 'sobe'], ['subir', 'pres_subj', 0, 'suba'], ['consumir', 'pres_ind', 5, 'consomem'],
  ['fugir', 'pres_ind', 0, 'fujo'], ['fugir', 'pres_ind', 2, 'foge'], ['fugir', 'pres_subj', 0, 'fuja'],
  ['tossir', 'pres_ind', 0, 'tusso'], ['tossir', 'pres_ind', 2, 'tosse'], ['polir', 'pres_ind', 0, 'pulo'], ['polir', 'pres_ind', 2, 'pule'],
  ['polir', 'pres_ind', 3, 'polimos'], ['frigir', 'pres_ind', 0, 'frijo'], ['frigir', 'pres_ind', 2, 'frege'],
  ['cobrir', 'pres_ind', 0, 'cubro'], ['cobrir', 'participio', null, 'coberto'], ['descobrir', 'participio', null, 'descoberto'],
  ['abrir', 'participio', null, 'aberto'], ['escrever', 'participio', null, 'escrito'], ['descrever', 'participio', null, 'descrito'],
  ['perder', 'pres_ind', 0, 'perco'], ['perder', 'pres_subj', 0, 'perca'], ['valer', 'pres_ind', 0, 'valho'], ['valer', 'pres_subj', 3, 'valhamos'],
  ['ficar', 'pret_perf_ind', 0, 'fiquei'], ['ficar', 'pres_subj', 0, 'fique'], ['chegar', 'pret_perf_ind', 0, 'cheguei'],
  ['chegar', 'pres_subj', 5, 'cheguem'], ['começar', 'pret_perf_ind', 0, 'comecei'], ['começar', 'pres_ind', 0, 'começo'],
  ['conhecer', 'pres_ind', 0, 'conheço'], ['conhecer', 'pres_subj', 0, 'conheça'], ['erguer', 'pres_ind', 0, 'ergo'],
  ['erguer', 'pres_subj', 0, 'erga'], ['agir', 'pres_ind', 0, 'ajo'], ['agir', 'pres_subj', 3, 'ajamos'],
  ['distinguir', 'pres_ind', 0, 'distingo'], ['distinguir', 'pres_ind', 3, 'distinguimos'], ['proteger', 'pres_ind', 0, 'protejo'],
  ['passear', 'pres_ind', 0, 'passeio'], ['passear', 'pres_ind', 3, 'passeamos'], ['passear', 'pres_subj', 0, 'passeie'],
  ['passear', 'pres_subj', 3, 'passeemos'], ['passear', 'pret_perf_ind', 0, 'passeei'],
  ['odiar', 'pres_ind', 0, 'odeio'], ['odiar', 'pres_ind', 3, 'odiamos'], ['odiar', 'pres_subj', 0, 'odeie'],
  ['ansiar', 'pres_ind', 2, 'anseia'], ['remediar', 'pres_ind', 5, 'remedeiam'], ['incendiar', 'pres_subj', 3, 'incendiemos'],
  ['mediar', 'pres_ind', 0, 'medeio'], ['intermediar', 'pres_ind', 2, 'intermedeia'], ['copiar', 'pres_ind', 0, 'copio'],
  ['construir', 'pres_ind', 0, 'construo'], ['construir', 'pres_ind', 1, 'constróis'], ['construir', 'pres_ind', 2, 'constrói'],
  ['construir', 'pres_ind', 3, 'construímos'], ['construir', 'pres_ind', 5, 'constroem'], ['destruir', 'imp_afirm', 1, 'destrói'],
  ['possuir', 'pres_ind', 1, 'possuis'], ['possuir', 'pres_ind', 2, 'possui'], ['possuir', 'pres_ind', 4, 'possuís'],
  ['possuir', 'pret_perf_ind', 0, 'possuí'], ['possuir', 'pret_perf_ind', 2, 'possuiu'], ['possuir', 'pret_imp_ind', 0, 'possuía'],
  ['possuir', 'participio', null, 'possuído'], ['concluir', 'fut_subj', 5, 'concluírem'], ['incluir', 'pres_subj', 0, 'inclua'],
  ['produzir', 'pres_ind', 2, 'produz'], ['produzir', 'pres_ind', 0, 'produzo'], ['traduzir', 'imp_afirm', 1, 'traduz'],
  ['averiguar', 'pres_subj', 0, 'averigue'], ['averiguar', 'pret_perf_ind', 0, 'averiguei'],
  ['moer', 'pres_ind', 2, 'mói'], ['moer', 'pres_ind', 0, 'moo'], ['roer', 'pret_imp_ind', 0, 'roía'], ['moer', 'participio', null, 'moído'],
  ['voar', 'pres_ind', 0, 'voo'], ['continuar', 'pres_ind', 0, 'continuo'],
  ['abolir', 'pres_ind', 1, 'aboles'], ['abolir', 'pret_perf_ind', 0, 'aboli'], ['abolir', 'imp_afirm', 1, 'abole'],
  ['falir', 'pres_ind', 3, 'falimos'], ['falir', 'imp_afirm', 4, 'fali'], ['adequar', 'pres_ind', 3, 'adequamos'],
  ['precaver', 'pres_ind', 3, 'precavemos'], ['precaver', 'pret_perf_ind', 0, 'precavi'],
  ['reaver', 'pres_ind', 3, 'reavemos'], ['reaver', 'pret_perf_ind', 0, 'reouve'], ['reaver', 'fut_pres_ind', 0, 'reaverei'],
  ['chover', 'pres_ind', 2, 'chove'], ['chover', 'pret_perf_ind', 2, 'choveu'], ['chover', 'pres_subj', 2, 'chova'],
  ['nevar', 'pres_ind', 2, 'neva'], ['anoitecer', 'pres_subj', 2, 'anoiteça'],
  ['aprazer', 'pres_ind', 2, 'apraz'], ['aprazer', 'pret_perf_ind', 2, 'aprouve'],
  ['prover', 'pres_ind', 0, 'provejo'], ['prover', 'pret_perf_ind', 2, 'proveu'], ['prover', 'participio', null, 'provido'],
];

describe('verbos irregulares e com mudança ortográfica', () => {
  test(`${SPOT.length} formas conferidas`, () => {
    const errors: string[] = [];
    for (const [inf, tense, p, expected] of SPOT) {
      const got = w(inf, tense, p);
      if (got !== expected) errors.push(`${inf} ${tense} ${p}: esperado "${expected}", obtido "${got}"`);
    }
    assert.deepEqual(errors, []);
  });
  test('cobre pelo menos 25 verbos irregulares/ortográficos distintos', () => {
    assert.ok(new Set(SPOT.map((s) => s[0])).size >= 25);
  });
});

describe('defectivos', () => {
  test('abolir não tem 1ª p. sg. nem presente do subjuntivo', () => {
    assert.equal(conjugate('abolir', 'pres_ind', 0), null);
    assert.deepEqual(row('abolir', 'pres_subj'), [null, null, null, null, null, null]);
    assert.deepEqual(row('abolir', 'imp_neg'), [null, null, null, null, null, null]);
    assert.deepEqual(row('abolir', 'imp_afirm'), [null, 'abole', null, null, 'aboli', null]);
    assert.equal(conjugate('colorir', 'pres_ind', 0), null);
    assert.equal(w('explodir', 'pres_ind', 2), 'explode');
  });
  test('falir/precaver/adequar/reaver só têm nós/vós no presente', () => {
    for (const v of ['falir', 'precaver', 'adequar', 'reaver']) {
      const r = row(v, 'pres_ind');
      assert.deepEqual(r.map((x) => x !== null), [false, false, false, true, true, false], v);
      assert.deepEqual(row(v, 'pres_subj'), [null, null, null, null, null, null], v);
    }
  });
  test('impessoais: só 3ª pessoa e sem imperativo', () => {
    for (const v of ['chover', 'nevar']) {
      for (const t of TENSE_ORDER) {
        if (!TENSES[t].personal) continue;
        for (const p of P) {
          const f = conjugate(v, t, p);
          if (t === 'imp_afirm' || t === 'imp_neg' || (p !== 2 && p !== 5)) assert.equal(f, null, `${v} ${t} ${p}`);
          else assert.ok(f, `${v} ${t} ${p}`);
        }
      }
    }
  });
  test('poder e caber não têm imperativo; imperativo nunca tem "eu"', () => {
    assert.deepEqual(row('poder', 'imp_afirm'), [null, null, null, null, null, null]);
    assert.deepEqual(row('caber', 'imp_neg'), [null, null, null, null, null, null]);
    assert.equal(conjugate('cantar', 'imp_afirm', 0), null);
    assert.equal(conjugate('cantar', 'imp_neg', 0), null);
  });
});

describe('abundantes', () => {
  test('particípio regular no desafio e irregular na nota', () => {
    for (const [inf, reg, irr] of [
      ['aceitar', 'aceitado', 'aceito'], ['entregar', 'entregado', 'entregue'], ['imprimir', 'imprimido', 'impresso'],
      ['morrer', 'morrido', 'morto'], ['pagar', 'pagado', 'pago'], ['eleger', 'elegido', 'eleito'],
      ['extinguir', 'extinguido', 'extinto'], ['prender', 'prendido', 'preso'], ['acender', 'acendido', 'aceso'],
    ] as const) {
      const f = conjugate(inf, 'participio', null)!;
      assert.equal(f.word, reg);
      assert.ok(f.morphemes[2].note?.includes(irr), `${inf}: nota deveria citar "${irr}"`);
      assert.equal(classify(inf).flexion, 'abundante');
    }
  });
});

describe('classify', () => {
  test('conjugação, flexão e paradigma', () => {
    assert.deepEqual(classify('cantar'), { conjugation: 1, flexion: 'regular', paradigmId: 'cantar' });
    assert.deepEqual(classify('pôr'), { conjugation: 2, flexion: 'irregular', paradigmId: 'pôr' });
    assert.equal(classify('ser').flexion, 'anomalo');
    assert.equal(classify('abolir').flexion, 'defectivo');
    assert.equal(classify('partir').conjugation, 3);
  });
  test('derivados prefixados herdam o paradigma da base', () => {
    const cases: Record<string, string> = {
      desfazer: 'fazer', refazer: 'fazer', satisfazer: 'fazer',
      compor: 'pôr', propor: 'pôr', supor: 'pôr', dispor: 'pôr', repor: 'pôr', expor: 'pôr', impor: 'pôr',
      manter: 'ter', conter: 'ter', deter: 'ter', obter: 'ter', reter: 'ter', entreter: 'ter',
      prever: 'ver', rever: 'ver', convir: 'vir', intervir: 'vir', provir: 'vir',
      bendizer: 'dizer', maldizer: 'dizer', predizer: 'dizer', contradizer: 'dizer', sobressair: 'sair',
    };
    for (const [v, p] of Object.entries(cases)) assert.equal(classify(v).paradigmId, p, v);
  });
  test('falsos derivados não são capturados (meter, bater, escrever, servir)', () => {
    assert.equal(classify('meter').paradigmId, 'vender');
    assert.equal(classify('bater').paradigmId, 'vender');
    assert.equal(classify('dever').paradigmId, 'vender');
    assert.equal(classify('servir').paradigmId, 'servir');
    assert.equal(w('meter', 'pres_ind', 2), 'mete');
  });
  test('verbos desconhecidos caem no modelo regular com regras ortográficas', () => {
    assert.equal(w('trafegar', 'pret_perf_ind', 0), 'trafeguei');
    assert.equal(w('sacrificar', 'pres_subj', 0), 'sacrifique');
    assert.equal(w('esboçar', 'pret_perf_ind', 0), 'esbocei');
    assert.equal(w('enaltecer', 'pres_ind', 0), 'enalteço');
    assert.equal(w('submergir', 'pres_ind', 0), 'submerjo');
    assert.equal(w('recear', 'pres_ind', 0), 'receio');
    assert.equal(w('atribuir', 'pres_ind', 3), 'atribuímos');
    assert.equal(w('reconduzir', 'pres_ind', 2), 'reconduz');
    assert.equal(w('atrair', 'pres_ind', 0), 'atraio');
    assert.ok(PARADIGM_COUNT >= 50, `paradigmas: ${PARADIGM_COUNT}`);
  });
  test('entrada inválida lança erro', () => {
    assert.throws(() => classify('casa'));
  });
});

describe('invariantes', () => {
  test('concatenação dos 4 morfemas == palavra para todo verbo suportado', () => {
    let count = 0;
    for (const v of KNOWN_VERBS) {
      for (const f of conjugateAll(v)) {
        count++;
        assert.equal(f.morphemes.length, 4, `${v} ${f.tense}`);
        assert.deepEqual(f.morphemes.map((m) => m.kind), ['RAD', 'VT', 'DMT', 'DNP']);
        assert.equal(f.morphemes.map((m) => m.text).join(''), f.word, `${v} ${f.tense} ${f.person}`);
        assert.ok(f.word.length > 0 && f.word === f.word.normalize('NFC'));
        assert.ok(f.morphemes.every((m) => m.note), `${v} ${f.tense} ${f.person}: nota ausente`);
        if (TENSES[f.tense].personal) assert.notEqual(f.person, null);
        else assert.equal(f.person, null);
      }
    }
    assert.ok(count > 15000, `formas: ${count}`);
  });
  test('conjugateAll de um regular tem 66 formas', () => {
    assert.equal(conjugateAll('cantar').length, 6 * 9 + 5 * 2 + 3);
  });
});

describe('pickRandomFlexion', () => {
  test('respeita o nível e nunca devolve forma inexistente', () => {
    const rng = mulberry32(7);
    for (const inf of ['cantar', 'abolir', 'chover', 'poder', 'falir', 'ser']) {
      for (const level of [1, 2, 3, 4] as const) {
        for (let i = 0; i < 150; i++) {
          const { tense, person } = pickRandomFlexion(verb(inf), level, rng);
          assert.ok(TENSES[tense].minLevel <= level, `${tense} acima do nível ${level}`);
          assert.ok(conjugate(inf, tense, person), `${inf} ${tense} ${person}`);
        }
      }
    }
  });
  test('é determinístico com a mesma semente e "vós" é rara', () => {
    const a = Array.from({ length: 20 }, ((r) => () => pickRandomFlexion(verb('cantar'), 3, r))(mulberry32(1)));
    const b = Array.from({ length: 20 }, ((r) => () => pickRandomFlexion(verb('cantar'), 3, r))(mulberry32(1)));
    assert.deepEqual(a, b);
    const rng = mulberry32(3);
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 3000; i++) {
      const { person } = pickRandomFlexion(verb('vender'), 4, rng);
      if (person !== null) counts[person]++;
    }
    assert.ok(counts[4] < counts[3] / 2, `vós=${counts[4]} nós=${counts[3]}`);
    assert.ok(counts.every((c) => c > 0));
  });
});
