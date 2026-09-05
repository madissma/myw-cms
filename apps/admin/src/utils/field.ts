import type { ContentField } from '@/api/modules/content'
import type { BlockFieldDef } from '@/api/modules/page'
import type { SettingItem } from '@/api/modules/site'

export interface FieldOption {
  label: string
  value: string | number
}

/** 产品 params 这类 label/value 结构，服务端 normalizePairs 同形 */
export interface PairRow {
  label: string
  value: string
}

/**
 * 表单字段的统一描述：内容表（content.registry）与站点配置（Setting.type）
 * 两套来源都归一到这个结构，FormField.vue 只需认 control。
 * control 用宽松字符串，遇到后端新增的未知取值时降级为文本框而不是白屏。
 */
export interface FieldSpec {
  name: string
  label: string
  control: string
  required?: boolean
  placeholder?: string
  tip?: string
  options?: FieldOption[]
  /** control=category 时的术语组 key */
  taxonomy?: string
  /** 表单分组，对应 GROUP_TITLES */
  group?: string
  rows?: number
}

/** 值为字符串数组、但内容是一段话而非标签的字段 */
const LINES_FIELDS = new Set(['paragraphs'])

/** 表单分组标题，顺序即渲染顺序 */
export const GROUP_TITLES: Record<string, string> = {
  base: '基本信息',
  media: '图片与素材',
  detail: '详细内容',
  seo: 'SEO 设置',
  sys: '发布与排序',
  // 站点配置的分组：SettingForm 一次渲染多个分组时按此顺序与标题分节
  brand: '品牌标识',
  site: '站点属性',
  contact: '联系方式',
  footer: '页脚与备案',
  social: '社交账号',
  analytics: '统计代码',
  form: '留言表单',
  ui: '前台组件文案',
}

const SETTING_CONTROL: Record<string, string> = {
  text: 'text',
  textarea: 'textarea',
  number: 'number',
  boolean: 'switch',
  color: 'color',
  image: 'image',
  url: 'url',
  email: 'text',
  select: 'select',
  tags: 'tags',
  pairs: 'pairs',
  json: 'json',
  richtext: 'richtext',
  date: 'date',
}

export function contentFieldSpec(field: ContentField): FieldSpec {
  return {
    name: field.name,
    label: field.label,
    // 后端把 paragraphs 也描述成 tags，但段落是长文本，改走 TagListEditor 的竖排形态
    control: field.control === 'tags' && LINES_FIELDS.has(field.name) ? 'lines' : field.control,
    required: field.required,
    placeholder: field.placeholder,
    tip: field.tip,
    taxonomy: field.taxonomy,
    group: field.group,
  }
}

/** Setting.type -> 控件，未知类型降级为文本框而不是白屏 */
export function settingControl(type: string): string {
  return SETTING_CONTROL[type] ?? 'text'
}

export function settingFieldSpec(item: SettingItem): FieldSpec {
  return {
    name: item.key,
    label: item.label,
    control: settingControl(item.type),
    placeholder: undefined,
    tip: item.remark ?? undefined,
    options: (item.options ?? []).map((o) => ({ label: o.label, value: o.value })),
    group: item.group,
  }
}

/** 可以半宽排布的控件，其余（长文本 / 图片 / 列表类）占满整行 */
const COMPACT_CONTROLS = new Set(['text', 'number', 'date', 'datetime', 'switch', 'status', 'select', 'rating', 'color', 'url'])

export function isCompactControl(control: string): boolean {
  return COMPACT_CONTROLS.has(control)
}

/** 区块 props 的 kind 到控件名（items 由 BlockFieldControl 自己展开递归） */
const BLOCK_KIND_CONTROL: Record<string, string> = {
  text: 'text',
  textarea: 'textarea',
  richtext: 'richtext',
  image: 'image',
  url: 'url',
  color: 'color',
  number: 'number',
  boolean: 'switch',
  select: 'select',
  pairs: 'pairs',
  tags: 'tags',
}

export function blockFieldSpec(field: BlockFieldDef): FieldSpec {
  const control = BLOCK_KIND_CONTROL[field.kind] ?? 'text'
  return {
    name: field.name,
    label: field.label,
    control: control === 'tags' && LINES_FIELDS.has(field.name) ? 'lines' : control,
    required: field.required,
    tip: field.hint,
    options: (field.options ?? []).map((value) => ({ label: value, value })),
  }
}

/** 长文本字段用多行输入，其余单行 */
export function isLongText(spec: FieldSpec): boolean {
  return ['summary', 'description', 'content', 'usage', 'seoDescription', 'remark'].some((hint) => spec.name.includes(hint))
}

/**
 * 按字段描述生成空白表单值：DynamicForm 直接往这个对象上写，
 * 所以必须先把每个字段都占好位，否则 v-model 新增属性不会触发更新。
 */
export function blankForm(specs: FieldSpec[]): Record<string, any> {
  const out: Record<string, any> = {}
  for (const spec of specs) {
    if (spec.control === 'switch') out[spec.name] = true
    else if (spec.control === 'status') out[spec.name] = 1
    else if (['number', 'rating'].includes(spec.control)) out[spec.name] = null
    else if (['tags', 'lines', 'pairs', 'images'].includes(spec.control)) out[spec.name] = []
    else out[spec.name] = ''
  }
  return out
}
