import { TENSES } from '../engine/conjugator';
import { LEVEL_NAMES, xpToNextLevel } from '../engine/spacedRepetition';
import { PERSON_LABELS, PERSON_PRONOUNS } from '../types/grammar';
import type { Challenge, NotebookLevel, PersonIndex, TenseId } from '../types/grammar';

/** Rótulos de reserva caso TENSES ainda não esteja populado. */
const FALLBACK_TENSE_LABELS: Record<TenseId, string> = {
  pres_ind: 'Presente do Indicativo',
  pret_perf_ind: 'Pretérito Perfeito do Indicativo',
  pret_imp_ind: 'Pretérito Imperfeito do Indicativo',
  pret_mqp_ind: 'Pretérito Mais-que-perfeito do Indicativo',
  fut_pres_ind: 'Futuro do Presente do Indicativo',
  fut_pret_ind: 'Futuro do Pretérito do Indicativo',
  pres_subj: 'Presente do Subjuntivo',
  pret_imp_subj: 'Pretérito Imperfeito do Subjuntivo',
  fut_subj: 'Futuro do Subjuntivo',
  imp_afirm: 'Imperativo Afirmativo',
  imp_neg: 'Imperativo Negativo',
  infinitivo: 'Infinitivo',
  gerundio: 'Gerúndio',
  participio: 'Particípio',
};

export function tenseLabel(id: TenseId): string {
  return TENSES?.[id]?.label ?? FALLBACK_TENSE_LABELS[id] ?? id;
}

export function isImperative(id: TenseId): boolean {
  return id === 'imp_afirm' || id === 'imp_neg';
}

export function pronounFor(tense: TenseId, person: PersonIndex): string {
  if (isImperative(tense)) {
    if (person === 2) return 'você';
    if (person === 5) return 'vocês';
  }
  return PERSON_PRONOUNS[person];
}

export function personLabel(tense: TenseId, person: PersonIndex | null): string | null {
  if (person === null) return null;
  return `${PERSON_LABELS[person]} (${pronounFor(tense, person)})`;
}

/** Ex.: "Pretérito Mais-que-perfeito do Indicativo — 1ª pessoa do plural (nós)". */
export function challengeLabel(c: Pick<Challenge, 'tense' | 'person'>): string {
  const p = personLabel(c.tense, c.person);
  return p ? `${tenseLabel(c.tense)} — ${p}` : tenseLabel(c.tense);
}

export function levelName(level: NotebookLevel): string {
  return LEVEL_NAMES?.[level] ?? `Caderno nível ${level}`;
}

/** Progresso dentro do nível (0..1) e rótulo. `xpToNextLevel` devolve XP dentro do nível / XP do nível. */
export function levelProgress(xp: number): { ratio: number; label: string } {
  try {
    const { current, next } = xpToNextLevel(xp);
    if (next === null) return { ratio: 1, label: `${xp} XP · nível máximo` };
    if (next > 0) return { ratio: Math.max(0, Math.min(1, current / next)), label: `${current} / ${next} XP` };
  } catch {
    // motor indisponível
  }
  return { ratio: 0, label: `${xp} XP` };
}

/** Remove acentos e baixa a caixa (comparação flexível para destaque). */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
