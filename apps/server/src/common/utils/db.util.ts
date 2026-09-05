/**
 * 跨库检索片段生成器。
 * SQLite 的 LIKE 对 ASCII 大小写不敏感、无 mode 选项；MySQL 取决于 collation、PostgreSQL 大小写敏感，
 * 因此把「模糊匹配」集中在这里，迁移时只改一处。
 */
const provider = (): string => {
  const url = (process.env.DATABASE_URL || '').toLowerCase();
  if (url.startsWith('mysql:')) return 'mysql';
  if (url.startsWith('postgres')) return 'postgresql';
  return 'sqlite';
};

export function containsFilter(field: string, keyword: string): Record<string, any> {
  const db = provider();
  if (db === 'postgresql') return { [field]: { contains: keyword, mode: 'insensitive' } };
  // SQLite / MySQL：直接 contains，MySQL 侧由 utf8mb4_general_ci 排序规则保证不敏感
  return { [field]: { contains: keyword } };
}

/** 多字段 OR 模糊匹配 */
export function searchFilter(fields: string[], keyword: string): Record<string, any>[] {
  const kw = (keyword || '').trim();
  if (!kw) return [];
  return fields.map((f) => containsFilter(f, kw));
}

export function dbProvider(): string {
  return provider();
}
