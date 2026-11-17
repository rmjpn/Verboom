// OWNER: agente engine-morphology. Metadados dos tempos (PRD §2 e §4.2).
import type { NotebookLevel, PersonIndex, TenseId, TenseInfo } from '../types/grammar';

/**
 * Níveis (PRD §4.2):
 *  1 Caligrafia — presente, pretérito perfeito, pretérito imperfeito, futuro do presente e formas nominais;
 *  2 Brochura   — + mais-que-perfeito, futuro do pretérito, presente do subjuntivo e imperativos
 *                 (o imperativo deriva do presente do subjuntivo, por isso entra junto);
 *  3 Universitário — + pretérito imperfeito e futuro do subjuntivo (derivados do tema do perfeito).
 */
export const TENSES: Record<TenseId, TenseInfo> = {
  pres_ind: { id: 'pres_ind', mood: 'indicativo', label: 'Presente do Indicativo', short: 'Pres. Ind.', minLevel: 1, personal: true },
  pret_perf_ind: { id: 'pret_perf_ind', mood: 'indicativo', label: 'Pretérito Perfeito do Indicativo', short: 'Pret. Perf. Ind.', minLevel: 1, personal: true },
  pret_imp_ind: { id: 'pret_imp_ind', mood: 'indicativo', label: 'Pretérito Imperfeito do Indicativo', short: 'Pret. Imperf. Ind.', minLevel: 1, personal: true },
  pret_mqp_ind: { id: 'pret_mqp_ind', mood: 'indicativo', label: 'Pretérito Mais-que-perfeito do Indicativo', short: 'Pret. Mais-que-perf. Ind.', minLevel: 2, personal: true },
  fut_pres_ind: { id: 'fut_pres_ind', mood: 'indicativo', label: 'Futuro do Presente do Indicativo', short: 'Fut. Pres. Ind.', minLevel: 1, personal: true },
  fut_pret_ind: { id: 'fut_pret_ind', mood: 'indicativo', label: 'Futuro do Pretérito do Indicativo', short: 'Fut. Pret. Ind.', minLevel: 2, personal: true },
  pres_subj: { id: 'pres_subj', mood: 'subjuntivo', label: 'Presente do Subjuntivo', short: 'Pres. Subj.', minLevel: 2, personal: true },
  pret_imp_subj: { id: 'pret_imp_subj', mood: 'subjuntivo', label: 'Pretérito Imperfeito do Subjuntivo', short: 'Pret. Imperf. Subj.', minLevel: 3, personal: true },
  fut_subj: { id: 'fut_subj', mood: 'subjuntivo', label: 'Futuro do Subjuntivo', short: 'Fut. Subj.', minLevel: 3, personal: true },
  imp_afirm: { id: 'imp_afirm', mood: 'imperativo', label: 'Imperativo Afirmativo', short: 'Imp. Afirm.', minLevel: 2, personal: true },
  imp_neg: { id: 'imp_neg', mood: 'imperativo', label: 'Imperativo Negativo', short: 'Imp. Neg.', minLevel: 2, personal: true },
  infinitivo: { id: 'infinitivo', mood: 'nominal', label: 'Infinitivo', short: 'Infinitivo', minLevel: 1, personal: false },
  gerundio: { id: 'gerundio', mood: 'nominal', label: 'Gerúndio', short: 'Gerúndio', minLevel: 1, personal: false },
  participio: { id: 'participio', mood: 'nominal', label: 'Particípio', short: 'Particípio', minLevel: 1, personal: false },
};

/** Ordem canônica de exibição (tabela de conjugação). */
export const TENSE_ORDER: TenseId[] = [
  'pres_ind', 'pret_perf_ind', 'pret_imp_ind', 'pret_mqp_ind', 'fut_pres_ind', 'fut_pret_ind',
  'pres_subj', 'pret_imp_subj', 'fut_subj',
  'imp_afirm', 'imp_neg',
  'infinitivo', 'gerundio', 'participio',
];

export const PERSONS: PersonIndex[] = [0, 1, 2, 3, 4, 5];

/** Tempos disponíveis até um nível do caderno. */
export function tensesForLevel(level: NotebookLevel): TenseId[] {
  return TENSE_ORDER.filter((t) => TENSES[t].minLevel <= level);
}
