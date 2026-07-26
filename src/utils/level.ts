// src/utils/level.ts

// 1000 exp per level, starting at lv 1 — matches TopNav's `exp % 1000` bar
export function getLevelForExp(exp: number): number {
  return 1 + Math.floor(exp / 1000)
}
