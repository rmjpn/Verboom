import { fold } from './labels';

export type Segment = { text: string; hl: boolean };

/**
 * Divide uma frase em segmentos, marcando as palavras que correspondem a uma das
 * formas exatas (`words`) ou que começam pelo radical (`stem`, ≥ 3 letras).
 */
export function highlightSegments(sentence: string, words: string[], stem?: string): Segment[] {
  const targets = new Set(words.filter(Boolean).map(fold));
  const foldedStem = stem && stem.length >= 3 ? fold(stem) : null;
  const parts = sentence.split(/([\p{L}\p{M}-]+)/u);
  const out: Segment[] = [];
  for (const part of parts) {
    if (!part) continue;
    const f = fold(part);
    const isWord = /[\p{L}]/u.test(part);
    const hl = isWord && (targets.has(f) || (!!foldedStem && f.startsWith(foldedStem)));
    const last = out[out.length - 1];
    if (last && last.hl === hl && !hl) last.text += part;
    else out.push({ text: part, hl });
  }
  return out;
}
