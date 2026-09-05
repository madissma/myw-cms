import { download, http } from '../request'
import type { ListQuery, PageResult } from '@/types/api'

export interface MessageItem {
  id: string
  name: string
  phone: string
  email: string | null
  type: string | null
  content: string
  status: number
  reply: string | null
  ip: string | null
  userAgent: string | null
  handlerId: string | null
  createdAt: string
  updatedAt: string | null
  statusLabel?: string
}

/** 与 server 的 MESSAGE_STATUS 对齐 */
export const MESSAGE_STATUS_OPTIONS = [
  { value: 0, label: '未处理', tag: 'danger' },
  { value: 1, label: '处理中', tag: 'warning' },
  { value: 2, label: '已回复', tag: 'success' },
  { value: 3, label: '已关闭', tag: 'info' },
] as const

export function messageStatusMeta(status: number) {
  return MESSAGE_STATUS_OPTIONS.find((s) => s.value === status) ?? { value: status, label: '未知', tag: 'info' }
}

/** 前台留言表单是自由文本，这里给常用值供筛选与快捷填写 */
export const MESSAGE_TYPES = ['产品咨询', '经销合作', '原料采购', 'OEM代工合作']

export function listMessages(
  query: ListQuery & { type?: string; handlerId?: string } = {},
): Promise<PageResult<MessageItem>> {
  return http.get<PageResult<MessageItem>>('/admin/messages', query as Record<string, unknown>)
}

/** 形如 { total, 0, 1, 2, 3 } */
export function messageCounters(): Promise<Record<string, number>> {
  return http.get<Record<string, number>>('/admin/messages/counters')
}

export function getMessage(id: string): Promise<MessageItem> {
  return http.get<MessageItem>(`/admin/messages/${id}`)
}

export function setMessageStatus(id: string, status: number): Promise<MessageItem> {
  return http.patch<MessageItem>(`/admin/messages/${id}/status`, { status })
}

export function assignMessage(id: string, handlerId?: string): Promise<MessageItem> {
  return http.patch<MessageItem>(`/admin/messages/${id}/assign`, { handlerId })
}

export function replyMessage(id: string, reply: string, status?: number): Promise<MessageItem> {
  return http.post<MessageItem>(`/admin/messages/${id}/reply`, { reply, status })
}

export function deleteMessage(id: string): Promise<{ deleted: number }> {
  return http.delete<{ deleted: number }>(`/admin/messages/${id}`)
}

export function bulkDeleteMessages(ids: string[]): Promise<{ deleted: number }> {
  return http.post<{ deleted: number }>('/admin/messages/bulk-delete', { ids })
}

/** 导出沿用当前筛选条件 */
export function exportMessages(query: ListQuery & { type?: string } = {}): Promise<void> {
  return download('/admin/messages/export', query as Record<string, unknown>, 'messages.csv')
}
