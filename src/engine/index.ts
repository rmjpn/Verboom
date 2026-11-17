// OWNER: agente engine-morphology. Barril do motor morfológico (conjugador + parser).
// O módulo de repetição espaçada (spacedRepetition.ts) é importado diretamente pelo seu dono.
export {
  TENSES, TENSE_ORDER, PARADIGM_COUNT, PERSON_WEIGHTS,
  classify, conjugate, conjugateAll, pickRandomFlexion, pickPerson, availablePersons, isImpersonal,
  type VerbClassification,
} from './conjugator';
export {
  normalize, buildChallenge, checkAttempt, explainMorphemes, modelSentence,
  type SlotKind, type BlockAnswer,
} from './morphemeParser';
export { mulberry32, shuffle, weightedPick, type Rng } from './rng';
export { PARADIGMS, KNOWN_VERBS, ABUNDANT_PARTICIPLES, type ParadigmDef } from './paradigms';
export { tensesForLevel, PERSONS } from './tenses';
export { stripAccents } from './text';
