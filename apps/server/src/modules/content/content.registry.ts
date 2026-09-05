import { BadRequestException } from '@nestjs/common';
import { normalizePairs, normalizeStrings, readJsonArray } from '../../common/utils/json.util';
import { sanitizeRichHtml, textOrNull } from '../../common/utils/html.util';
import { toBool, toDateOrNull, toOptInt } from '../../common/utils/pagination.util';

export type JsonKind = 'pairs' | 'tags' | 'raw';

export interface JsonFieldDef {
  name: string;
  kind: JsonKind;
}

/**
 * 内容资源描述：CRUD 工厂按此做字段白名单与类型规整，
 * 新增一类内容只需在此加一条定义，不必再复制一份 controller/service。
 */
export interface ResourceDef {
  /** URL 片段（products / news / timeline-events ...） */
  key: string;
  /** Prisma delegate 名 */
  delegate: string;
  label: string;
  /** 权限前缀，实际权限点为 `${perm}:view` 等 */
  perm: string;
  /** 审计 target */
  target: string;

  required: string[];
  strings: string[];
  richTexts?: string[];
  ints?: string[];
  /** ints 里哪些列在 schema 中可空（如 Review.rating）；未声明的非空 Int 列缺值时一律省略，由库默认值接管 */
  nullableInts?: string[];
  bools?: string[];
  dates?: string[];
  json?: JsonFieldDef[];

  /** 由该字段生成 slug */
  slugFrom?: string;
  hasSlug?: boolean;
  hasLegacyId?: boolean;
  hasCode?: boolean;
  /** 需校验存在的分类：字段名 -> Taxonomy.key */
  categoryOf?: { field: string; taxonomy: string };

  searchable: string[];
  sortable: string[];
  defaultOrder: OrderSpec;
  /** 前台列表排序 */
  publicOrder?: OrderSpec;
  /** 前台列表附加过滤：如仅取 isFeatured */
  publicWhere?: Record<string, any>;

  /** 后台表单字段顺序：与字段名共同决定渲染出的控件，admin 侧不再重复维护一份字段清单 */
  form: string[];
  /** 后台列表列字段（不含操作列） */
  columns: string[];
  /** 资源专属的字段标题覆盖，如产品的 name 叫「产品名称」 */
  labels?: Record<string, string>;
}

/**
 * 排序声明：写起来用 { a: 'asc', b: 'desc' } 最紧凑，
 * 但 Prisma 的 orderBy 不接受单对象多字段，所以 CONTENT_RESOURCES 定义完会统一展开成数组。
 */
export type OrderSpec = Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;

function expandOrder(spec: OrderSpec): Array<Record<string, 'asc' | 'desc'>> {
  if (Array.isArray(spec)) return spec;
  return Object.entries(spec).map(([field, dir]) => ({ [field]: dir }));
}

