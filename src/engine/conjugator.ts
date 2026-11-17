// OWNER: agente engine-morphology. Motor de flexão segmentada (RAD + VT + DMT + DNP) — PRD §2, §3.2, §5.
// Puro TypeScript: sem React / React Native / Expo.
import type {
  Conjugation, ConjugatedForm, FlexionClass, Morpheme, NotebookLevel, PersonIndex, TenseId, VerbEntry,
} from '../types/grammar';
import { PERSON_LABELS, PERSON_PRONOUNS } from '../types/grammar';
import { canonicalDmt, regularEndings, standardDnp, VT_BY_CONJ } from './endings';
import {
  ABUNDANT_PARTICIPLES, MEMBER_INDEX, PARADIGMS, SUFFIX_RULES,
  type DefectiveKind, type FormSpec, type ParadigmDef, type StemSpec,
} from './paradigms';
import { type Rng, weightedPick } from './rng';
import { PERSONS, TENSE_ORDER, TENSES } from './tenses';
import { normalizeText, stripAccents } from './text';

export { TENSES, TENSE_ORDER } from './tenses';

export interface VerbClassification {
  conjugation: Conjugation;
  flexion: FlexionClass;
  /** id do paradigma (modelo de conjugação), ex.: "cantar", "vender", "partir", "ser", "fazer"... */
  paradigmId: string;
}

/* ───────────────────────── Contexto do verbo ───────────────────────── */

type OrthClass = 'car' | 'gar' | 'çar' | 'cer' | 'ger' | 'guer';
type RadKind = 'base' | 'orth' | 'alt' | 'strong' | 'fut' | 'irr';

interface Ctx {
  inf: string;
  def: ParadigmDef;
  prefix: string;
  /** Radical básico = infinitivo sem as duas últimas letras (cant-, vend-, part-, p- de pôr). */
  rad: string;
  conj: Conjugation;
  orth: OrthClass | null;
  defective?: DefectiveKind;
  flexion: FlexionClass;
  abundantPart?: string;
}

/** Forma crua antes da anotação. */
interface Raw {
  r: string;
  v: string;
  d: string;
  n: string;
  seg: boolean;
  kind: RadKind;
}

const ctxCache = new Map<string, Ctx>();

function orthClassOf(inf: string): OrthClass | null {
  if (/gu[ei]r$/.test(inf)) return 'guer';
  if (inf.endsWith('car')) return 'car';
  if (inf.endsWith('gar')) return 'gar';
  if (inf.endsWith('çar')) return 'çar';
  if (/c[ei]r$/.test(inf)) return 'cer';
  if (/g[ei]r$/.test(inf)) return 'ger';
  return null;
}

function resolveParadigm(inf: string): ParadigmDef {
  const explicit = MEMBER_INDEX.get(inf);
  if (explicit) return explicit;
  for (const [suffix, def] of SUFFIX_RULES) {
    if (inf.endsWith(suffix)) return def;
  }
  throw new Error(`"${inf}" não parece um infinitivo (-ar, -er, -ir, -or).`);
}

function context(infinitive: string): Ctx {
  const inf = normalizeText(infinitive);
  const cached = ctxCache.get(inf);
  if (cached) return cached;
  if (!/(ar|er|ir|or|ôr)$/.test(inf) || inf.length < 2) {
    throw new Error(`"${infinitive}" não parece um infinitivo (-ar, -er, -ir, -or).`);
  }
  const def = resolveParadigm(inf);
  const suffix = def.suffixes.filter((s) => inf.endsWith(s)).sort((a, b) => b.length - a.length)[0] ?? inf.slice(-2);
  const abundantPart = ABUNDANT_PARTICIPLES[inf];
  const ctx: Ctx = {
    inf,
    def,
    prefix: inf.slice(0, inf.length - suffix.length),
    rad: inf.slice(0, -2),
    conj: def.conj,
    orth: orthClassOf(inf),
    defective: def.defective,
    flexion: abundantPart ? 'abundante' : def.flexion,
    abundantPart,
  };
  ctxCache.set(inf, ctx);
  return ctx;
}

/** Classifica um infinitivo e associa a um paradigma (modelo de conjugação). */
export function classify(infinitive: string): VerbClassification {
  const ctx = context(infinitive);
  return { conjugation: ctx.conj, flexion: ctx.flexion, paradigmId: ctx.def.id };
}

