import { postJson } from './http'
import type { MessagePayload, MessageResult } from './types'

/**
 * 提交在线留言。同 IP 60 秒一次（后端 RateLimit），失败必须让表单显示出来，因此不做回落。
 */
export function submitMessage(payload: MessagePayload) {
  return postJson<MessageResult>('/public/messages', payload)
}