export const CONTENT_RESOURCES: ResourceDef[] = [
  {
    key: 'products',
    delegate: 'product',
    label: '产品',
    perm: 'content:product',
    target: 'content:product',
    required: ['name'],
    strings: [
      'name', 'nameEn', 'tag', 'tagline', 'summary', 'description', 'image',
      'spec', 'usage', 'shopUrl', 'seoTitle', 'seoKeywords', 'seoDescription',
    ],
    ints: ['sortOrder', 'status'],
    bools: ['isFeatured', 'isHot'],
    dates: ['publishedAt'],
    json: [
      { name: 'params', kind: 'pairs' },
      { name: 'certs', kind: 'tags' },
      { name: 'features', kind: 'tags' },
      { name: 'audiences', kind: 'tags' },
      { name: 'images', kind: 'tags' },
    ],
    slugFrom: 'name',
    hasSlug: true,
    hasLegacyId: true,
    categoryOf: { field: 'categorySlug', taxonomy: 'product_category' },
    labels: { name: '产品名称', tagline: '一句话卖点', summary: '产品简介' },
    form: [
      'name', 'slug', 'legacyId', 'categorySlug', 'nameEn', 'tag', 'tagline', 'summary',
      'image', 'images', 'spec', 'usage', 'params', 'features', 'audiences', 'certs', 'description',
      'shopUrl', 'isFeatured', 'isHot', 'sortOrder', 'status', 'publishedAt',
      'seoTitle', 'seoKeywords', 'seoDescription',
    ],
    columns: ['image', 'name', 'slug', 'categorySlug', 'isFeatured', 'isHot', 'sortOrder', 'status', 'updatedAt'],
    searchable: ['name', 'nameEn', 'tagline', 'summary'],
    sortable: ['sortOrder', 'createdAt', 'updatedAt', 'name', 'publishedAt'],
    defaultOrder: { sortOrder: 'asc', createdAt: 'desc' },
    publicOrder: { sortOrder: 'asc', createdAt: 'desc' },
  },
  {
    key: 'news',
    delegate: 'news',
    label: '新闻',
    perm: 'content:news',
    target: 'content:news',
    required: ['title'],
    strings: ['title', 'summary', 'author', 'source', 'cover', 'seoTitle', 'seoKeywords', 'seoDescription'],
    richTexts: ['bodyHtml'],
    ints: ['sortOrder', 'status', 'views'],
    bools: ['isTop'],
    dates: ['publishedAt'],
    json: [{ name: 'paragraphs', kind: 'tags' }],
    slugFrom: 'title',
    hasSlug: true,
    hasLegacyId: true,
    categoryOf: { field: 'categorySlug', taxonomy: 'news_category' },
    labels: { title: '新闻标题', summary: '摘要' },
    form: [
      'title', 'slug', 'legacyId', 'categorySlug', 'summary', 'cover', 'paragraphs', 'bodyHtml',
      'author', 'source', 'publishedAt', 'isTop', 'sortOrder', 'status',
      'seoTitle', 'seoKeywords', 'seoDescription',
    ],
    columns: ['cover', 'title', 'slug', 'categorySlug', 'author', 'publishedAt', 'isTop', 'sortOrder', 'status', 'views'],
    searchable: ['title', 'summary'],
    sortable: ['sortOrder', 'createdAt', 'publishedAt', 'views'],
    defaultOrder: { publishedAt: 'desc', sortOrder: 'asc' },
    publicOrder: { publishedAt: 'desc', sortOrder: 'asc' },
  },
  {
    key: 'videos',
    delegate: 'video',
    label: '视频',
    perm: 'content:video',
    target: 'content:video',
    required: ['title'],
    strings: ['title', 'duration', 'description', 'poster', 'url', 'categorySlug'],
    ints: ['sortOrder', 'status'],
    hasCode: true,
    labels: { description: '视频简介' },
    form: ['title', 'code', 'categorySlug', 'description', 'poster', 'url', 'duration', 'sortOrder', 'status'],
    columns: ['poster', 'title', 'code', 'duration', 'url', 'sortOrder', 'status', 'updatedAt'],
    searchable: ['title', 'description'],
    sortable: ['sortOrder', 'createdAt', 'title'],
    defaultOrder: { sortOrder: 'asc', createdAt: 'desc' },
    publicOrder: { sortOrder: 'asc' },
  },
  {
    key: 'reviews',
    delegate: 'review',
    label: '顾客口碑',
    perm: 'content:review',
    target: 'content:review',
    required: ['customerName', 'content'],
    strings: ['customerName', 'location', 'role', 'product', 'content', 'avatar'],
    ints: ['sortOrder', 'status', 'rating'],
    nullableInts: ['rating'],
    bools: ['isAuthorized'],
    hasCode: true,
    labels: { content: '评价内容' },
    form: ['customerName', 'code', 'role', 'location', 'product', 'content', 'avatar', 'rating', 'isAuthorized', 'sortOrder', 'status'],
    columns: ['avatar', 'customerName', 'role', 'location', 'product', 'rating', 'content', 'isAuthorized', 'sortOrder', 'status'],
    searchable: ['customerName', 'content', 'location', 'product'],
    sortable: ['sortOrder', 'createdAt', 'rating'],
    defaultOrder: { sortOrder: 'asc', createdAt: 'desc' },
    publicOrder: { sortOrder: 'asc' },
  },
  {
    key: 'honors',
    delegate: 'honor',
    label: '企业荣誉',
    perm: 'content:honor',
    target: 'content:honor',
    required: ['name'],
    strings: ['name', 'issuer', 'year', 'image', 'certNo'],
    ints: ['sortOrder', 'status'],
    hasCode: true,
    labels: { name: '荣誉名称' },
    form: ['name', 'code', 'issuer', 'year', 'image', 'certNo', 'sortOrder', 'status'],
    columns: ['image', 'name', 'issuer', 'year', 'certNo', 'sortOrder', 'status', 'updatedAt'],
    searchable: ['name', 'issuer'],
    sortable: ['sortOrder', 'createdAt', 'year'],
    defaultOrder: { sortOrder: 'asc', createdAt: 'desc' },
    publicOrder: { sortOrder: 'asc' },
  },
  {
    key: 'timeline-events',
    delegate: 'timelineEvent',
    label: '大事记',
    perm: 'content:timeline',
    target: 'content:timeline',
    required: ['year', 'content'],
    strings: ['year', 'eventDate', 'title', 'content'],
    ints: ['sortOrder', 'status'],
    hasCode: true,
    labels: { title: '事件标题', content: '事件说明' },
    form: ['year', 'eventDate', 'title', 'content', 'code', 'sortOrder', 'status'],
    columns: ['year', 'eventDate', 'title', 'content', 'sortOrder', 'status', 'updatedAt'],
    searchable: ['year', 'title', 'content'],
    sortable: ['sortOrder', 'createdAt', 'year'],
    defaultOrder: { sortOrder: 'asc', year: 'asc' },
    publicOrder: { year: 'asc', sortOrder: 'asc' },
  },
];

