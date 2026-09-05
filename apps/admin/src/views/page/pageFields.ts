import type { PageItem } from '@/api/modules/page'
import type { FieldSpec } from '@/utils/field'

/**
 * Page 的表单描述：页面列表与装修器共用一份，避免两处字段漂移。
 * key 创建后不可改（后端 UpdatePageDto 不接收），所以只在新增态出现。
 */
export function pageSpecs(mode: 'create' | 'edit'): FieldSpec[] {
  const specs: FieldSpec[] = []
  if (mode === 'create') {
    specs.push({
      name: 'key',
      label: '页面标识',
      control: 'text',
      required: true,
      tip: '与前台路由对应，小写字母数字与短横线，如 about',
    })
  }
  specs.push({ name: 'name', label: '页面名称', control: 'text', required: true })
  specs.push({ name: 'path', label: '前台路径', control: 'text', required: true, tip: '如 /about' })
  specs.push({ name: 'heroTitle', label: '页头标题', control: 'text' })
  specs.push({ name: 'heroEn', label: '页头英文', control: 'text' })
  specs.push({ name: 'heroSubtitle', label: '页头副标题', control: 'text', group: 'detail' })
  specs.push({ name: 'heroImage', label: '页头背景图', control: 'image', group: 'media' })
  specs.push({
    name: 'body',
    label: '页面正文',
    control: 'richtext',
    group: 'detail',
    tip: '少数页面（如企业简介）在区块之外还有一段总起正文',
  })
  specs.push({ name: 'status', label: '状态', control: 'status', group: 'sys' })
  specs.push({ name: 'seoTitle', label: 'SEO 标题', control: 'text', group: 'seo' })
  specs.push({ name: 'seoKeywords', label: 'SEO 关键词', control: 'textarea', group: 'seo' })
  specs.push({ name: 'seoDescription', label: 'SEO 描述', control: 'textarea', group: 'seo' })
  return specs
}

export function blankPageForm(): Record<string, any> {
  const out: Record<string, any> = {}
  for (const spec of pageSpecs('create')) out[spec.name] = spec.name === 'status' ? 1 : ''
  return out
}

export function pageFormOf(row: Partial<PageItem>): Record<string, any> {
  const out = blankPageForm()
  for (const spec of pageSpecs('edit')) {
    out[spec.name] = row[spec.name as keyof PageItem] ?? out[spec.name]
  }
  out.status = row.status ?? 1
  return out
}

/** 只提交后端允许改的字段，key 不在其中 */
export function pagePayloadOf(form: Record<string, any>, mode: 'create' | 'edit'): Partial<PageItem> {
  const out: Record<string, any> = {}
  for (const spec of pageSpecs(mode)) {
    const value = form[spec.name]
    if (spec.name === 'status') out.status = Number(value ?? 1)
    else if (spec.name === 'body') out.body = String(value ?? '')
    else out[spec.name] = String(value ?? '').trim()
  }
  if (mode === 'edit') {
    // 更新接口对空串按「清空」处理，但 path 清空会让前台找不到页，这里兜一层
    if (!out.path) out.path = form.path
  }
  return out as Partial<PageItem>
}
