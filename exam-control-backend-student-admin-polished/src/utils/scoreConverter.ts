export function convertScore(rawScore: number, rawTotal: number, convertedTotal = 30): number {
  if (rawTotal <= 0) return 0;
  return Math.round((rawScore / rawTotal) * convertedTotal * 10) / 10;
}
