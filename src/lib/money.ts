/** Reads "45.000", "45000", "€ 45.000,50" or "45,000.50" as a number. */
export function parseMoney(input: string): number | null {
  let s = input.replace(/[€\s]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const decimalAt = Math.max(lastComma, lastDot);
  if (decimalAt >= 0 && s.length - decimalAt - 1 <= 2 && s.length - decimalAt - 1 > 0) {
    s = s.slice(0, decimalAt).replace(/[.,]/g, "") + "." + s.slice(decimalAt + 1);
  } else {
    s = s.replace(/[.,]/g, "");
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}
