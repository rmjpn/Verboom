// OWNER: agente engine-morphology. Desinências regulares segmentadas (VT, DMT, DNP).
//
// Análise adotada (gramática escolar brasileira, linha Cegalla/Bechara):
//   Presente Ind.      cant-∅-∅-o, cant-a-∅-s, part-e-∅-s (VT "e" = alomorfe de "i"), part-i-∅-s (vós: "is" → "s")
//   Pret. Perfeito     cant-e-∅-i (VT alomorfe "e"), cant-o-∅-u (VT alomorfe "o"), vend-∅-∅-i, part-∅-∅-i,
//                      cant-a-∅-ste, cant-a-∅-mos, cant-a-∅-stes, cant-a-∅-ram (DNP próprias do perfeito)
//   Pret. Imperfeito   cant-a-va-mos / cant-á-va-mos (vogal tônica acentuada na VT), cant-á-ve-is;
//                      vend-i-a-∅ (VT "i" = alomorfe de "e"; DMT "a"), vend-í-a-mos, vend-í-e-is
//   Mais-que-perfeito  cant-a-ra-∅, cant-á-ra-mos, cant-á-re-is, vend-ê-ra-mos, part-í-ra-mos
//   Futuro do Presente cant-a-re-i, cant-a-rá-s, cant-a-rá-∅, cant-a-re-mos, cant-a-re-is, cant-a-rã-o
//                      (DMT "re" com alomorfes "rá"/"rã"; DNP "o" em -ão é alomorfe de "m")
//   Futuro do Pretérito cant-a-ria-∅, cant-a-ría-mos, cant-a-ríe-is
//   Presente Subj.     cant-∅-e-mos (1ª conj.: DMT "e"), vend-∅-a-mos, part-∅-a-mos (2ª/3ª: DMT "a")
//   Pret. Imperf. Subj. cant-a-sse-∅, cant-á-sse-mos
//   Futuro Subj.       cant-a-r-∅, cant-a-r-es, cant-a-r-mos, cant-a-r-des, cant-a-r-em
//   Nominais           cant-a-r, cant-a-ndo, cant-a-do, vend-i-do (o slot DMT guarda a desinência nominal)
// O acento gráfico, quando cai na VT ou na DMT, fica no próprio texto do morfema (ex.: VT "á").
import type { Conjugation, PersonIndex, TenseId } from '../types/grammar';
import { accentVowel } from './text';

export const VT_BY_CONJ: Record<Conjugation, string> = { 1: 'a', 2: 'e', 3: 'i' };

/** DNP gerais (imperfeitos, mais-que-perfeito, subjuntivos, futuro do pretérito). */
export const DNP_STD = ['', 's', '', 'mos', 'is', 'm'];
const DNP_FUT = ['i', 's', '', 'mos', 'is', 'o'];
const DNP_PERF = ['i', 'ste', 'u', 'mos', 'stes', 'ram'];
const DNP_FUT_SUBJ = ['', 'es', '', 'mos', 'des', 'em'];

/** Conjunto "esperado" de DNP por tempo (para marcar alomorfes). */
export function standardDnp(tense: TenseId, p: number): string {
  switch (tense) {
    case 'pres_ind': return p === 0 ? 'o' : DNP_STD[p];
    case 'pret_perf_ind': return DNP_PERF[p];
    case 'fut_pres_ind': return DNP_FUT[p];
    case 'fut_subj': return DNP_FUT_SUBJ[p];
    case 'imp_afirm': return ['', '', '', 'mos', 'i', 'm'][p];
    default: return DNP_STD[p];
  }
}

/** DMT canônica de cada tempo (para marcar alomorfes e montar distratores). */
export function canonicalDmt(tense: TenseId, conj: Conjugation, p: number | null): string {
  switch (tense) {
    case 'pres_ind':
    case 'pret_perf_ind':
      return '';
    case 'pret_imp_ind': return conj === 1 ? 'va' : 'a';
    case 'pret_mqp_ind': return 'ra';
    case 'fut_pres_ind': return 're';
    case 'fut_pret_ind': return 'ria';
    case 'pres_subj':
    case 'imp_neg':
      return conj === 1 ? 'e' : 'a';
    case 'imp_afirm': return p === 1 || p === 4 ? '' : conj === 1 ? 'e' : 'a';
    case 'pret_imp_subj': return 'sse';
    case 'fut_subj': return 'r';
    case 'infinitivo': return 'r';
    case 'gerundio': return 'ndo';
    case 'participio': return 'do';
  }
}

/**
 * Terminações regulares [VT, DMT, DNP] para um tempo simples (exceto imperativos, que são derivados).
 * `vtBase` permite trocar a vogal temática (ex.: tema do perfeito forte "fize-", VT "o" de pôr);
 * `vtAccented` define a VT tônica (perfeito forte: "é" aberto — fizéramos, tivésseis — em vez de "ê").
 */
export function regularEndings(
  conj: Conjugation,
  tense: TenseId,
  person: PersonIndex | null,
  vtBase?: string,
  vtAccented?: string,
): [string, string, string] | null {
  const V = vtBase ?? VT_BY_CONJ[conj];
  const VA = vtAccented ?? accentVowel(V);
  const i = person ?? 0;
  switch (tense) {
    case 'pres_ind': {
      const weak = conj === 3 ? 'e' : V; // part-e-s, part-e, part-e-m
      const table: [string, string, string][] = [
        ['', '', 'o'],
        [weak, '', 's'],
        [weak, '', ''],
        [V, '', 'mos'],
        conj === 3 ? [V, '', 's'] : [V, '', 'is'],
        [weak, '', 'm'],
      ];
      return table[i];
    }
    case 'pret_perf_ind': {
      if (i === 0) return conj === 1 ? ['e', '', 'i'] : ['', '', 'i'];
      if (i === 2) return conj === 1 ? ['o', '', 'u'] : [V, '', 'u'];
      return [V, '', DNP_PERF[i]];
    }
    case 'pret_imp_ind': {
      if (conj === 1) {
        if (i === 3) return [VA, 'va', 'mos'];
        if (i === 4) return [VA, 've', 'is'];
        return [V, 'va', DNP_STD[i]];
      }
      if (i === 3) return ['í', 'a', 'mos'];
      if (i === 4) return ['í', 'e', 'is'];
      return ['i', 'a', DNP_STD[i]];
    }
    case 'pret_mqp_ind':
      if (i === 3) return [VA, 'ra', 'mos'];
      if (i === 4) return [VA, 're', 'is'];
      return [V, 'ra', DNP_STD[i]];
    case 'fut_pres_ind':
      return [V, ['re', 'rá', 'rá', 're', 're', 'rã'][i], DNP_FUT[i]];
    case 'fut_pret_ind':
      return [V, ['ria', 'ria', 'ria', 'ría', 'ríe', 'ria'][i], DNP_STD[i]];
    case 'pres_subj':
      return ['', conj === 1 ? 'e' : 'a', DNP_STD[i]];
    case 'pret_imp_subj':
      return [i === 3 || i === 4 ? VA : V, 'sse', DNP_STD[i]];
    case 'fut_subj':
      return [V, 'r', DNP_FUT_SUBJ[i]];
    case 'infinitivo':
      return [V, 'r', ''];
    case 'gerundio':
      return [V, 'ndo', ''];
    case 'participio':
      return [conj === 1 ? V : 'i', 'do', ''];
    default:
      return null;
  }
}
