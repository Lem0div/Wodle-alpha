// src/utils/level.ts

// Each level requires more exp than the last: going from level L to L+1
// costs 1000*L exp (1000 for lv1->2, 2000 for lv2->3, 3000 for lv3->4, ...).
// expRequiredForLevel(L) is the *cumulative* exp needed to reach level L,
// starting at lv 1 with 0 exp: sum_{i=1}^{L-1} 1000*i = 1000*(L-1)*L/2.
export function expRequiredForLevel(level: number): number {
  return 1000 * (level - 1) * level / 2
}

export function getLevelForExp(exp: number): number {
  let level = 1
  while (expRequiredForLevel(level + 1) <= exp) {
    level++
  }
  return level
}
