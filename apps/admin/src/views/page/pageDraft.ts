import type { BlockNode, PageDetail, SectionNode } from '@/api/modules/page'

/**
 * 设计器的本地草稿结构。
 * 与后端模型的差异只有两点：字符串字段统一为 ''（便于 v-model），
 * 以及用 key 代替「尚未落库时没有的 id」。整页保存时按数组下标重写 sortOrder。
 */
export interface DraftBlock {
  key: string
  id?: string
  code: string
  type: string
  title: string
  props: Record<string, any>
  source: string | null
  query: Record<string, any> | null
  columns: number | null
  theme: Record<string, any> | null
  status: number
}

export interface DraftSection {
  key: string
  id?: string
  anchor: string
  label: string
  eyebrow: string
  title: string
  subtitle: string
  variant: string
  showInSubNav: boolean
  status: number
  blocks: DraftBlock[]
}

let seq = 0

/** 本地行标识：新增的行还没有主键，用它定位与做 v-for key */
export function draftKey(prefix: string): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq}`
}

export function blockDraftOf(block: BlockNode): DraftBlock {
  return {
    key: draftKey('b'),
    id: block.id,
    code: block.code ?? '',
    type: block.type ?? 'card_grid',
    title: block.title ?? '',
    props: { ...(block.props ?? {}) },
    source: block.source ?? null,
    query: block.query ? { ...block.query } : null,
    columns: block.columns ?? null,
    theme: block.theme ? { ...block.theme } : null,
    status: block.status ?? 1,
  }
}

export function sectionDraftOf(section: SectionNode): DraftSection {
  return {
    key: draftKey('s'),
    id: section.id,
    anchor: section.anchor ?? '',
    label: section.label ?? '',
    eyebrow: section.eyebrow ?? '',
    title: section.title ?? '',
    subtitle: section.subtitle ?? '',
    variant: section.variant ?? '',
    showInSubNav: section.showInSubNav !== false,
    status: section.status ?? 1,
    blocks: (section.blocks ?? []).map(blockDraftOf),
  }
}

export function draftsOf(detail: PageDetail): DraftSection[] {
  return (detail.sections ?? []).map(sectionDraftOf)
}

/** 新区块的初始值：type 取登记表首项，props 留空由抽屉里的表单填 */
export function blankBlock(type = 'card_grid'): DraftBlock {
  return {
    key: draftKey('b'),
    code: '',
    type,
    title: '',
    props: {},
    source: null,
    query: null,
    columns: null,
    theme: null,
    status: 1,
  }
}

export function blankSection(): DraftSection {
  return {
    key: draftKey('s'),
    anchor: '',
    label: '',
    eyebrow: '',
    title: '',
    subtitle: '',
    variant: '',
    showInSubNav: true,
    status: 1,
    blocks: [],
  }
}

/** 交给 BlockEditorDrawer 的是后端模型形状，抽屉不认草稿结构 */
export function blockNodeOf(draft: DraftBlock, sectionId: string): BlockNode {
  return {
    id: draft.id ?? '',
    sectionId,
    code: draft.code,
    type: draft.type,
    title: draft.title,
    props: { ...draft.props },
    source: draft.source,
    query: draft.query ? { ...draft.query } : null,
    columns: draft.columns,
    theme: draft.theme ? { ...draft.theme } : null,
    sortOrder: 0,
    status: draft.status,
  }
}

export function applyBlockDraft(draft: DraftBlock, payload: Partial<BlockNode>): void {
  if (payload.id) draft.id = payload.id
  draft.code = String(payload.code ?? draft.code)
  draft.type = String(payload.type ?? draft.type)
  draft.title = String(payload.title ?? '')
  draft.props = { ...(payload.props ?? {}) }
  draft.source = payload.source ?? null
  draft.query = payload.query ?? null
  draft.columns = payload.columns ?? null
  draft.theme = payload.theme ?? null
  draft.status = payload.status ?? draft.status
}

/**
 * 序列化成保存 payload，同时充当脏检查的快照源。
 * 不含本地 key 与 id：后端按 anchor / code 匹配，这两个字段改了也不算内容变化。
 */
export function sectionsPayload(sections: DraftSection[]): Record<string, any>[] {
  return sections.map((section, sIndex) => ({
    anchor: section.anchor.trim(),
    label: section.label.trim(),
    eyebrow: section.eyebrow.trim(),
    title: section.title.trim(),
    subtitle: section.subtitle.trim(),
    variant: section.variant,
    showInSubNav: section.showInSubNav,
    sortOrder: (sIndex + 1) * 10,
    status: section.status,
    blocks: section.blocks.map((block, bIndex) => ({
      code: block.code.trim(),
      type: block.type,
      title: block.title.trim(),
      props: block.props ?? {},
      source: block.source,
      query: block.query,
      columns: block.columns,
      theme: block.theme,
      sortOrder: (bIndex + 1) * 10,
      status: block.status,
    })),
  }))
}

/**
 * 保存前的本地校验：锚点与编码是后端匹配身份的唯一依据，
 * 重复会直接撞上 @@unique 约束，报错信息对运营不友好，所以先在本地拦住。
 */
export function validateSections(sections: DraftSection[]): string | null {
  const anchors = new Set<string>()
  for (const section of sections) {
    const anchor = section.anchor.trim()
    if (!anchor) return '存在未填写锚点的区块组'
    if (!section.label.trim()) return `区块组 ${anchor} 缺少名称`
    if (anchors.has(anchor)) return `锚点 ${anchor} 重复，锚点在页面内必须唯一`
    anchors.add(anchor)

    const codes = new Set<string>()
    for (const block of section.blocks) {
      const code = block.code.trim()
      if (!code) return `区块组 ${anchor} 内存在未填写编码的区块`
      if (!block.type) return `区块 ${anchor}/${code} 未选择类型`
      if (codes.has(code)) return `区块组 ${anchor} 内编码 ${code} 重复`
      codes.add(code)
    }
  }
  return null
}

/** 复制一份可比较的快照（保存 payload 已不含本地字段，直接用它的字符串形式） */
export function snapshot(sections: DraftSection[]): string {
  return JSON.stringify(sectionsPayload(sections))
}

/**
 * 快照的反向操作：「放弃修改」时把 baseline 还原成草稿。
 * 后端按 anchor / code 匹配，不依赖 id，因此还原后丢掉主键不影响保存。
 */
export function sectionsFromPayload(payload: Record<string, any>[]): DraftSection[] {
  return (payload ?? []).map((raw) => ({
    key: draftKey('s'),
    anchor: String(raw?.anchor ?? ''),
    label: String(raw?.label ?? ''),
    eyebrow: String(raw?.eyebrow ?? ''),
    title: String(raw?.title ?? ''),
    subtitle: String(raw?.subtitle ?? ''),
    variant: String(raw?.variant ?? ''),
    showInSubNav: raw?.showInSubNav !== false,
    status: Number(raw?.status ?? 1),
    blocks: (Array.isArray(raw?.blocks) ? raw.blocks : []).map((block: Record<string, any>) => ({
      key: draftKey('b'),
      code: String(block?.code ?? ''),
      type: String(block?.type ?? 'card_grid'),
      title: String(block?.title ?? ''),
      props: { ...(block?.props ?? {}) },
      source: block?.source ?? null,
      query: block?.query ?? null,
      columns: block?.columns ?? null,
      theme: block?.theme ?? null,
      status: Number(block?.status ?? 1),
    })),
  }))
}
