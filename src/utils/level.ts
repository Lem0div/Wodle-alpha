// src/utils/level.ts

// Each level costs 20% more exp than the last: 1000 for lv1->2, 1200 for
// lv2->3, 1440 for lv3->4, ... (increment(i) = 1000 * 1.2^(i-1)).
// expRequiredForLevel(L) is the *cumulative* exp needed to reach level L,
// starting at lv 1 with 0 exp — the geometric series sum reduces to:
// sum_{i=1}^{L-1} 1000*1.2^(i-1) = 5000 * (1.2^(L-1) - 1)
export function expRequiredForLevel(level: number): number {
  return Math.round(5000 * (1.2 ** (level - 1) - 1) / 10) * 10
}

export function getLevelForExp(exp: number): number {
  let level = 1
  while (expRequiredForLevel(level + 1) <= exp) {
    level++
  }
  return level
}