/** Verbo impessoal (chover, nevar…): só 3ª pessoa. */
export function isImpersonal(infinitive: string): boolean {
  return context(infinitive).defective === 'impessoal';
}

/** Quantidade de paradigmas na tabela. */
export const PARADIGM_COUNT = PARADIGMS.length;

/* ───────────────────────── Existência (defectivos) ───────────────────────── */

function exists(kind: DefectiveKind | undefined, tense: TenseId, p: PersonIndex | null): boolean {
  if (!kind) return true;
  const isImp = tense === 'imp_afirm' || tense === 'imp_neg';
  switch (kind) {
    case 'semImperativo':
      return !isImp;
    case 'impessoal':
      if (isImp) return false;
      return !TENSES[tense].personal || p === 2 || p === 5;
    case 'abolir':
      if (tense === 'pres_ind') return p !== 0;
      if (tense === 'pres_subj' || tense === 'imp_neg') return false;
      if (tense === 'imp_afirm') return p === 1 || p === 4;
      return true;
    case 'falir':
      if (tense === 'pres_ind') return p === 3 || p === 4;
      if (tense === 'pres_subj' || tense === 'imp_neg') return false;
      if (tense === 'imp_afirm') return p === 4;
      return true;
  }
}

/* ───────────────────────── Construção ───────────────────────── */

function resolveStem(ctx: Ctx, spec: StemSpec): string {
  return typeof spec === 'function' ? spec(ctx.rad) : ctx.prefix + spec;
}

function parseSpec(ctx: Ctx, spec: string): Raw {
  const fix = (t: string) => (ctx.prefix && ctx.def.derivFix?.[t] !== undefined ? ctx.def.derivFix[t] : t);
  if (spec.includes('|')) {
    const [r, v = '', d = '', n = ''] = spec.split('|').map(fix);
    const full = ctx.prefix + r;
    return { r: full, v, d, n, seg: true, kind: full === ctx.rad ? 'base' : 'irr' };
  }
  return { r: ctx.prefix + fix(spec), v: '', d: '', n: '', seg: false, kind: 'irr' };
}

/** Imperativo tu/vós = presente do indicativo sem o -s final (cantas → canta, tens → tem, partis → parti). */
function stripS(raw: Raw): Raw {
  if (!raw.seg) {
    const w = raw.r;
    const r = w.endsWith('ns') ? w.slice(0, -2) + 'm' : w.endsWith('s') ? w.slice(0, -1) : w;
    return { ...raw, r };
  }
  if (raw.n.endsWith('s')) return { ...raw, n: raw.n.slice(0, -1) };
  return raw;
}

function applyOrth(cls: OrthClass, stem: string, next: string): string {
  const n = stripAccents(next.charAt(0));
  const front = n === 'e' || n === 'i';
  const back = n === 'a' || n === 'o';
  switch (cls) {
    case 'car': return front && stem.endsWith('c') ? stem.slice(0, -1) + 'qu' : stem;
    case 'gar': return front && stem.endsWith('g') ? stem + 'u' : stem;
    case 'çar': return front && stem.endsWith('ç') ? stem.slice(0, -1) + 'c' : stem;
    case 'cer': return back && stem.endsWith('c') ? stem.slice(0, -1) + 'ç' : stem;
    case 'ger': return back && stem.endsWith('g') ? stem.slice(0, -1) + 'j' : stem;
    case 'guer': return back && stem.endsWith('gu') ? stem.slice(0, -1) : stem;
  }
}

/**
 * i tônico em hiato recebe acento agudo (saímos, saía, possuí, moído), exceto quando forma
 * sílaba com l/m/n/r/z seguinte (sair, saindo, sairmos), antes de nh ou em ditongo com u (saiu).
 */
function applyHiatus(raw: Raw, tense: TenseId): Raw {
  if (tense === 'fut_pres_ind' || tense === 'fut_pret_ind') return raw;
  if (!/[aeou]$/.test(raw.r) || /[gq]u$/.test(raw.r)) return raw;
  const keys: ('v' | 'd' | 'n')[] = ['v', 'd', 'n'];
  const k = keys.find((key) => raw[key] !== '');
  if (!k || raw[k][0] !== 'i') return raw;
  const after = keys.slice(keys.indexOf(k)).map((key) => raw[key]).join('').slice(1);
  if (after.startsWith('nh') || after.startsWith('u')) return raw;
  if (/^[lmnrz]([^aeiouáéíóúâêôãõ]|$)/.test(after)) return raw;
  return { ...raw, [k]: 'í' + raw[k].slice(1) };
}

