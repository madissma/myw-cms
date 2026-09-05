/** 统一状态字典：0=草稿/禁用 1=已发布/启用 2=下架 */
export const Status = {
  DRAFT: 0,
  PUBLISHED: 1,
  OFFLINE: 2,
} as const;

export type StatusValue = (typeof Status)[keyof typeof Status];

export const STATUS_LABELS: Record<number, string> = {
  0: '草稿/禁用',
  1: '已发布/启用',
  2: '已下架',
};

/** 留言处理状态 */
export const MessageStatus = {
  PENDING: 0,
  PROCESSING: 1,
  REPLIED: 2,
  CLOSED: 3,
} as const;

export const MESSAGE_STATUS_LABELS: Record<number, string> = {
  0: '未处理',
  1: '处理中',
  2: '已回复',
  3: '已关闭',
};
