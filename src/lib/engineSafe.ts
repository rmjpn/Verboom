/**
 * Chamadas ao motor protegidas para a UI: se o motor lançar (stub ou dado faltando),
 * a tela mostra um conteúdo de reserva em vez de quebrar.
 */
import { explainMorphemes, modelSentence } from '../engine/morphemeParser';
import type { Challenge, MorphemeKind } from '../types/grammar';
import { morphemeColors } from '../theme/tokens';

export type Dissection = { kind: MorphemeKind; text: string; explanation: string }[];

export function safeExplain(challenge: Challenge): Dissection {
  try {
    const res = explainMorphemes(challenge);
    if (Array.isArray(res) && res.length) return res;
  } catch {
    // fallback abaixo
  }
  return challenge.form.morphemes.map((m) => ({
    kind: m.kind,
    text: m.text,
    explanation:
      m.note ?? (m.text === '' ? `${morphemeColors[m.kind].name}: desinência zero (sem marca sonora).` : morphemeColors[m.kind].name),
  }));
}

export function safeModelSentence(challenge: Challenge): string | null {
  try {
    const s = modelSentence(challenge);
    return s && s.trim() ? s : null;
  } catch {
    return null;
  }
}