export function findResource(key: string): ResourceDef {
  const def = CONTENT_RESOURCES.find((r) => r.key === key);
  if (!def) throw new BadRequestException(`未知的内容资源：${key}`);
  return def;
}

// 模块加载即展开，后续所有 findMany 拿到的都是 Prisma 合法的 orderBy 数组
for (const def of CONTENT_RESOURCES) {
  def.defaultOrder = expandOrder(def.defaultOrder);
  if (def.publicOrder) def.publicOrder = expandOrder(def.publicOrder);
}

/** 入参 -> 落库对象：白名单裁剪 + 类型规整 + 富文本过滤 */
export function toData(def: ResourceDef, input: Record<string, any>, opts: { partial?: boolean } = {}) {
  const data: Record<string, any> = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(input, k);
  const skip = (f: string) => opts.partial && !has(f);

  for (const f of def.strings) {
    if (skip(f)) continue;
    const v = textOrNull(input[f]);
    if (def.required.includes(f) && !v) throw new BadRequestException(`${def.label}：字段 ${f} 不能为空`);
    data[f] = f === 'sortOrder' ? (v === null ? 0 : v) : v;
  }

  for (const f of def.richTexts ?? []) {
    if (skip(f)) continue;
    data[f] = sanitizeRichHtml(input[f]);
  }

  for (const f of def.ints ?? []) {
    if (skip(f)) continue;
    const v = toOptInt(input[f]);
    if (v !== undefined) {
      data[f] = v;
      continue;
    }
    // 拿不到合法整数时：只有声明为可空的列才写 null，其余一律省略，
    // 让库层 @default 生效（status 默认 1、views 默认 0）。给非空 Int 列写 null 会被 Prisma 直接拒绝。
    if (def.nullableInts?.includes(f)) data[f] = null;
    else if (f === 'sortOrder') data[f] = 0;
  }

  for (const f of def.bools ?? []) {
    if (skip(f)) continue;
    data[f] = toBool(input[f], false);
  }

  for (const f of def.dates ?? []) {
    if (skip(f) || input[f] === undefined) continue;
    data[f] = toDateOrNull(input[f]);
  }

  for (const j of def.json ?? []) {
    if (skip(j.name)) continue;
    data[j.name] = j.kind === 'pairs' ? normalizePairs(input[j.name]) : normalizeStrings(input[j.name]);
    if (readJsonArray(input[j.name]).length === 0 && input[j.name] === undefined) data[j.name] = undefined;
  }

  if (has('slug') && def.hasSlug) data.slug = textOrNull(input.slug);
  if (has('code') && def.hasCode) data.code = textOrNull(input.code);
  if (has('legacyId') && def.hasLegacyId) data.legacyId = textOrNull(input.legacyId);

  if (def.categoryOf && (has(def.categoryOf.field) || !opts.partial)) {
    const v = textOrNull(input[def.categoryOf.field]);
    if (!v) throw new BadRequestException(`${def.label}：请选择所属分类`);
    data[def.categoryOf.field] = v;
  }

  return data;
}