function finalize(ctx: Ctx, tense: TenseId, raw: Raw): Raw {
  let out = raw;
  if (ctx.orth) {
    const next = raw.v || raw.d || raw.n;
    const r = applyOrth(ctx.orth, raw.r, next);
    if (r !== raw.r) out = { ...out, r, kind: raw.kind === 'base' ? 'orth' : raw.kind };
  }
  return applyHiatus(out, tense);
}

function override(ctx: Ctx, tense: TenseId, idx: number): Raw | null | undefined {
  const list: FormSpec[] | undefined = ctx.def.forms?.[tense];
  if (!list || idx >= list.length) return undefined;
  const spec = list[idx];
  if (spec === undefined) return undefined;
  return spec === null ? null : parseSpec(ctx, spec);
}

function build(ctx: Ctx, tense: TenseId, p: PersonIndex | null): Raw | null {
  const def = ctx.def;
  const idx = p ?? 0;
  const ov = override(ctx, tense, idx);
  if (ov !== undefined) return ov;

  if (tense === 'imp_afirm' || tense === 'imp_neg') {
    if (p === null || p === 0) return null;
    if (tense === 'imp_neg') return build(ctx, 'pres_subj', p);
    if (p === 1) {
      if (def.drop3sg) return build(ctx, 'pres_ind', 2);
      const src = build(ctx, 'pres_ind', 1);
      return src && stripS(src);
    }
    if (p === 4) {
      const src = build(ctx, 'pres_ind', 4);
      return src && stripS(src);
    }
    return build(ctx, 'pres_subj', p);
  }

  let stem = ctx.rad;
  let kind: RadKind = 'base';
  let vtBase = def.vt;
  let vtAcc: string | undefined;
  const rhizotonic = idx === 0 || idx === 1 || idx === 2 || idx === 5;

  if (tense === 'pres_ind') {
    const spec = idx === 0 ? def.pres1 ?? def.rhizo : idx === 3 || idx === 4 ? undefined : def.pres3 ?? def.rhizo;
    if (spec) stem = resolveStem(ctx, spec);
    if (def.drop3sg && idx === 2) {
      return finalize(ctx, tense, { r: stem, v: '', d: '', n: '', seg: true, kind: stem === ctx.rad ? 'base' : 'alt' });
    }
  } else if (tense === 'pres_subj') {
    const spec = def.subj ?? def.pres1 ?? (rhizotonic ? def.rhizo : undefined);
    if (spec) stem = resolveStem(ctx, spec);
  } else if (
    def.perf &&
    (tense === 'pret_perf_ind' || tense === 'pret_mqp_ind' || tense === 'pret_imp_subj' || tense === 'fut_subj')
  ) {
    if (tense === 'pret_perf_ind' && idx === 0 && def.perf.p0) return parseSpec(ctx, def.perf.p0);
    if (tense === 'pret_perf_ind' && idx === 2 && def.perf.p2) return parseSpec(ctx, def.perf.p2);
    stem = resolveStem(ctx, def.perf.stem);
    vtBase = def.perf.vt;
    // Tema forte: "é" aberto (fizéramos, tivésseis, déramos); "ô" em fôramos; "í" em víramos.
    vtAcc = def.perf.vt === 'e' ? 'é' : undefined;
    kind = 'strong';
  } else if (def.fut && (tense === 'fut_pres_ind' || tense === 'fut_pret_ind')) {
    stem = ctx.prefix + def.fut[0];
    vtBase = def.fut[1];
    kind = 'fut';
  } else if (tense === 'participio' && def.part) {
    return parseSpec(ctx, def.part);
  }

  const e = regularEndings(ctx.conj, tense, p, vtBase, vtAcc);
  if (!e) return null;
  const [v, d0, n] = e;
  const d = tense === 'pres_subj' && def.subjDmt !== undefined ? def.subjDmt : d0;
  if (kind === 'base' && stem !== ctx.rad) kind = 'alt';
  return finalize(ctx, tense, { r: stem, v, d, n, seg: true, kind });
}

/* ───────────────────────── Anotação didática ───────────────────────── */

