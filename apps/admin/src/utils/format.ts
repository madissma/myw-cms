import dayjs from 'dayjs'

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '-'
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : '-'
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return '-'
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY-MM-DD') : '-'
}

/** 列表里的长文本截断，避免 Json 摘要把表格撑破 */
export function truncate(value: unknown, max = 60): string {
  const text = typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value)
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/*
 * 落库的时间是 ISO 串，而 el-date-picker 绑定了 value-format，
 * 传进来的字符串必须与 value-format 同构，否则回显为空。
 */
export function toDateInput(value?: string | Date | null): string {
  if (!value) return ''
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY-MM-DD') : ''
}

export function toDateTimeInput(value?: string | Date | null): string {
  if (!value) return ''
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY-MM-DDTHH:mm:ss') : ''
}
