// OWNER: agente engine-morphology. Encontro de captura, validação e dissecação morfológica (PRD §3.2, §3.3.5, §5).
// Puro TypeScript: sem React / React Native / Expo.
import type {
  AttemptResult, Challenge, ConjugatedForm, MorphemeKind, NotebookLevel, PersonIndex, TenseId, VerbEntry,
} from '../types/grammar';
import { PERSON_LABELS } from '../types/grammar';
import { classify, conjugate, isImpersonal, pickPerson, pickRandomFlexion, TENSES } from './conjugator';
import { type Rng, shuffle } from './rng';
import { capitalize, normalizeText, stripAccents, toggleAccent } from './text';

export type SlotKind = Exclude<MorphemeKind, 'RAD'>;
export type BlockAnswer = Partial<Record<SlotKind, string>>;

export { mulberry32 } from './rng';

const SLOTS: SlotKind[] = ['VT', 'DMT', 'DNP'];
const SLOT_INDEX: Record<SlotKind, number> = { VT: 1, DMT: 2, DNP: 3 };
const SLOT_NAME: Record<SlotKind, string> = {
  VT: 'vogal temática',
  DMT: 'desinência modo-temporal',
  DNP: 'desinência número-pessoal',
};

/** Normaliza para comparação (minúsculas, trim, NFC). Acentos SÃO relevantes na resposta final. */
export function normalize(s: string): string {
  return normalizeText(s);
}

/** Bloco vindo da UI: "∅" (ou vazio) representa o morfema zero. */
function blockText(s: string | undefined): string {
  const t = normalize(s ?? '');
  return t === '∅' || t === 'ø' ? '' : t;
}

/* ───────────────────────── Distratores ───────────────────────── */

const VT_POOL = ['a', 'e', 'i', 'o', 'á', 'ê', 'í', ''];
const DMT_POOL = ['', 'va', 've', 'a', 'ia', 'e', 'ra', 're', 'rá', 'sse', 'ria', 'ría', 'r', 'ndo', 'do'];
const DNP_POOL = ['', 'o', 's', 'mos', 'is', 'm', 'i', 'ste', 'u', 'stes', 'ram', 'es', 'des', 'em'];

const DMT_RELATED: Record<TenseId, string[]> = {
  pres_ind: ['', 'va', 'e', 'a', 'ra'],
  pret_perf_ind: ['', 'ra', 'va', 'sse', 'e'],
  pret_imp_ind: ['va', 'a', 'ia', 'ra', 've', 'sse'],
  pret_mqp_ind: ['ra', 're', 'va', 'sse', 'ria', 'a'],
  fut_pres_ind: ['re', 'rá', 'ria', 'ra', 'r', 'sse'],
  fut_pret_ind: ['ria', 'ría', 're', 'ra', 'va', 'ia'],
  pres_subj: ['e', 'a', '', 'sse', 'ra'],
  pret_imp_subj: ['sse', 'ra', 're', 'va', 'r'],
  fut_subj: ['r', 're', 'ra', 'sse', 'ndo'],
  imp_afirm: ['', 'e', 'a', 'sse', 'va'],
  imp_neg: ['e', 'a', '', 'sse', 'ra'],
  infinitivo: ['r', 'ndo', 'do', 're', 'ra'],
  gerundio: ['ndo', 'r', 'do', 'va', 're'],
  participio: ['do', 'ndo', 'r', 'ra', 'va'],
};

const DNP_RELATED: Record<number, string[]> = {
  0: ['', 'o', 'i', 's', 'mos', 'm'],
  1: ['s', '', 'ste', 'is', 'es', 'mos'],
  2: ['', 'u', 's', 'm', 'o', 'mos'],
  3: ['mos', 'm', 'is', 's', ''],
  4: ['is', 'stes', 'des', 'mos', 's', 'i'],
  5: ['m', 'ram', 'em', 'mos', 's', 'o'],
  6: ['', 's', 'm', 'mos', 'o'], // formas nominais
};

function vtRelated(c: string): string[] {
  if (!c) return ['a', 'e', 'i', 'á'];
  const plain = stripAccents(c);
  const accented = plain !== c;
  const others = ['a', 'e', 'i'].filter((x) => x !== plain).map((x) => (accented ? toggleAccent(x) : x));
  return [toggleAccent(c), '', ...others].filter((x) => VT_POOL.includes(x));
}

function pickDistractors(correct: string, related: string[], pool: string[], rng: Rng, count = 3): string[] {
  const seen = new Set<string>([correct]);
  const uniq: string[] = [];
  for (const x of related) if (!seen.has(x)) { seen.add(x); uniq.push(x); }
  const chosen = shuffle(uniq.slice(0, 5), rng).slice(0, count);
  if (chosen.length < count) {
    const rest = shuffle(pool.filter((x) => x !== correct && !chosen.includes(x)), rng);
    chosen.push(...rest.slice(0, count - chosen.length));
  }
  return chosen;
}

