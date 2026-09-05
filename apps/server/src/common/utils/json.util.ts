/** Json 字段读写辅助：SQLite 下 Prisma 已做序列化，这里只兜底异常形态 */
export function readJsonArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function readJsonObject<T extends object = Record<string, any>>(value: unknown, fallback: T = {} as T): T {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as T;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as T) : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/** 写入前清洗：去掉 undefined，空数组/空对象写 null，避免库里堆积无意义 JSON */
export function writeJson(value: unknown): any {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) return value.length ? value : null;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
    return entries.length ? Object.fromEntries(entries) : null;
  }
  return value;
}

/** 把 [{label,value}] 形态的入参规整为定长字段，过滤全空行 */
export function normalizePairs(input: unknown): { label: string; value: string }[] {
  return readJsonArray<any>(input)
    .map((row) => ({ label: String(row?.label ?? '').trim(), value: String(row?.value ?? '').trim() }))
    .filter((row) => row.label || row.value);
}

/** 字符串数组规整：去空去重 */
export function normalizeStrings(input: unknown): string[] {
  const list = Array.isArray(input) ? input : typeof input === 'string' ? input.split(/[\n,]/) : [];
  const out: string[] = [];
  for (const raw of list) {
    const v = String(raw ?? '').trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}
