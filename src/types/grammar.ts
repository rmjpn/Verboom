/**
 * Contrato central do Verboom.
 * Todos os módulos (engine, data, storage, UI) dependem destes tipos.
 * Alterações aqui precisam ser coordenadas entre os módulos.
 */

/** 1ª (-ar), 2ª (-er / -or) e 3ª (-ir) conjugação. */
export type Conjugation = 1 | 2 | 3;

/** Classificação quanto à flexão. */
export type FlexionClass = 'regular' | 'irregular' | 'anomalo' | 'defectivo' | 'abundante';

/** Raridade de "caça" (PRD §2). */
export type Rarity = 'comum' | 'incomum' | 'raro' | 'lendario';

/** Nível do caderno (PRD §4.2): 1 Caligrafia, 2 Brochura, 3 Universitário, 4 Grimório. */
export type NotebookLevel = 1 | 2 | 3 | 4;

export type Mood = 'indicativo' | 'subjuntivo' | 'imperativo' | 'nominal';

export type TenseId =
  | 'pres_ind'
  | 'pret_perf_ind'
  | 'pret_imp_ind'
  | 'pret_mqp_ind'
  | 'fut_pres_ind'
  | 'fut_pret_ind'
  | 'pres_subj'
  | 'pret_imp_subj'
  | 'fut_subj'
  | 'imp_afirm'
  | 'imp_neg'
  | 'infinitivo'
  | 'gerundio'
  | 'participio';

export interface TenseInfo {
  id: TenseId;
  mood: Mood;
  /** Rótulo completo, ex.: "Pretérito Mais-que-perfeito do Indicativo". */
  label: string;
  /** Rótulo curto, ex.: "Pret. Mais-que-perf. Ind.". */
  short: string;
  /** Nível mínimo do caderno em que este tempo pode ser sorteado. */
  minLevel: NotebookLevel;
  /** Formas nominais e imperativo não usam todas as pessoas. */
  personal: boolean;
}

/** 0=eu, 1=tu, 2=ele/ela/você, 3=nós, 4=vós, 5=eles/elas/vocês. */
export type PersonIndex = 0 | 1 | 2 | 3 | 4 | 5;

export const PERSON_PRONOUNS: Record<PersonIndex, string> = {
  0: 'eu',
  1: 'tu',
  2: 'ele/ela',
  3: 'nós',
  4: 'vós',
  5: 'eles/elas',
};

export const PERSON_LABELS: Record<PersonIndex, string> = {
  0: '1ª pessoa do singular',
  1: '2ª pessoa do singular',
  2: '3ª pessoa do singular',
  3: '1ª pessoa do plural',
  4: '2ª pessoa do plural',
  5: '3ª pessoa do plural',
};

/** Morfemas da Matriz de Anatomia Morfológica (PRD §5). */
export type MorphemeKind = 'RAD' | 'VT' | 'DMT' | 'DNP';

export interface Morpheme {
  kind: MorphemeKind;
  /** Texto do morfema. String vazia = desinência zero (exibida como "∅"). */
  text: string;
  /** Explicação didática curta, ex.: "Desinência do Pretérito Imperfeito do Indicativo (1ª conj.)". */
  note?: string;
  /** true quando é um alomorfe (ex.: VT "e" em cant-e-i). */
  allomorph?: boolean;
}

/** Uma forma conjugada já segmentada. */
export interface ConjugatedForm {
  tense: TenseId;
  /** null para formas nominais. */
  person: PersonIndex | null;
  /** Forma final, ex.: "cantáramos". Para imp_neg inclui apenas o verbo (sem "não"). */
  word: string;
  /**
   * Segmentação na ordem RAD, VT, DMT, DNP (sempre os 4, usando text='' para morfema zero).
   * A concatenação dos textos == word (comparação sem acentos é permitida apenas na
   * VT/DMT acentuadas — ver `morphemeParser.normalize`).
   */
  morphemes: Morpheme[];
  /**
   * false quando a forma é irregular demais para segmentação didática confiável
   * (ex.: "sou", "foi"). Nesse caso a Arena usa o modo "escrever a forma inteira".
   */
  segmentable: boolean;
}

/** Entrada do léxico (dados curados — src/data). */
export interface VerbEntry {
  /** slug estável, ex.: "cantar". */
  id: string;
  infinitive: string;
  conjugation: Conjugation;
  flexion: FlexionClass;
  rarity: Rarity;
  level: NotebookLevel;
  /** Definição dicionarizada clara e original (não copiar dicionários protegidos). */
  definition: string;
  /** Ex.: "transitivo direto", "intransitivo", "transitivo indireto (gostar de)". */
  transitivity: string;
  synonyms: string[];
  /** 2 a 3 frases de uso real, em português do Brasil. */
  examples: string[];
}

/** Um encontro na Arena de Captura. */
export interface Challenge {
  verb: VerbEntry;
  tense: TenseId;
  person: PersonIndex | null;
  form: ConjugatedForm;
  /** 'blocks' = encaixar morfemas; 'type' = digitar a forma (irregulares não segmentáveis / modo avançado). */
  mode: 'blocks' | 'type';
  /** Opções de blocos para cada slot (inclui a correta + distratores plausíveis), embaralhadas. */
  options: Partial<Record<Exclude<MorphemeKind, 'RAD'>, string[]>>;
}

/** Resultado da validação de uma tentativa (PRD §3.2 — destacar posição errada sem entregar a resposta). */
export interface AttemptResult {
  correct: boolean;
  /** Slots com erro (apenas no modo 'blocks'). */
  wrongSlots: Exclude<MorphemeKind, 'RAD'>[];
  /** Dica pedagógica que não revela a resposta. */
  hint?: string;
}

/* ---------- Progresso / SRS ---------- */

export type CaptureStatus = 'capturado' | 'arisco';

export interface CaptureRecord {
  verbId: string;
  status: CaptureStatus;
  capturedAt: number; // epoch ms
  /** Índice no ciclo de intervalos [1, 3, 7, 15, 30] dias. */
  stage: number;
  dueAt: number; // epoch ms
  /** Erros de 3 chances na revisão. */
  lapses: number;
  /** Tempos já acertados para este verbo. */
  masteredTenses: TenseId[];
}

export interface PlayerState {
  xp: number;
  level: NotebookLevel;
  /** Verbos que fugiram ao menos uma vez (estatística). */
  escapes: number;
  /** Verbos pulados recentemente (evita repetição imediata no baralho). */
  recentlySkipped: string[];
}

/** Item do baralho de caça. */
export interface DeckItem {
  verbId: string;
  kind: 'novo' | 'revisao';
}