const ORDINAL: Record<Conjugation, string> = { 1: '1ª', 2: '2ª', 3: '3ª' };
const INF_ENDING: Record<Conjugation, string> = { 1: '-ar', 2: '-er', 3: '-ir' };
const IRREGULAR_NOTE = 'Não se aplica: forma irregular, memorize-a inteira.';

function radNote(ctx: Ctx, raw: Raw, next: string): string {
  const base = `${ctx.rad}-`;
  switch (raw.kind) {
    case 'base':
      return `Radical: parte fixa que carrega o significado de "${ctx.inf}".`;
    case 'orth':
      return `Alomorfe gráfico do radical (${base} → ${raw.r}-): a grafia muda para manter o som diante de "${stripAccents(next.charAt(0))}".`;
    case 'strong':
      return `Alomorfe do radical (${base} → ${raw.r}-): radical forte do pretérito perfeito, base também do mais-que-perfeito e dos subjuntivos derivados.`;
    case 'fut':
      return `Alomorfe do radical (${base} → ${raw.r}-): forma reduzida usada no futuro do presente e do pretérito.`;
    case 'alt':
    case 'irr':
      return `Alomorfe do radical (${base} → ${raw.r}-): alternância própria deste verbo.`;
  }
}

function annotate(ctx: Ctx, tense: TenseId, p: PersonIndex | null, raw: Raw, segmentable: boolean): Morpheme[] {
  const info = TENSES[tense];
  if (!segmentable) {
    const notes = (t: string) => (t ? 'Parte final da forma irregular (segmentação apenas aproximada).' : IRREGULAR_NOTE);
    return [
      { kind: 'RAD', text: raw.r, note: `Forma irregular de "${ctx.inf}" no ${info.label}: não segue a segmentação do modelo regular — memorize-a.`, allomorph: false },
      { kind: 'VT', text: raw.v, note: notes(raw.v) },
      { kind: 'DMT', text: raw.d, note: notes(raw.d) },
      { kind: 'DNP', text: raw.n, note: notes(raw.n) },
    ];
  }

  const vtCanon = VT_BY_CONJ[ctx.conj];
  const vtPlain = stripAccents(raw.v);
  const vtAllo = raw.v !== '' && vtPlain !== vtCanon;
  const tem = raw.r + raw.v;
  let vtNote: string;
  if (raw.v === '') {
    vtNote = `Vogal temática zero (∅): não aparece nesta forma, e o tema (TEM) se reduz ao radical "${raw.r}".`;
  } else {
    vtNote = vtAllo
      ? `Alomorfe "${raw.v}" da vogal temática "${vtCanon}" (${ORDINAL[ctx.conj]} conjugação); tema (TEM) = ${tem}.`
      : `Vogal temática da ${ORDINAL[ctx.conj]} conjugação (${INF_ENDING[ctx.conj]}); tema (TEM) = ${tem}.`;
    if (raw.v !== vtPlain) vtNote += ' Leva acento gráfico por ser a vogal tônica.';
  }

  const dCanon = canonicalDmt(tense, ctx.conj, p);
  const dAllo = raw.d !== '' && stripAccents(raw.d) !== dCanon;
  let dmtNote: string;
  if (info.mood === 'nominal') {
    dmtNote = `Desinência nominal do ${info.label} (-${raw.d}).`;
    if (tense === 'participio' && ctx.abundantPart) {
      dmtNote += ` Verbo abundante: também tem o particípio irregular "${ctx.abundantPart}" (usado sobretudo com ser e estar).`;
    }
  } else if (info.mood === 'imperativo') {
    const src = tense === 'imp_afirm' && (p === 1 || p === 4)
      ? 'do Presente do Indicativo, sem o -s final'
      : 'do Presente do Subjuntivo';
    dmtNote = raw.d
      ? `Desinência modo-temporal "${raw.d}": no ${info.label}, esta pessoa vem ${src}.`
      : `Desinência modo-temporal zero (∅): no ${info.label}, esta pessoa vem ${src}.`;
  } else if (raw.d === '') {
    dmtNote = `Desinência modo-temporal zero (∅): o ${info.label} não tem marca própria nesta forma.`;
  } else {
    dmtNote = `Desinência modo-temporal do ${info.label}${dAllo ? ` (alomorfe de "${dCanon}")` : ''}.`;
  }

  let dnpNote: string;
  let nAllo = false;
  if (p === null) {
    dnpNote = 'Formas nominais não têm desinência número-pessoal (∅).';
  } else if (raw.n === '') {
    dnpNote = `Desinência número-pessoal zero (∅): ${PERSON_LABELS[p]} (${PERSON_PRONOUNS[p]}).`;
  } else {
    nAllo = stripAccents(raw.n) !== standardDnp(tense, p);
    dnpNote = `Desinência número-pessoal da ${PERSON_LABELS[p]} (${PERSON_PRONOUNS[p]})${nAllo ? ', em forma de alomorfe' : ''}.`;
  }

  const next = raw.v || raw.d || raw.n;
  return [
    { kind: 'RAD', text: raw.r, note: radNote(ctx, raw, next), allomorph: raw.kind !== 'base' },
    { kind: 'VT', text: raw.v, note: vtNote, allomorph: vtAllo },
    { kind: 'DMT', text: raw.d, note: dmtNote, allomorph: dAllo },
    { kind: 'DNP', text: raw.n, note: dnpNote, allomorph: nAllo },
  ];
}

