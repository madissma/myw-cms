/** 生成 URL 友好的 slug；中文无法转写时退化为随机后缀，保证唯一可用 */
export function slugify(input: string, fallbackPrefix = 'item'): string {
  const base = (input || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_/\\]+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // 仅保留 ASCII 部分作为可读 slug
  const ascii = base.replace(/[^\x00-\x7F]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (ascii.length >= 2) return ascii;
  return `${fallbackPrefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 在同一集合内保证 slug 唯一：冲突时追加 -2 / -3 … */
export async function uniqueSlug(
  desired: string,
  exists: (slug: string) => Promise<boolean>,
  suffix = 20,
): Promise<string> {
  let candidate = desired;
  let n = 1;
  while (await exists(candidate)) {
    n += 1;
    candidate = `${desired}-${n}`;
    if (n > suffix) throw new Error('slug 生成失败：同名记录过多');
  }
  return candidate;
}

/** 锚点 / 编码规整：仅保留字母数字与短横线 */
export function normalizeCode(input: string): string {
  return (input || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