/** Garante que nenhuma combinação errada de blocos produza a mesma palavra (resposta ambígua). */
function removeAmbiguity(form: ConjugatedForm, opts: Record<SlotKind, string[]>, pools: Record<SlotKind, string[]>, rng: Rng): void {
  const rad = form.morphemes[0].text;
  const correct = SLOTS.map((s) => form.morphemes[SLOT_INDEX[s]].text);
  for (let guard = 0; guard < 30; guard++) {
    let offender: { slot: SlotKind; value: string } | null = null;
    outer: for (const v of opts.VT) for (const d of opts.DMT) for (const n of opts.DNP) {
      const combo = [v, d, n];
      if (combo.every((x, i) => x === correct[i])) continue;
      if (rad + v + d + n === form.word) {
        const i = combo.findIndex((x, k) => x !== correct[k]);
        offender = { slot: SLOTS[i], value: combo[i] };
        break outer;
      }
    }
    if (!offender) return;
    const list = opts[offender.slot];
    list.splice(list.indexOf(offender.value), 1);
    const replacement = shuffle(pools[offender.slot].filter((x) => !list.includes(x)), rng)[0];
    if (replacement !== undefined) list.push(replacement);
  }
}

function buildOptions(form: ConjugatedForm, tense: TenseId, person: PersonIndex | null, rng: Rng): Challenge['options'] {
  const [, vt, dmt, dnp] = form.morphemes.map((m) => m.text);
  const pools: Record<SlotKind, string[]> = { VT: VT_POOL, DMT: DMT_POOL, DNP: DNP_POOL };
  const dmtRel = [...DMT_RELATED[tense]];
  // Variante acentuada/desacentuada só quando é um bloco real (ra ↔ rá, ria ↔ ría).
  if (dmt && DMT_POOL.includes(toggleAccent(dmt))) dmtRel.unshift(toggleAccent(dmt));
  const opts: Record<SlotKind, string[]> = {
    VT: [vt, ...pickDistractors(vt, vtRelated(vt), VT_POOL, rng)],
    DMT: [dmt, ...pickDistractors(dmt, dmtRel, DMT_POOL, rng)],
    DNP: [dnp, ...pickDistractors(dnp, DNP_RELATED[person ?? 6], DNP_POOL, rng)],
  };
  removeAmbiguity(form, opts, pools, rng);
  return { VT: shuffle(opts.VT, rng), DMT: shuffle(opts.DMT, rng), DNP: shuffle(opts.DNP, rng) };
}

/* ───────────────────────── Encontro ───────────────────────── */

/** Monta um encontro de captura: sorteia flexão, segmenta e gera distratores plausíveis. */
export function buildChallenge(
  verb: VerbEntry,
  level: NotebookLevel,
  opts?: { rng?: () => number; advanced?: boolean; tense?: TenseId; person?: PersonIndex | null },
): Challenge {
  const rng = opts?.rng ?? Math.random;
  let tense = opts?.tense;
  let person: PersonIndex | null = opts?.person ?? null;
  let form: ConjugatedForm | null = null;
  if (tense) {
    if (!TENSES[tense].personal) person = null;
    else if (opts?.person === undefined || opts.person === null) person = pickPerson(verb.infinitive, tense, rng);
    form = person === null && TENSES[tense].personal ? null : conjugate(verb.infinitive, tense, person);
  }
  if (!form || !tense) {
    // Sem tempo pedido, ou combinação inexistente (defectivos): sorteio compatível com o nível.
    const pick = pickRandomFlexion(verb, level, rng);
    tense = pick.tense;
    person = pick.person;
    form = conjugate(verb.infinitive, tense, person);
    if (!form) throw new Error(`Não há formas disponíveis para "${verb.infinitive}".`);
  }
  const mode: Challenge['mode'] = opts?.advanced || !form.segmentable ? 'type' : 'blocks';
  const options = mode === 'blocks' ? buildOptions(form, tense, person, rng) : {};
  return { verb, tense, person, form, mode, options };
}

/* ───────────────────────── Validação ───────────────────────── */

function personPhrase(person: PersonIndex | null): string {
  return person === null ? 'uma forma nominal' : `a ${PERSON_LABELS[person]}`;
}

