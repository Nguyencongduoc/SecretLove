export function audioRange(
  value: string | null,
  size: number,
): { start: number; end: number } | null | false {
  if (value === null) return null;
  if (value.length > 100 || !/^bytes=\d*-\d*$/.test(value)) return false;
  const [a, b] = value.slice(6).split('-');
  if (!a && !b) return false;
  const first = Number(a),
    last = Number(b);
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) return false;
  if (!a) return last > 0 ? { start: Math.max(0, size - last), end: size - 1 } : false;
  if (first >= size || (b && last < first)) return false;
  return { start: first, end: b ? Math.min(last, size - 1) : size - 1 };
}
