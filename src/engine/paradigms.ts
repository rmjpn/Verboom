// OWNER: agente engine-morphology. Tabela de paradigmas (modelos de conjugação) — PRD §2.
//
// Cada paradigma descreve só o que DIFERE do modelo regular da sua conjugação. Notação dos overrides:
//   "rad|vt|dmt|dnp"  → forma segmentável (4 morfemas; vazio = morfema zero)
//   "palavra"         → forma não segmentável (irregular forte: "sou", "fez", "pôs"…)
//   null              → forma inexistente (defectivos)
//   undefined         → gerar pelo modelo regular
// Textos de radical/stem são RELATIVOS ao sufixo do paradigma: o prefixo do verbo derivado é
// anteposto automaticamente (desfazer → "des" + "fiz" = "desfiz"; sair → "s" + "ai" = "sai").
// Stems dados como função recebem o radical completo (ex.: dormir → durm-).
import type { Conjugation, FlexionClass, TenseId } from '../types/grammar';

export type StemSpec = string | ((rad: string) => string);
export type DefectiveKind = 'abolir' | 'falir' | 'impessoal' | 'semImperativo';
export type FormSpec = string | null | undefined;

export interface ParadigmDef {
  /** Id estável = verbo-modelo. */
  id: string;
  conj: Conjugation;
  flexion: FlexionClass;
  /** Sufixos que este modelo cobre (o resto do infinitivo é o prefixo). */
  suffixes: string[];
  /** true = verbos desconhecidos com este sufixo caem neste modelo automaticamente. */
  rule?: boolean;
  /** Verbos ligados explicitamente a este modelo. */
  members?: string[];
  /** Exemplos (documentação e testes). */
  examples?: string[];
  description: string;
  /** VT diferente da conjugação (pôr: "o"). */
  vt?: string;
  /** Radical da 1ª p. sg. do Pres. Ind. — propaga-se a todo o Pres. Subj. (faço/faça, durmo/durma). */
  pres1?: StemSpec;
  /** Radical de tu/ele/eles no Pres. Ind. (sobe, foge). */
  pres3?: StemSpec;
  /** Radical de TODAS as formas rizotônicas (pres. ind. e subj. 1,2,3,6): passeio/passeie, odeio/odeie. */
  rhizo?: StemSpec;
  /** Radical exclusivo do Pres. Subj. (saber → saib-, querer → queir-). */
  subj?: StemSpec;
  /** DMT do Pres. Subj. diferente da conjugação (estar → esteja). */
  subjDmt?: string;
  /** 3ª p. sg. do Pres. Ind. perde a VT (faz, diz, produz) e o imperativo "tu" a acompanha. */
  drop3sg?: boolean;
  /** Tema forte do perfeito (fiz-e-, tiv-e-, pus-e-…), base também do mais-que-perfeito e dos subjuntivos. */
  perf?: { stem: StemSpec; vt: string; p0?: string; p2?: string };
  /** Radical/VT do futuro do presente e do pretérito (fazer → fa-∅-re-i). */
  fut?: [string, string];
  /** Particípio irregular (não segmentável). */
  part?: string;
  forms?: Partial<Record<TenseId, FormSpec[]>>;
  defective?: DefectiveKind;
  /** false = nenhuma forma é segmentável (ir). */
  segmentable?: boolean;
  /** Tempos não segmentáveis mesmo quando gerados (ser: tema "fo-"). */
  nonseg?: TenseId[];
  /** Ajustes gráficos aplicados a segmentos quando há prefixo (tem → contém, pôr → compor). */
  derivFix?: Record<string, string>;
}

function replaceLast(s: string, from: string, to: string): string {
  const i = s.lastIndexOf(from);
  return i < 0 ? s : s.slice(0, i) + to + s.slice(i + from.length);
}
export const eToI = (r: string) => replaceLast(r, 'e', 'i');
export const oToU = (r: string) => replaceLast(r, 'o', 'u');
export const uToO = (r: string) => replaceLast(r, 'u', 'o');
export const iToE = (r: string) => replaceLast(r, 'i', 'e');

const imperfOverride = (st: string, acc: string): FormSpec[] => [
  `${st}||a|`, `${st}||a|s`, `${st}||a|`, `${acc}||a|mos`, `${acc}||e|is`, `${st}||a|m`,
];