function slotHint(ch: Challenge, slot: SlotKind, given: string, correct: string): string {
  const label = TENSES[ch.tense].label;
  if (given !== correct && stripAccents(given) === stripAccents(correct)) {
    return `Quase! Confira a acentuação da ${SLOT_NAME[slot]}.`;
  }
  switch (slot) {
    case 'VT': {
      const conj = classify(ch.verb.infinitive).conjugation;
      return `A vogal temática escolhida não forma o tema certo deste verbo da ${conj}ª conjugação no ${label}.`;
    }
    case 'DMT': {
      const family = DMT_RELATED[ch.tense].slice(0, 2).map(stripAccents);
      if (given && family.includes(stripAccents(given))) {
        return `Esse bloco lembra o ${label}, mas nesta pessoa a desinência modo-temporal tem outra forma.`;
      }
      return `A desinência modo-temporal escolhida não indica o ${label}.`;
    }
    case 'DNP':
      if (ch.person === null) return 'As formas nominais não indicam pessoa gramatical: revise a desinência número-pessoal.';
      return `A desinência número-pessoal não indica ${personPhrase(ch.person)}.`;
  }
}

/** Valida uma tentativa. Em modo 'blocks' recebe BlockAnswer; em modo 'type' recebe a terminação/forma digitada. */
export function checkAttempt(challenge: Challenge, answer: BlockAnswer | string): AttemptResult {
  const form = challenge.form;
  const label = TENSES[challenge.tense].label;

  if (typeof answer !== 'string') {
    const wrongSlots = SLOTS.filter((s) => blockText(answer[s]) !== normalize(form.morphemes[SLOT_INDEX[s]].text));
    if (wrongSlots.length === 0) return { correct: true, wrongSlots: [] };
    const first = wrongSlots[0];
    let hint = slotHint(challenge, first, blockText(answer[first]), normalize(form.morphemes[SLOT_INDEX[first]].text));
    if (wrongSlots.length > 1) hint += ' Há outro bloco fora do lugar também.';
    return { correct: false, wrongSlots, hint };
  }

  const word = normalize(form.word);
  const rad = normalize(form.morphemes[0].text);
  const ending = form.segmentable && rad && word.startsWith(rad) && rad !== word ? word.slice(rad.length) : null;
  let typed = normalize(answer).replace(/^não\s+/, '').replace(/^[-–]\s*/, '');
  if (typed === '∅') typed = '';
  if (typed === word || (ending !== null && typed === ending)) return { correct: true, wrongSlots: [] };

  if (!typed) return { correct: false, wrongSlots: [], hint: 'Escreva a forma conjugada (ou a terminação depois do radical).' };
  const plain = stripAccents(typed);
  if (plain === stripAccents(word) || (ending !== null && plain === stripAccents(ending))) {
    return { correct: false, wrongSlots: [], hint: 'Quase! Confira a acentuação.' };
  }
  if (!form.segmentable) {
    return {
      correct: false,
      wrongSlots: [],
      hint: `Esta é uma forma irregular: no ${label}, "${challenge.verb.infinitive}" não segue o modelo regular.`,
    };
  }
  const dnp = form.morphemes[3].text;
  if (challenge.person !== null && dnp && typed.endsWith(dnp)) {
    return {
      correct: false,
      wrongSlots: [],
      hint: 'A desinência número-pessoal está certa; revise a vogal temática e a desinência modo-temporal.',
    };
  }
  return {
    correct: false,
    wrongSlots: [],
    hint: challenge.person === null
      ? `A forma digitada não corresponde ao ${label}.`
      : `A forma digitada não indica ${personPhrase(challenge.person)} do ${label}.`,
  };
}

/* ───────────────────────── Dissecação morfológica ───────────────────────── */

