// src/utils/random.ts
// Shared deterministic randomness for anything that needs "the same user +
// same key always gets the same pick" without persisting an assignment row
// (daily/weekly/hidden quests, the daily shop rotation, etc).

// A plain "h = h*31 + charCode" hash barely changes for near-identical seeds
// (e.g. "...-2026-07-27" vs "...-2026-07-28" differ by one character), so
// consecutive days kept rolling the same picks. This runs the accumulated
// hash through MurmurHash3's finalizer, which avalanches a 1-bit input
// change into a fully different 32-bit output.
export function hashToUnitFloat(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

// Deterministic per-seed shuffle. Each Fisher-Yates draw is its own
// independent hash (seed + draw index) rather than one chained PRNG state,
// so the picks for neighboring seeds don't stay correlated.
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr]
  let drawIndex = 0
  for (let i = result.length - 1; i > 0; i--, drawIndex++) {
    const j = Math.floor(hashToUnitFloat(`${seed}#${drawIndex}`) * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