/** 列表/详情返回前统一把 Date 转 ISO 串、Json 空值转空数组 */
export function serializeRow(def: ResourceDef, row: any) {
  if (!row) return row;
  const out = { ...row };
  for (const f of [...(def.dates ?? []), 'createdAt', 'updatedAt']) {
    if (out[f] instanceof Date) out[f] = out[f].toISOString();
  }
  for (const j of def.json ?? []) {
    if (out[j.name] === null || out[j.name] === undefined) out[j.name] = [];
  }
  return out;
}

// ---------- 后台表单 / 列表列元数据 ----------

/** admin 侧根据 control 选组件，新增取值时后台会自动降级为文本框而不报错 */
export type FormControl =
  | 'text'
  | 'textarea'
  | 'number'
  | 'switch'
  | 'date'
  | 'datetime'
  | 'richtext'
  | 'image'
  | 'images'
  | 'url'
  | 'tags'
  | 'pairs'
  | 'category'
  | 'status'
  | 'rating';

export type FormGroup = 'base' | 'media' | 'detail' | 'seo' | 'sys';

export interface FormFieldMeta {
  name: string;
  label: string;
  control: FormControl;
  required: boolean;
  group: FormGroup;
  /** control=category 时给出术语组 key，admin 据此拉下拉项 */
  taxonomy?: string;
  placeholder?: string;
  tip?: string;
  /** 列表里的建议宽度 */
  width?: number;
}

interface FieldPreset {
  label: string;
  control?: FormControl;
  group?: FormGroup;
  placeholder?: string;
  tip?: string;
  width?: number;
}

/** 字段中文名与控件的唯一字典 */
const FIELD_META: Record<string, FieldPreset> = {
  name: { label: '名称' },
  title: { label: '标题' },
  nameEn: { label: '英文名称' },
  slug: { label: 'URL 标识', group: 'sys', tip: '前台地址用它，建议填拼音或英文；留空会生成随机标识', width: 170 },
  legacyId: { label: '旧站 ID', group: 'sys', tip: '用于旧链接重定向，确认后不要改', width: 130 },
  code: { label: '业务编码', group: 'sys', tip: '供初始化脚本定位，可留空', width: 140 },
  categorySlug: { label: '所属分类', width: 120 },
  tag: { label: '角标文案' },
  tagline: { label: '副标题' },
  summary: { label: '简介', control: 'textarea' },
  description: { label: '详细描述', control: 'textarea', group: 'detail' },
  content: { label: '内容', control: 'textarea', group: 'detail' },
  bodyHtml: { label: '正文', control: 'richtext', group: 'detail' },
  paragraphs: { label: '正文段落', control: 'tags', group: 'detail', tip: '每行一段，前台按段落渲染' },
  image: { label: '主图', control: 'image', width: 90 },
  images: { label: '图集', control: 'images', group: 'media' },
  cover: { label: '封面图', control: 'image', width: 90 },
  poster: { label: '封面图', control: 'image', width: 90 },
  avatar: { label: '头像', control: 'image', width: 90 },
  url: { label: '播放地址', control: 'url' },
  shopUrl: { label: '购买链接', control: 'url', group: 'detail' },
  params: { label: '参数', control: 'pairs', group: 'detail' },
  certs: { label: '资质认证', control: 'tags', group: 'detail' },
  features: { label: '产品特点', control: 'tags', group: 'detail' },
  audiences: { label: '适用人群', control: 'tags', group: 'detail' },
  spec: { label: '规格' },
  usage: { label: '食用方法', control: 'textarea', group: 'detail' },
  isFeatured: { label: '首页精选', control: 'switch', width: 96 },
  isHot: { label: '商城热销', control: 'switch', width: 96 },
  isTop: { label: '置顶', control: 'switch', width: 80 },
  isAuthorized: { label: '已获授权', control: 'switch', width: 96 },
  duration: { label: '时长', placeholder: '如 05:32 或 COMING SOON', width: 110 },
  customerName: { label: '客户姓名', width: 110 },
  location: { label: '所在地', width: 110 },
  role: { label: '身份', placeholder: '如 资深用户 / 经销商' },
  product: { label: '关联产品' },
  rating: { label: '评分', control: 'rating', width: 110 },
  issuer: { label: '颁发机构' },
  year: { label: '年份', width: 90 },
  eventDate: { label: '具体日期', width: 110 },
  certNo: { label: '证书编号' },
  author: { label: '作者', width: 110 },
  source: { label: '来源' },
  views: { label: '浏览量', control: 'number', group: 'sys', width: 90 },
  publishedAt: { label: '发布时间', control: 'date', width: 120 },
  sortOrder: { label: '排序', control: 'number', group: 'sys', tip: '数字越小越靠前', width: 80 },
  status: { label: '状态', control: 'status', group: 'sys', width: 100 },
  createdAt: { label: '创建时间', control: 'datetime', group: 'sys', width: 150 },
  updatedAt: { label: '更新时间', control: 'datetime', group: 'sys', width: 150 },
  seoTitle: { label: 'SEO 标题', group: 'seo' },
  seoKeywords: { label: 'SEO 关键词', control: 'textarea', group: 'seo' },
  seoDescription: { label: 'SEO 描述', control: 'textarea', group: 'seo' },
};