/* ───────────────────────── API pública ───────────────────────── */

/** Conjuga uma forma segmentada. Retorna null quando a forma não existe (verbos defectivos, imperativo "eu"). */
export function conjugate(infinitive: string, tense: TenseId, person: PersonIndex | null): ConjugatedForm | null {
  const ctx = context(infinitive);
  const info = TENSES[tense];
  if (!info) return null;
  const p: PersonIndex | null = info.personal ? person : null;
  if (info.personal && (p === null || p === undefined || p < 0 || p > 5)) return null;
  if (!exists(ctx.defective, tense, p)) return null;
  const raw = build(ctx, tense, p);
  if (!raw) return null;
  const segmentable = raw.seg && ctx.def.segmentable !== false && !(ctx.def.nonseg ?? []).includes(tense);
  const morphemes = annotate(ctx, tense, p, raw, segmentable);
  const word = morphemes.map((m) => m.text).join('');
  return { tense, person: p, word, morphemes, segmentable };
}

/** Todas as formas existentes do verbo (tabela completa, na ordem de TENSE_ORDER). */
export function conjugateAll(infinitive: string): ConjugatedForm[] {
  const out: ConjugatedForm[] = [];
  for (const t of TENSE_ORDER) {
    const persons: (PersonIndex | null)[] = TENSES[t].personal ? PERSONS : [null];
    for (const p of persons) {
      const f = conjugate(infinitive, t, p);
      if (f) out.push(f);
    }
  }
  return out;
}

/** Peso de sorteio por pessoa: "vós" é rara no português do Brasil. */
export const PERSON_WEIGHTS: Record<PersonIndex, number> = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 0.2, 5: 1 };
/** Peso relativo de cada forma nominal frente a um tempo pessoal. */
const NOMINAL_WEIGHT = 0.4;

/** Pessoas existentes para um verbo num tempo (vazio se o tempo não existe). */
export function availablePersons(infinitive: string, tense: TenseId): (PersonIndex | null)[] {
  if (!TENSES[tense].personal) return conjugate(infinitive, tense, null) ? [null] : [];
  return PERSONS.filter((p) => conjugate(infinitive, tense, p) !== null);
}

/** Sorteia uma pessoa existente (com peso baixo para "vós"). */
export function pickPerson(infinitive: string, tense: TenseId, rng: Rng = Math.random): PersonIndex | null {
  const persons = availablePersons(infinitive, tense);
  if (persons.length === 0) return null;
  return weightedPick(persons, persons.map((p) => (p === null ? 1 : PERSON_WEIGHTS[p])), rng);
}

/** Sorteio aleatório de modo/tempo/pessoa compatível com o nível do caderno (PRD §3.2.1). */
export function pickRandomFlexion(
  verb: VerbEntry,
  level: NotebookLevel,
  rng: () => number = Math.random,
): { tense: TenseId; person: PersonIndex | null } {
  const inf = verb.infinitive;
  const tenses = TENSE_ORDER.filter((t) => TENSES[t].minLevel <= level && availablePersons(inf, t).length > 0);
  if (tenses.length === 0) return { tense: 'infinitivo', person: null };
  const tense = weightedPick(tenses, tenses.map((t) => (TENSES[t].personal ? 1 : NOMINAL_WEIGHT)), rng);
  return { tense, person: pickPerson(inf, tense, rng) };
}
