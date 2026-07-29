// src/utils/level.ts

// Each level costs 200 more exp than the last: 1000 for lv1->2, 1200 for
// lv2->3, 1400 for lv3->4, ... (increment(x) = 1000 + 200*(x-1)).
// expRequiredForLevel(L) is the *cumulative* exp needed to reach level L,
// starting at lv 1 with 0 exp — the arithmetic series sum reduces to:
// sum_{x=1}^{L-1} [1000 + 200*(x-1)] = 100*(L-1)*(L+8)
export function expRequiredForLevel(level: number): number {
  return 100 * (level - 1) * (level + 8)
}

export function getLevelForExp(exp: number): number {
  let level = 1
  while (expRequiredForLevel(level + 1) <= exp) {
    level++
  }
  return level
}