export const PARADIGMS: ParadigmDef[] = [
  // ───────────── Regulares ─────────────
  { id: 'cantar', conj: 1, flexion: 'regular', suffixes: ['ar'], rule: true, description: 'Modelo regular da 1ª conjugação (-ar).',
    examples: ['cantar', 'falar', 'amar', 'estudar', 'trabalhar', 'comprar', 'andar', 'morar', 'gostar', 'copiar', 'continuar', 'voar', 'computar'] },
  { id: 'vender', conj: 2, flexion: 'regular', suffixes: ['er'], rule: true, description: 'Modelo regular da 2ª conjugação (-er).',
    examples: ['vender', 'beber', 'comer', 'correr', 'escolher', 'aprender', 'viver', 'bater', 'dever', 'mover', 'meter'] },
  { id: 'partir', conj: 3, flexion: 'regular', suffixes: ['ir'], rule: true, description: 'Modelo regular da 3ª conjugação (-ir).',
    examples: ['partir', 'decidir', 'dividir', 'assistir', 'unir', 'permitir', 'existir', 'insistir', 'resistir', 'garantir', 'ressarcir'] },

  // ───────────── Mudanças ortográficas (verbos regulares) ─────────────
  { id: 'ficar', conj: 1, flexion: 'regular', suffixes: ['car'], rule: true, description: 'c → qu antes de e (fiquei, fique).',
    examples: ['ficar', 'tocar', 'buscar', 'explicar', 'marcar', 'brincar', 'colocar', 'praticar'] },
  { id: 'chegar', conj: 1, flexion: 'regular', suffixes: ['gar'], rule: true, description: 'g → gu antes de e (cheguei, chegue).',
    examples: ['chegar', 'jogar', 'ligar', 'negar', 'apagar', 'carregar', 'julgar', 'navegar'] },
  { id: 'começar', conj: 1, flexion: 'regular', suffixes: ['çar'], rule: true, description: 'ç → c antes de e (comecei, comece).',
    examples: ['começar', 'dançar', 'abraçar', 'alcançar', 'almoçar', 'lançar'] },
  { id: 'conhecer', conj: 2, flexion: 'regular', suffixes: ['cer'], rule: true, description: 'c → ç antes de a/o (conheço, conheça).',
    examples: ['conhecer', 'parecer', 'merecer', 'esquecer', 'oferecer', 'agradecer', 'nascer', 'crescer', 'descer', 'aquecer'] },
  { id: 'proteger', conj: 2, flexion: 'regular', suffixes: ['ger'], rule: true, description: 'g → j antes de a/o (protejo, proteja).',
    examples: ['proteger', 'reger', 'abranger', 'eleger'] },
  { id: 'agir', conj: 3, flexion: 'regular', suffixes: ['gir'], rule: true, description: 'g → j antes de a/o (ajo, aja).',
    examples: ['agir', 'dirigir', 'exigir', 'corrigir', 'fingir', 'atingir', 'surgir', 'afligir', 'redigir'] },
  { id: 'erguer', conj: 2, flexion: 'regular', suffixes: ['guer'], rule: true, description: 'gu → g antes de a/o (ergo, erga).',
    examples: ['erguer', 'soerguer'] },
  { id: 'distinguir', conj: 3, flexion: 'regular', suffixes: ['guir'], rule: true, description: 'gu → g antes de a/o (distingo, distinga).',
    examples: ['distinguir', 'extinguir'] },
  { id: 'averiguar', conj: 1, flexion: 'regular', suffixes: ['guar'], rule: true,
    description: '-guar: o u é pronunciado, a grafia não muda (averiguo, averigue — sem trema desde 2009).',
    examples: ['averiguar', 'aguar', 'enxaguar', 'apaziguar', 'desaguar', 'minguar'] },
  { id: 'passear', conj: 1, flexion: 'irregular', suffixes: ['ear'], rule: true, rhizo: 'ei',
    description: '-ear: ganha i nas formas rizotônicas (passeio, passeie; passeamos).',
    examples: ['passear', 'recear', 'nomear', 'frear', 'pentear', 'bloquear', 'golpear', 'estrear', 'presentear', 'sortear'] },
  { id: 'odiar', conj: 1, flexion: 'irregular', suffixes: ['iar'], rhizo: 'ei',
    members: ['odiar', 'mediar', 'ansiar', 'remediar', 'incendiar', 'intermediar'],
    description: 'Verbos "MARIO" em -iar: i → ei nas formas rizotônicas (odeio, odeie; odiamos).' },
  { id: 'possuir', conj: 3, flexion: 'regular', suffixes: ['uir'], rule: true,
    description: '-uir: VT "i" em tu/ele (possuis, possui) e acento no i tônico em hiato (possuímos, possuía).',
    forms: { pres_ind: [undefined, 'u|i||s', 'u|i||'] },
    examples: ['possuir', 'concluir', 'incluir', 'excluir', 'atribuir', 'contribuir', 'distribuir', 'diminuir', 'substituir', 'instruir', 'influir', 'usufruir'] },
  { id: 'construir', conj: 3, flexion: 'irregular', suffixes: ['truir'], members: ['construir', 'destruir', 'reconstruir'],
    description: 'u → ó/o em tu/ele/eles (constróis, constrói, constroem).',
    forms: { pres_ind: [undefined, 'tró|i||s', 'tró|i||', undefined, undefined, 'tro|e||m'] } },
  { id: 'produzir', conj: 3, flexion: 'irregular', suffixes: ['uzir'], rule: true, drop3sg: true,
    description: '-uzir: a 3ª p. sg. perde o -e (produz) e o imperativo acompanha.',
    examples: ['produzir', 'conduzir', 'traduzir', 'reduzir', 'deduzir', 'introduzir', 'seduzir', 'reproduzir', 'luzir', 'reluzir'] },
  { id: 'moer', conj: 2, flexion: 'irregular', suffixes: ['oer'], rule: true,
    description: '-oer: móis, mói; acento no i tônico em hiato (moía, moído).',
    forms: { pres_ind: [undefined, 'ó|i||s', 'ó|i||'] },
    examples: ['moer', 'roer', 'corroer', 'remoer'] },
  { id: 'sair', conj: 3, flexion: 'irregular', suffixes: ['air'], rule: true, pres1: 'ai',
    description: '-air: saio, sais, sai; acento no i tônico em hiato (saímos, saía, saído).',
    forms: { pres_ind: [undefined, 'a|i||s', 'a|i||'] },
    examples: ['sair', 'cair', 'trair', 'atrair', 'distrair', 'contrair', 'extrair', 'subtrair', 'sobressair', 'decair', 'recair'] },

  // ───────────── Alternância vocálica / consonantal ─────────────
  { id: 'dormir', conj: 3, flexion: 'irregular', suffixes: ['ir'], members: ['dormir', 'engolir'], pres1: oToU,
    description: 'o → u na 1ª p. sg. e no Pres. Subj. (durmo, durma).' },
  { id: 'tossir', conj: 3, flexion: 'irregular', suffixes: ['ir'], members: ['tossir'], pres1: oToU,
    description: 'o → u na 1ª p. sg. e no Pres. Subj. (tusso, tussa).' },
  { id: 'cobrir', conj: 3, flexion: 'irregular', suffixes: ['cobrir'], rule: true, pres1: 'cubr', part: 'coberto',
    description: 'o → u (cubro, cubra) e particípio irregular coberto.', examples: ['cobrir', 'descobrir', 'encobrir', 'recobrir'] },
  { id: 'sentir', conj: 3, flexion: 'irregular', suffixes: ['ir'], pres1: eToI,
    members: ['sentir', 'consentir', 'pressentir', 'ressentir', 'assentir', 'dissentir'],
    description: 'e → i na 1ª p. sg. e no Pres. Subj. (sinto, sinta).' },
  { id: 'mentir', conj: 3, flexion: 'irregular', suffixes: ['ir'], pres1: eToI, members: ['mentir', 'desmentir'],
    description: 'e → i na 1ª p. sg. e no Pres. Subj. (minto, minta).' },
  { id: 'ferir', conj: 3, flexion: 'irregular', suffixes: ['ir'], pres1: eToI,
    members: ['ferir', 'aderir', 'conferir', 'digerir', 'gerir', 'ingerir', 'inserir', 'interferir', 'referir', 'sugerir', 'transferir', 'inferir', 'deferir', 'proferir', 'auferir'],
    description: 'e → i na 1ª p. sg. e no Pres. Subj. (firo, fira).' },
  { id: 'preferir', conj: 3, flexion: 'irregular', suffixes: ['ir'], pres1: eToI, members: ['preferir'],
    description: 'e → i na 1ª p. sg. e no Pres. Subj. (prefiro, prefira).' },
  { id: 'vestir', conj: 3, flexion: 'irregular', suffixes: ['ir'], pres1: eToI,
    members: ['vestir', 'investir', 'revestir', 'despir', 'travestir'],
    description: 'e → i na 1ª p. sg. e no Pres. Subj. (visto, vista; dispo).' },
  { id: 'seguir', conj: 3, flexion: 'irregular', suffixes: ['seguir'], rule: true, pres1: eToI,
    description: 'e → i e gu → g (sigo, siga).', examples: ['seguir', 'conseguir', 'perseguir', 'prosseguir'] },
  { id: 'servir', conj: 3, flexion: 'irregular', suffixes: ['ir'], pres1: eToI, members: ['servir'],
    description: 'e → i na 1ª p. sg. e no Pres. Subj. (sirvo, sirva).' },
  { id: 'repetir', conj: 3, flexion: 'irregular', suffixes: ['ir'], pres1: eToI,
    members: ['repetir', 'competir', 'refletir', 'divertir', 'advertir', 'convergir', 'divergir', 'compelir', 'expelir', 'impelir', 'repelir'],
    description: 'e → i na 1ª p. sg. e no Pres. Subj. (repito, repita; convirjo).' },
  { id: 'agredir', conj: 3, flexion: 'irregular', suffixes: ['ir'], pres1: eToI, pres3: eToI,
    members: ['agredir', 'progredir', 'regredir', 'transgredir', 'prevenir', 'denegrir', 'cerzir'],
    description: 'e → i em todas as formas rizotônicas (agrido, agrides, agride, agridem, agrida).' },
  { id: 'subir', conj: 3, flexion: 'irregular', suffixes: ['ir'], pres3: uToO,
    members: ['subir', 'sumir', 'acudir', 'sacudir', 'consumir', 'cuspir', 'bulir', 'escapulir'],
    description: 'u → o em tu/ele/eles do Pres. Ind. (sobes, sobe, sobem).' },
  { id: 'fugir', conj: 3, flexion: 'irregular', suffixes: ['ir'], pres3: uToO, members: ['fugir'],
    description: 'u → o em tu/ele/eles (foges, foge) e g → j (fujo, fuja).' },
  { id: 'polir', conj: 3, flexion: 'irregular', suffixes: ['ir'], pres1: oToU, pres3: oToU, members: ['polir'],
    description: 'o → u nas formas rizotônicas (pulo, pules, pule, pulem, pula).' },
  { id: 'frigir', conj: 3, flexion: 'irregular', suffixes: ['ir'], pres3: iToE, members: ['frigir'],
    description: 'i → e em tu/ele/eles (freges, frege) e g → j (frijo, frija).' },
  { id: 'pedir', conj: 3, flexion: 'irregular', suffixes: ['pedir'], rule: true, pres1: 'peç',
    description: 'd → ç na 1ª p. sg. e no Pres. Subj. (peço, peça).', examples: ['pedir', 'despedir', 'expedir', 'impedir', 'desimpedir'] },
  { id: 'medir', conj: 3, flexion: 'irregular', suffixes: ['medir'], rule: true, pres1: 'meç',
    description: 'd → ç na 1ª p. sg. e no Pres. Subj. (meço, meça).', examples: ['medir'] },
  { id: 'ouvir', conj: 3, flexion: 'irregular', suffixes: ['ouvir'], rule: true, pres1: 'ouç',
    description: 'v → ç na 1ª p. sg. e no Pres. Subj. (ouço, ouça).', examples: ['ouvir', 'entreouvir'] },
  { id: 'perder', conj: 2, flexion: 'irregular', suffixes: ['perder'], rule: true, pres1: 'perc',
    description: 'd → c na 1ª p. sg. e no Pres. Subj. (perco, perca).', examples: ['perder'] },
  { id: 'valer', conj: 2, flexion: 'irregular', suffixes: ['valer'], rule: true, pres1: 'valh',
    description: 'l → lh na 1ª p. sg. e no Pres. Subj. (valho, valha).', examples: ['valer', 'equivaler', 'desvaler'] },
  { id: 'abrir', conj: 3, flexion: 'irregular', suffixes: ['abrir'], rule: true, part: 'aberto',
    description: 'Regular, exceto o particípio aberto.', examples: ['abrir', 'reabrir', 'entreabrir'] },
  { id: 'escrever', conj: 2, flexion: 'irregular', suffixes: ['screver'], rule: true, part: 'scrito',
    description: 'Regular, exceto o particípio escrito.',
    examples: ['escrever', 'descrever', 'inscrever', 'prescrever', 'subscrever', 'transcrever', 'reescrever'] },

  // ───────────── Irregulares fortes e anômalos ─────────────
  { id: 'ser', conj: 2, flexion: 'anomalo', suffixes: ['ser'], members: ['ser'],
    description: 'Anômalo: radicais supletivos s-/e-/fo-.',
    forms: {
      pres_ind: ['sou', 'és', 'é', 'somos', 'sois', 'são'],
      pret_imp_ind: ['era', 'eras', 'era', 'éramos', 'éreis', 'eram'],
      pres_subj: ['seja', 'sejas', 'seja', 'sejamos', 'sejais', 'sejam'],
      imp_afirm: [null, 'sê', 'seja', 'sejamos', 'sede', 'sejam'],
    },
    perf: { stem: 'f', vt: 'o', p0: 'fui', p2: 'foi' },
    nonseg: ['pret_perf_ind', 'pret_mqp_ind', 'pret_imp_subj', 'fut_subj'] },
  { id: 'ir', conj: 3, flexion: 'anomalo', suffixes: ['ir'], members: ['ir'], segmentable: false,
    description: 'Anômalo: radicais supletivos v-/i-/fo-.',
    forms: {
      pres_ind: ['vou', 'vais', 'vai', 'vamos', 'ides', 'vão'],
      pres_subj: ['vá', 'vás', 'vá', 'vamos', 'vades', 'vão'],
    },
    perf: { stem: 'f', vt: 'o', p0: 'fui', p2: 'foi' } },
  { id: 'estar', conj: 1, flexion: 'irregular', suffixes: ['estar'], members: ['estar', 'sobrestar'],
    description: 'estou, estás; esteja; tema do perfeito estive-.',
    forms: { pres_ind: ['estou', 'est|á||s', 'est|á||', undefined, undefined, 'estão'] },
    subj: 'estej', subjDmt: 'a',
    perf: { stem: 'estiv', vt: 'e', p0: 'estive', p2: 'esteve' } },
  { id: 'dar', conj: 1, flexion: 'irregular', suffixes: ['dar'], members: ['dar'],
    description: 'dou, dás; dê, deem; tema do perfeito de-.',
    forms: {
      pres_ind: ['dou', 'd|á||s', 'd|á||', undefined, undefined, 'dão'],
      pres_subj: ['d||ê|', 'd||ê|s', 'd||ê|', 'd||e|mos', 'd||e|is', 'deem'],
    },
    perf: { stem: 'd', vt: 'e', p0: 'd|e||i', p2: 'd|e||u' } },
  { id: 'haver', conj: 2, flexion: 'irregular', suffixes: ['haver'], members: ['haver'],
    description: 'hei, hás, há, hão; haja; tema do perfeito houve-.',
    forms: { pres_ind: ['hei', 'h|á||s', 'h|á||', undefined, undefined, 'hão'] },
    subj: 'haj', perf: { stem: 'houv', vt: 'e', p0: 'houve', p2: 'houve' } },
  { id: 'ter', conj: 2, flexion: 'irregular', suffixes: ['ter'],
    members: ['ter', 'manter', 'conter', 'deter', 'obter', 'reter', 'entreter', 'abster', 'ater', 'suster'],
    description: 'tenho, tens, têm; tinha; tema do perfeito tive-. Derivados: mantém, contêm.',
    pres1: 'tenh',
    forms: {
      pres_ind: [undefined, 'tens', 'tem', undefined, 'tendes', 'têm'],
      pret_imp_ind: imperfOverride('tinh', 'tính'),
    },
    perf: { stem: 'tiv', vt: 'e', p0: 'tive', p2: 'teve' },
    derivFix: { tens: 'téns', tem: 'tém' } },
  { id: 'vir', conj: 3, flexion: 'irregular', suffixes: ['vir'],
    members: ['vir', 'convir', 'intervir', 'provir', 'advir', 'sobrevir', 'desavir', 'avir'],
    description: 'venho, vens, vêm; vinha; tema do perfeito vie-. Derivados: convém, intervêm.',
    pres1: 'venh',
    forms: {
      pres_ind: [undefined, 'vens', 'vem', undefined, 'vindes', 'vêm'],
      pret_imp_ind: imperfOverride('vinh', 'vính'),
    },
    perf: { stem: 'vi', vt: 'e', p0: 'vim', p2: 'veio' },
    part: 'vindo', derivFix: { vens: 'véns', vem: 'vém' } },
  { id: 'ver', conj: 2, flexion: 'irregular', suffixes: ['ver'], members: ['ver', 'prever', 'rever', 'antever', 'entrever'],
    description: 'vejo, vês, veem; vi, viu; particípio visto.',
    pres1: 'vej',
    forms: { pres_ind: [undefined, 'v|ê||s', 'v|ê||', undefined, 'v|e||des', 'veem'] },
    perf: { stem: 'v', vt: 'i', p0: 'v|||i', p2: 'v|i||u' }, part: 'visto' },
  { id: 'fazer', conj: 2, flexion: 'irregular', suffixes: ['fazer'], rule: true, pres1: 'faç', drop3sg: true,
    description: 'faço, faz; fiz, fez; farei; feito.', examples: ['fazer', 'desfazer', 'refazer', 'satisfazer', 'perfazer'],
    perf: { stem: 'fiz', vt: 'e', p0: 'fiz', p2: 'fez' }, fut: ['fa', ''], part: 'feito' },
  { id: 'dizer', conj: 2, flexion: 'irregular', suffixes: ['dizer'], rule: true, pres1: 'dig', drop3sg: true,
    description: 'digo, diz; disse; direi; dito.', examples: ['dizer', 'bendizer', 'maldizer', 'predizer', 'contradizer', 'desdizer'],
    perf: { stem: 'diss', vt: 'e', p0: 'disse', p2: 'disse' }, fut: ['di', ''], part: 'dito' },
  { id: 'trazer', conj: 2, flexion: 'irregular', suffixes: ['trazer'], rule: true, pres1: 'trag', drop3sg: true,
    description: 'trago, traz; trouxe; trarei.', examples: ['trazer'],
    perf: { stem: 'troux', vt: 'e', p0: 'trouxe', p2: 'trouxe' }, fut: ['tra', ''] },
  { id: 'poder', conj: 2, flexion: 'irregular', suffixes: ['poder'], members: ['poder'], pres1: 'poss', defective: 'semImperativo',
    description: 'posso, possa; pude, pôde; sem imperativo.',
    perf: { stem: 'pud', vt: 'e', p0: 'pude', p2: 'pôde' } },
  { id: 'querer', conj: 2, flexion: 'irregular', suffixes: ['querer'], members: ['querer', 'malquerer'], drop3sg: true, subj: 'queir',
    description: 'quer; queira; quis.', perf: { stem: 'quis', vt: 'e', p0: 'quis', p2: 'quis' } },
  { id: 'requerer', conj: 2, flexion: 'irregular', suffixes: ['requerer'], members: ['requerer'], pres1: 'requeir', drop3sg: true,
    description: 'requeiro, requer, requeira; perfeito regular (requeri).' },
  { id: 'saber', conj: 2, flexion: 'irregular', suffixes: ['saber'], members: ['saber'], subj: 'saib',
    description: 'sei, saiba; soube.',
    forms: { pres_ind: ['sei'] }, perf: { stem: 'soub', vt: 'e', p0: 'soube', p2: 'soube' } },
  { id: 'caber', conj: 2, flexion: 'irregular', suffixes: ['caber'], members: ['caber'], pres1: 'caib', defective: 'semImperativo',
    description: 'caibo, caiba; coube; sem imperativo.', perf: { stem: 'coub', vt: 'e', p0: 'coube', p2: 'coube' } },
  { id: 'pôr', conj: 2, flexion: 'irregular', suffixes: ['pôr', 'por'], rule: true, members: ['pôr'], vt: 'o', pres1: 'ponh',
    description: 'ponho, pões, põe; punha; pus, pôs; porei; posto. Derivados: compor, propor, supor…',
    examples: ['pôr', 'compor', 'propor', 'supor', 'dispor', 'repor', 'expor', 'impor', 'depor', 'opor', 'transpor', 'pressupor'],
    forms: {
      pres_ind: [undefined, 'pões', 'põe', 'p|o||mos', 'pondes', 'põem'],
      pret_imp_ind: imperfOverride('punh', 'púnh'),
      infinitivo: ['p|ô|r|'],
    },
    perf: { stem: 'pus', vt: 'e', p0: 'pus', p2: 'pôs' }, fut: ['p', 'o'], part: 'posto', derivFix: { ô: 'o' } },
  { id: 'ler', conj: 2, flexion: 'irregular', suffixes: ['ler'], members: ['ler', 'reler'], pres1: 'lei',
    description: 'leio, lês, lê, leem; leia.',
    forms: { pres_ind: [undefined, 'l|ê||s', 'l|ê||', undefined, 'l|e||des', 'leem'] } },
  { id: 'crer', conj: 2, flexion: 'irregular', suffixes: ['crer'], members: ['crer', 'descrer'], pres1: 'crei',
    description: 'creio, crês, crê, creem; creia.',
    forms: { pres_ind: [undefined, 'cr|ê||s', 'cr|ê||', undefined, 'cr|e||des', 'creem'] } },
  { id: 'rir', conj: 3, flexion: 'irregular', suffixes: ['rir'], members: ['rir', 'sorrir'], pres1: 'ri',
    description: 'rio, ris, ri, rides, riem; ria.',
    forms: { pres_ind: [undefined, 'r|i||s', 'r|i||', undefined, 'r|i||des', 'ri|e||m'] } },
  { id: 'prover', conj: 2, flexion: 'irregular', suffixes: ['prover'], members: ['prover'], pres1: 'provej',
    description: 'Presente como ver (provejo, provê, proveem), mas perfeito regular (provi, proveu) e particípio provido.',
    forms: { pres_ind: [undefined, 'prov|ê||s', 'prov|ê||', undefined, 'prov|e||des', 'proveem'] } },
  { id: 'jazer', conj: 2, flexion: 'irregular', suffixes: ['jazer'], members: ['jazer'], drop3sg: true,
    description: 'jaz (3ª p. sg. sem VT); o resto é regular (jazi, jazia).' },
  { id: 'aprazer', conj: 2, flexion: 'irregular', suffixes: ['aprazer'], members: ['aprazer'], drop3sg: true,
    description: 'apraz; tema do perfeito aprouve-.', perf: { stem: 'aprouv', vt: 'e', p0: 'aprouve', p2: 'aprouve' } },

  // ───────────── Defectivos ─────────────
  { id: 'abolir', conj: 3, flexion: 'defectivo', suffixes: ['ir'], defective: 'abolir',
    members: ['abolir', 'banir', 'colorir', 'demolir', 'explodir', 'brandir', 'carpir', 'exaurir', 'haurir', 'florir'],
    description: 'Sem a 1ª p. sg. do Pres. Ind. e, portanto, sem Pres. Subj. e Imperativo Negativo.' },
  { id: 'falir', conj: 3, flexion: 'defectivo', suffixes: ['ir'], defective: 'falir',
    members: ['falir', 'aguerrir', 'combalir', 'foragir'],
    description: 'Pres. Ind. só com nós/vós; sem Pres. Subj.; imperativo só "vós".' },
  { id: 'adequar', conj: 1, flexion: 'defectivo', suffixes: ['ar'], defective: 'falir', members: ['adequar'],
    description: 'Norma tradicional: só as formas arrizotônicas (adequamos, adequais).' },
  { id: 'precaver', conj: 2, flexion: 'defectivo', suffixes: ['er'], defective: 'falir', members: ['precaver'],
    description: 'Pres. Ind. só com nós/vós (precavemos); perfeito regular (precavi). Não deriva de ver nem de vir.' },
  { id: 'reaver', conj: 2, flexion: 'defectivo', suffixes: ['reaver'], defective: 'falir', members: ['reaver'],
    description: 'Só as formas em que haver tem "v" (reavemos, reouve, reaverei).',
    perf: { stem: 'reouv', vt: 'e', p0: 'reouve', p2: 'reouve' } },
  { id: 'viger', conj: 2, flexion: 'defectivo', suffixes: ['er'], defective: 'abolir', members: ['viger'],
    description: 'Como abolir, mas da 2ª conjugação: sem a 1ª p. sg. do Pres. Ind. nem Pres. Subj. (a lei vige).' },
  { id: 'ruir', conj: 3, flexion: 'defectivo', suffixes: ['uir'], defective: 'abolir', members: ['ruir'],
    description: 'Como possuir (ruis, rui, ruímos), mas sem a 1ª p. sg. do Pres. Ind. nem Pres. Subj.',
    forms: { pres_ind: [undefined, 'u|i||s', 'u|i||'] } },
  { id: 'doer', conj: 2, flexion: 'defectivo', suffixes: ['oer'], defective: 'impessoal', members: ['doer', 'soer'],
    description: 'Unipessoal: só 3ª pessoa (dói, doem; sói, soem), com acentuação de moer.',
    forms: { pres_ind: [undefined, 'ó|i||s', 'ó|i||'] } },
  { id: 'latir', conj: 3, flexion: 'defectivo', suffixes: ['ir'], defective: 'impessoal', members: ['latir', 'ganir', 'grunhir', 'zumbir'],
    description: 'Unipessoal (vozes de animais): só 3ª pessoa, sem imperativo.' },
  { id: 'chover', conj: 2, flexion: 'defectivo', suffixes: ['er'], defective: 'impessoal',
    members: ['chover', 'amanhecer', 'anoitecer', 'entardecer'],
    description: 'Impessoal (fenômeno da natureza): só 3ª pessoa, sem imperativo.' },
  { id: 'nevar', conj: 1, flexion: 'defectivo', suffixes: ['ar'], defective: 'impessoal',
    members: ['nevar', 'ventar', 'trovejar', 'relampejar', 'garoar', 'chuviscar'],
    description: 'Impessoal (fenômeno da natureza): só 3ª pessoa, sem imperativo.' },
];

