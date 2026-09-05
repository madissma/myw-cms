/**
 * 展示层格式化工具。
 *
 * 后端时间字段一律返回 ISO 串（SQLite 下由 Prisma 存整型毫秒），
 * 现网页面此前直接渲染 `2024-03-18` 这类字符串，改造后需自行截取，
 * 否则页面会跳出 `2024-03-18T00:00:00.000Z`。
 */

/** ISO 串 / Date / 时间戳 -> YYYY-MM-DD，无值返回空串 */
export function formatDate(value?: string | number | Date | null): string {
  if (!value && value !== 0) return ''
  const raw = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const date = value instanceof Date ? value : new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 后端可能给 null / 空串，图片地址统一在此兜底，避免 <img src=""> 触发一次无谓请求 */
export function imageOf(value: string | null | undefined, fallback = ''): string {
  const url = String(value ?? '').trim()
  return url || fallback
}