/** Explicação didática de cada morfema para a "Dissecação Morfológica" (PRD §3.3.5). */
export function explainMorphemes(challenge: Challenge): { kind: MorphemeKind; text: string; explanation: string }[] {
  const form = challenge.form;
  const { conjugation } = classify(challenge.verb.infinitive);
  const label = TENSES[challenge.tense].label;
  const [rad, vt, dmt, dnp] = form.morphemes;

  if (!form.segmentable) {
    const part = (t: string, note?: string) => (t ? note ?? 'Parte final da forma irregular.' : 'Não se aplica a esta forma irregular.');
    return [
      {
        kind: 'RAD',
        text: rad.text,
        explanation: `"${form.word}" é uma forma irregular de "${challenge.verb.infinitive}" no ${label}: o radical se transforma e não dá para separar os morfemas como no modelo regular. Memorize a forma inteira.`,
      },
      { kind: 'VT', text: vt.text, explanation: part(vt.text, vt.note) },
      { kind: 'DMT', text: dmt.text, explanation: part(dmt.text, dmt.note) },
      { kind: 'DNP', text: dnp.text, explanation: part(dnp.text, dnp.note) },
    ];
  }

  const info = TENSES[challenge.tense];
  const tem = rad.text + vt.text;
  const radExp = rad.allomorph
    ? `Radical (RAD) "${rad.text}-": ${rad.note ?? ''}`.trim()
    : `Radical (RAD) "${rad.text}-": a parte fixa que carrega o significado de "${challenge.verb.infinitive}".`;

  let vtExp: string;
  if (!vt.text) {
    vtExp = `Vogal temática zero (∅): nesta forma a VT não aparece, então o tema (TEM) coincide com o radical "${rad.text}".`;
  } else {
    vtExp = `Vogal temática (VT) "${vt.text}": liga o radical às desinências e identifica a ${conjugation}ª conjugação. Tema (TEM) = RAD + VT = "${tem}".`;
    if (vt.allomorph) vtExp += ` Aqui ela aparece como alomorfe (variante) da VT "${['a', 'e', 'i'][conjugation - 1]}".`;
    if (stripAccents(vt.text) !== vt.text) vtExp += ' Leva acento gráfico por ser a vogal tônica.';
  }

  let dmtExp: string;
  if (info.mood === 'nominal') {
    dmtExp = `Desinência nominal "${dmt.text}": forma o ${label}, que não indica tempo nem pessoa.`;
    const abundant = dmt.note?.match(/Verbo abundante.*$/)?.[0];
    if (abundant) dmtExp += ` ${abundant}`;
  } else if (info.mood === 'imperativo') {
    dmtExp = dmt.note ?? '';
  } else if (!dmt.text) {
    dmtExp = `Desinência modo-temporal zero (∅): o ${label} não tem marca própria nesta forma — a ausência também é significativa (desinência zero).`;
  } else {
    dmtExp = `Desinência modo-temporal (DMT) "${dmt.text}": marca o ${label}.` +
      (dmt.allomorph ? ' Nesta pessoa ela aparece como alomorfe (variante).' : '');
  }

  const dnpExp = challenge.person === null
    ? 'Sem desinência número-pessoal: as formas nominais não se flexionam em pessoa.'
    : dnp.text
      ? `Desinência número-pessoal (DNP) "${dnp.text}": indica a ${PERSON_LABELS[challenge.person]}.${dnp.allomorph ? ' É uma variante (alomorfe) própria deste tempo.' : ''}`
      : `Desinência número-pessoal zero (∅): a ${PERSON_LABELS[challenge.person]} não recebe marca neste tempo (desinência zero).`;

  return [
    { kind: 'RAD', text: rad.text, explanation: radExp },
    { kind: 'VT', text: vt.text, explanation: vtExp },
    { kind: 'DMT', text: dmt.text, explanation: dmtExp },
    { kind: 'DNP', text: dnp.text, explanation: dnpExp },
  ];
}

/* ───────────────────────── Frase-modelo ───────────────────────── */

const SUBJECT: Record<PersonIndex, string> = { 0: 'eu', 1: 'tu', 2: 'ele', 3: 'nós', 4: 'vós', 5: 'eles' };
const IMPERATIVE_SUBJECT: Record<PersonIndex, string> = { 0: '', 1: 'tu', 2: 'você', 3: 'nós', 4: 'vós', 5: 'vocês' };

function join(...parts: string[]): string {
  return parts.filter(Boolean).join(' ');
}

/** Frase-modelo com pista temporal usando a forma conjugada, ex.: "Ontem, nós cantamos." */
export function modelSentence(challenge: Challenge): string {
  const w = challenge.form.word;
  const p = challenge.person;
  const impersonal = isImpersonal(challenge.verb.infinitive);
  const s = p === null || impersonal ? '' : SUBJECT[p];
  switch (challenge.tense) {
    case 'pres_ind': return capitalize(`${join('todos os dias,', s, w)}.`);
    case 'pret_perf_ind': return `${join('Ontem,', s, w)}.`;
    case 'pret_imp_ind': return `${join('Antigamente,', s, w)}.`;
    case 'pret_mqp_ind': return `${join('Quando o sinal tocou,', s, 'já', w)}.`;
    case 'fut_pres_ind': return `${join('Amanhã,', s, w)}.`;
    case 'fut_pret_ind': return `${join('Se pudesse,', s, w)}.`;
    case 'pres_subj': return `${join('É importante que', s, w)}.`;
    case 'pret_imp_subj': return `${join('Se', s, w)}, tudo seria diferente.`;
    case 'fut_subj': return `${join('Quando', s, w)}, tudo vai mudar.`;
    case 'imp_afirm': return `${capitalize(w)}, ${IMPERATIVE_SUBJECT[p ?? 1]}!`;
    case 'imp_neg': return `Não ${w}, ${IMPERATIVE_SUBJECT[p ?? 1]}!`;
    case 'infinitivo': return `É preciso ${w} com atenção.`;
    case 'gerundio': return impersonal ? `Está ${w} agora.` : `Estou ${w} agora.`;
    case 'participio': return impersonal ? `Tem ${w} muito ultimamente.` : `Eu tenho ${w} bastante ultimamente.`;
  }
}