/**
 * Verbos abundantes: o desafio usa o particípio REGULAR (com ter/haver);
 * o irregular (com ser/estar) aparece na nota do morfema.
 */
export const ABUNDANT_PARTICIPLES: Record<string, string> = {
  aceitar: 'aceito', entregar: 'entregue', expressar: 'expresso', expulsar: 'expulso', imprimir: 'impresso',
  morrer: 'morto', matar: 'morto', pagar: 'pago', ganhar: 'ganho', gastar: 'gasto', eleger: 'eleito',
  prender: 'preso', acender: 'aceso', salvar: 'salvo', soltar: 'solto', suspender: 'suspenso',
  extinguir: 'extinto', encher: 'cheio', limpar: 'limpo', enxugar: 'enxuto', isentar: 'isento', omitir: 'omisso', fritar: 'frito',
};

export const PARADIGM_BY_ID: Map<string, ParadigmDef> = new Map(PARADIGMS.map((p) => [p.id, p]));

/** Índice explícito: infinitivo → paradigma. */
export const MEMBER_INDEX: Map<string, ParadigmDef> = (() => {
  const m = new Map<string, ParadigmDef>();
  for (const p of PARADIGMS) for (const v of p.members ?? []) m.set(v, p);
  return m;
})();

/** Regras por sufixo, do mais longo para o mais curto. */
export const SUFFIX_RULES: [string, ParadigmDef][] = PARADIGMS.filter((p) => p.rule)
  .flatMap((p) => p.suffixes.map((s) => [s, p] as [string, ParadigmDef]))
  .sort((a, b) => b[0].length - a[0].length);

/** Todos os verbos citados na tabela (membros, exemplos e abundantes) — útil para testes e para o léxico. */
export const KNOWN_VERBS: string[] = (() => {
  const s = new Set<string>();
  for (const p of PARADIGMS) {
    s.add(p.id);
    for (const v of p.members ?? []) s.add(v);
    for (const v of p.examples ?? []) s.add(v);
  }
  for (const v of Object.keys(ABUNDANT_PARTICIPLES)) s.add(v);
  return [...s];
})();
