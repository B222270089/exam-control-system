export function roundScore(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatDateTime(value?: string | Date) {
  if (!value) return "-";
  return new Date(value).toLocaleString("mn-MN", { hour12: false });
}
