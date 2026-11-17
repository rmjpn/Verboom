// OWNER: agente engine-morphology. Aleatoriedade determinística para o motor (sem React/Expo).

/** Gerador uniforme em [0, 1). `Math.random` serve como padrão. */
export type Rng = () => number;

/** PRNG pequeno e determinístico (mulberry32) — use em testes: `mulberry32(42)`. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inteiro uniforme em [0, n). */
export function randInt(rng: Rng, n: number): number {
  return Math.min(n - 1, Math.max(0, Math.floor(rng() * n)));
}

/** Embaralhamento de Fisher–Yates (não altera o array original). */
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sorteio ponderado. Pesos ≤ 0 nunca são escolhidos (a menos que todos sejam ≤ 0). */
export function weightedPick<T>(items: readonly T[], weights: readonly number[], rng: Rng): T {
  if (items.length === 0) throw new Error('weightedPick: lista vazia');
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return items[randInt(rng, items.length)];
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    const w = Math.max(0, weights[i]);
    if (r < w) return items[i];
    r -= w;
  }
  return items[items.length - 1];
}
