import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEXICON, LEXICON_BY_ID, countByRarity, getVerb } from './lexicon';
import type { Conjugation, FlexionClass, NotebookLevel, Rarity } from '../types/grammar';

const LEVEL_OF: Record<Rarity, NotebookLevel> = { comum: 1, incomum: 2, raro: 3, lendario: 4 };
const FLEXIONS: FlexionClass[] = ['regular', 'irregular', 'anomalo', 'defectivo', 'abundante'];

function expectedConjugation(inf: string): Conjugation | null {
  if (inf.endsWith('ar')) return 1;
  if (inf.endsWith('er') || inf.endsWith('or') || inf.endsWith('ôr')) return 2;
  if (inf.endsWith('ir')) return 3;
  return null;
}

test('tem pelo menos 350 verbos', () => {
  assert.ok(LEXICON.length >= 350, `apenas ${LEXICON.length} verbos`);
});

test('ids são únicos e iguais ao infinitivo', () => {
  const seen = new Set<string>();
  for (const v of LEXICON) {
    assert.ok(!seen.has(v.id), `id duplicado: ${v.id}`);
    seen.add(v.id);
    assert.equal(v.id, v.infinitive, `id != infinitivo: ${v.id}`);
    assert.match(v.id, /^[a-zà-ú]+$/, `id inválido: ${v.id}`);
  }
  assert.equal(LEXICON_BY_ID.size, LEXICON.length);
});

test('campos obrigatórios preenchidos e flexão válida', () => {
  for (const v of LEXICON) {
    for (const field of ['id', 'infinitive', 'definition', 'transitivity'] as const) {
      assert.ok(typeof v[field] === 'string' && v[field].trim().length > 0, `${v.id}: ${field} vazio`);
    }
    assert.ok(FLEXIONS.includes(v.flexion), `${v.id}: flexão inválida ${v.flexion}`);
    assert.ok(Array.isArray(v.synonyms), `${v.id}: synonyms não é array`);
    for (const s of v.synonyms) assert.ok(s.trim().length > 0, `${v.id}: sinônimo vazio`);
    for (const e of v.examples) assert.ok(e.trim().length > 0, `${v.id}: exemplo vazio`);
  }
});

test('conjugação corresponde à terminação do infinitivo', () => {
  for (const v of LEXICON) {
    assert.equal(v.conjugation, expectedConjugation(v.infinitive), `${v.id}: conjugação ${v.conjugation}`);
  }
});

test('raridade e nível são consistentes', () => {
  for (const v of LEXICON) {
    assert.equal(v.level, LEVEL_OF[v.rarity], `${v.id}: ${v.rarity} no nível ${v.level}`);
  }
});

test('cada verbo tem 2 ou 3 exemplos', () => {
  for (const v of LEXICON) {
    assert.ok(v.examples.length >= 2 && v.examples.length <= 3, `${v.id}: ${v.examples.length} exemplos`);
  }
});

test('ao menos 95% dos verbos têm sinônimos', () => {
  const withSyn = LEXICON.filter((v) => v.synonyms.length >= 1).length;
  assert.ok(withSyn / LEXICON.length >= 0.95, `${withSyn}/${LEXICON.length} com sinônimos`);
});

test('todos os níveis têm verbos', () => {
  const counts = countByRarity();
  for (const r of Object.keys(LEVEL_OF) as Rarity[]) {
    assert.ok(counts[r] > 0, `nenhum verbo ${r}`);
  }
  assert.equal(counts.comum + counts.incomum + counts.raro + counts.lendario, LEXICON.length);
});

test('exemplos do PRD estão presentes', () => {
  assert.equal(getVerb('cantar')?.level, 1);
  assert.ok(getVerb('aprazer'));
  assert.ok(getVerb('reaver'));
  assert.equal(getVerb('inexistente'), undefined);
});
