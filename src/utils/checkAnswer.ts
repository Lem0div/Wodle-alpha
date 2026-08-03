// src/utils/checkAnswer.ts

function normalize(str: string): string {
  return str
    .replace(/\(.*?\)/g, '')   // 괄호 안 내용 제거
    .replace(/\s/g, '')        // 띄어쓰기 제거
    .toLowerCase()             // 소문자로
    .trim()
}

export function checkAnswer(input: string, correct: string): boolean {
  const normalizedInput = normalize(input)

  // 쉼표나 세미콜론으로 분리해서 하나라도 맞으면 정답
  const answers = correct.split(/[,;]/).map(a => normalize(a))
  return answers.some(a => a === normalizedInput)
}