function jsonKind(def: ResourceDef, name: string): JsonKind | undefined {
  return def.json?.find((j) => j.name === name)?.kind;
}

/** 控件推断优先级：预设显式声明 > 结构字段（Json/富文本/布尔/整数/日期）> 分类 > 名称约定 */
function controlOf(def: ResourceDef, name: string): FormControl {
  const preset = FIELD_META[name]?.control;
  if (preset) return preset;
  const kind = jsonKind(def, name);
  if (kind === 'pairs') return 'pairs';
  if (kind === 'tags') return 'tags';
  if (kind === 'raw') return 'text';
  if (def.richTexts?.includes(name)) return 'richtext';
  if (def.bools?.includes(name)) return 'switch';
  if (def.dates?.includes(name)) return 'date';
  if (def.ints?.includes(name)) return 'number';
  if (def.categoryOf?.field === name) return 'category';
  if (/^(image|cover|poster|avatar|logo)$/i.test(name)) return 'image';
  if (/Url$/i.test(name)) return 'url';
  return 'text';
}

function groupOf(def: ResourceDef, name: string, control: FormControl): FormGroup {
  const preset = FIELD_META[name]?.group;
  if (preset) return preset;
  if (name.startsWith('seo')) return 'seo';
  if (control === 'image' || control === 'images') return 'media';
  if (name === 'sortOrder' || name === 'status') return 'sys';
  return 'base';
}

export function formFields(def: ResourceDef): FormFieldMeta[] {
  return def.form.map((name) => {
    const control = controlOf(def, name);
    return {
      name,
      label: def.labels?.[name] ?? FIELD_META[name]?.label ?? name,
      control,
      required: def.required.includes(name),
      group: groupOf(def, name, control),
      taxonomy: def.categoryOf?.field === name ? def.categoryOf.taxonomy : undefined,
      placeholder: FIELD_META[name]?.placeholder,
      tip: FIELD_META[name]?.tip,
    };
  });
}

export function listColumns(def: ResourceDef): FormFieldMeta[] {
  return def.columns.map((name) => {
    const control = controlOf(def, name);
    return {
      name,
      label: def.labels?.[name] ?? FIELD_META[name]?.label ?? name,
      control,
      required: false,
      group: groupOf(def, name, control),
      taxonomy: def.categoryOf?.field === name ? def.categoryOf.taxonomy : undefined,
      width: FIELD_META[name]?.width,
    };
  });
}

/** 交给后台一次性拿到全部资源的表单描述，避免前端写死字段 */
export function resourceSchemas() {
  return CONTENT_RESOURCES.map((def) => ({
    key: def.key,
    delegate: def.delegate,
    label: def.label,
    perm: def.perm,
    required: def.required,
    hasSlug: !!def.hasSlug,
    hasCode: !!def.hasCode,
    hasLegacyId: !!def.hasLegacyId,
    searchable: def.searchable,
    sortable: def.sortable,
    defaultOrder: def.defaultOrder,
    fields: formFields(def),
    columns: listColumns(def),
  }));
}
