import { BadRequestException } from '@nestjs/common';

/**
 * 区块类型登记表。
 * admin 的 BlockEditorDrawer 按 fields 动态渲染表单，app 的区块组件按同名 props 取值，
 * 三端只有这一份约定，新增区块类型时在此加一条即可。
 */
export type FieldKind =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'image'
  | 'url'
  | 'color'
  | 'number'
  | 'boolean'
  | 'select'
  | 'pairs'
  | 'tags'
  | 'items';

export interface BlockFieldDef {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  /** select 候选值 */
  options?: string[];
  /** items 的子字段 */
  itemFields?: BlockFieldDef[];
  /** items 的中文简称，如「轮播项」「统计项」 */
  itemLabel?: string;
  max?: number;
  hint?: string;
}

export interface BlockTypeDef {
  type: string;
  label: string;
  /** 该区块是否为「引用实体集合」型，需要 source + query */
  entityDriven?: boolean;
  /** 是否暴露 columns */
  hasColumns?: boolean;
  fields: BlockFieldDef[];
}

const ITEM_IMAGE: BlockFieldDef = { name: 'image', label: '图片', kind: 'image' };
const ITEM_URL: BlockFieldDef = { name: 'url', label: '链接', kind: 'url' };
const ITEM_TITLE: BlockFieldDef = { name: 'title', label: '标题', kind: 'text', required: true };
const ITEM_SUBTITLE: BlockFieldDef = { name: 'subtitle', label: '副标题', kind: 'text' };
const ITEM_DESC: BlockFieldDef = { name: 'description', label: '描述', kind: 'textarea' };
const ITEM_EN: BlockFieldDef = { name: 'en', label: '英文/装饰文字', kind: 'text' };

export const BLOCK_TYPES: BlockTypeDef[] = [
  {
    type: 'hero_slider',
    label: '首屏轮播',
    hasColumns: false,
    fields: [
      {
        name: 'slides',
        label: '轮播项',
        kind: 'items',
        itemLabel: '轮播',
        required: true,
        itemFields: [
          { name: 'eyebrow', label: '眉标', kind: 'text' },
          ITEM_TITLE,
          { name: 'text', label: '正文', kind: 'textarea' },
          { name: 'primary', label: '主按钮文案', kind: 'text' },
          { name: 'primaryUrl', label: '主按钮链接', kind: 'url' },
          { name: 'secondary', label: '次按钮文案', kind: 'text' },
          { name: 'secondaryUrl', label: '次按钮链接', kind: 'url' },
          ITEM_IMAGE,
        ],
      },
      { name: 'interval', label: '自动轮播间隔(ms)', kind: 'number' },
    ],
  },
  {
    type: 'stat_grid',
    label: '数据统计格',
    hasColumns: true,
    fields: [
      {
        name: 'items',
        label: '统计项',
        kind: 'items',
        itemLabel: '统计',
        required: true,
        itemFields: [
          { name: 'value', label: '数值', kind: 'text', required: true },
          { name: 'label', label: '标签', kind: 'text', required: true },
          ITEM_DESC,
        ],
      },
    ],
  },
  {
    type: 'card_grid',
    label: '卡片网格',
    hasColumns: true,
    fields: [
      {
        name: 'items',
        label: '卡片',
        kind: 'items',
        itemLabel: '卡片',
        required: true,
        itemFields: [
          { name: 'icon', label: '图标名(lucide)', kind: 'text' },
          ITEM_TITLE,
          ITEM_SUBTITLE,
          ITEM_DESC,
          ITEM_IMAGE,
          ITEM_URL,
          { name: 'points', label: '要点', kind: 'tags' },
        ],
      },
    ],
  },
  {
    type: 'culture_grid',
    label: '文化理念卡',
    hasColumns: true,
    fields: [
      {
        name: 'items',
        label: '理念字',
        kind: 'items',
        itemLabel: '理念',
        required: true,
        itemFields: [
          { name: 'char', label: '单字', kind: 'text', required: true },
          { name: 'title', label: '标题', kind: 'text', required: true },
          ITEM_DESC,
        ],
      },
    ],
  },
  {
    type: 'numbered_list',
    label: '序号流程表',
    hasColumns: true,
    fields: [
      {
        name: 'items',
        label: '步骤',
        kind: 'items',
        itemLabel: '步骤',
        required: true,
        itemFields: [
          { name: 'step', label: '序号', kind: 'text' },
          ITEM_TITLE,
          ITEM_DESC,
          { name: 'note', label: '备注', kind: 'text' },
        ],
      },
    ],
  },
  {
    type: 'research_list',
    label: '科研合作列表',
    hasColumns: true,
    fields: [
      {
        name: 'items',
        label: '条目',
        kind: 'items',
        itemLabel: '条目',
        required: true,
        itemFields: [
          ITEM_TITLE,
          { name: 'partner', label: '合作单位', kind: 'text' },
          ITEM_DESC,
          { name: 'date', label: '时间', kind: 'text' },
          { name: 'tag', label: '标签', kind: 'text' },
        ],
      },
    ],
  },
  {
    type: 'gallery',
    label: '图片集',
    hasColumns: true,
    fields: [
      {
        name: 'items',
        label: '图片',
        kind: 'items',
        itemLabel: '图片',
        required: true,
        itemFields: [ITEM_IMAGE, { name: 'caption', label: '图注', kind: 'text' }, { name: 'title', label: '标题', kind: 'text' }],
      },
    ],
  },
  {
    type: 'image_text',
    label: '图文段',
    fields: [
      { name: 'image', label: '图片', kind: 'image' },
      { name: 'imageSide', label: '图片位置', kind: 'select', options: ['left', 'right'] },
      { name: 'eyebrow', label: '眉标', kind: 'text' },
      { name: 'paragraphs', label: '正文段落', kind: 'tags' },
      { name: 'points', label: '要点', kind: 'tags' },
      { name: 'buttonText', label: '按钮文案', kind: 'text' },
      { name: 'buttonUrl', label: '按钮链接', kind: 'url' },
    ],
  },
  {
    type: 'image_split',
    label: '左图右文分栏',
    fields: [
      { name: 'image', label: '图片', kind: 'image' },
      { name: 'imageSide', label: '图片位置', kind: 'select', options: ['left', 'right'] },
      { name: 'eyebrow', label: '眉标', kind: 'text' },
      { name: 'title', label: '标题', kind: 'text' },
      { name: 'text', label: '正文', kind: 'textarea' },
      { name: 'points', label: '要点', kind: 'tags' },
      { name: 'stats', label: '数据格', kind: 'pairs' },
      { name: 'buttonText', label: '按钮文案', kind: 'text' },
      { name: 'buttonUrl', label: '按钮链接', kind: 'url' },
    ],
  },
  {
    type: 'richtext',
    label: '富文本',
    fields: [
      { name: 'html', label: '内容', kind: 'richtext', hint: '与下方纯文本段落二选一，前台优先取富文本' },
      { name: 'paragraphs', label: '正文段落', kind: 'tags' },
    ],
  },
  {
    type: 'quote',
    label: '引言/语录',
    fields: [
      { name: 'text', label: '引文', kind: 'textarea', required: true },
      { name: 'author', label: '署名', kind: 'text' },
      { name: 'role', label: '身份', kind: 'text' },
      { name: 'image', label: '头像/配图', kind: 'image' },
      { name: 'buttonText', label: '按钮文案', kind: 'text' },
      { name: 'buttonUrl', label: '按钮链接', kind: 'url' },
    ],
  },
  {
    type: 'cta_band',
    label: '引导条',
    fields: [
      { name: 'eyebrow', label: '眉标', kind: 'text' },
      { name: 'title', label: '标题', kind: 'text', hint: '仅放按钮时可留空' },
      { name: 'text', label: '说明', kind: 'textarea' },
      { name: 'buttonText', label: '按钮文案', kind: 'text' },
      { name: 'buttonUrl', label: '按钮链接', kind: 'url' },
      { name: 'secondaryText', label: '次按钮文案', kind: 'text' },
      { name: 'secondaryUrl', label: '次按钮链接', kind: 'url' },
      { name: 'image', label: '背景图', kind: 'image' },
    ],
  },
  {
    type: 'tag_cloud',
    label: '标签云',
    fields: [
      { name: 'items', label: '标签', kind: 'tags', required: true },
      { name: 'baseUrl', label: '点击前缀(如 /products#)', kind: 'url' },
    ],
  },
  {
    type: 'feature_list',
    label: '要点列表',
    hasColumns: true,
    fields: [
      {
        name: 'items',
        label: '要点',
        kind: 'items',
        itemLabel: '要点',
        required: true,
        itemFields: [
          { name: 'icon', label: '图标名(lucide)', kind: 'text' },
          ITEM_TITLE,
          ITEM_DESC,
          { name: 'valueKey', label: '取值配置键', kind: 'text', hint: '填写 Setting key（如 contact.address）时优先取配置值覆盖描述' },
        ],
      },
    ],
  },
  {
    type: 'map_sketch',
    label: '区位示意图',
    fields: [
      { name: 'image', label: '底图', kind: 'image' },
      { name: 'marker', label: '中心标注', kind: 'text' },
      {
        name: 'labels',
        label: '标注',
        kind: 'items',
        itemLabel: '标注',
        itemFields: [
          { name: 'text', label: '文字', kind: 'text', required: true },
          { name: 'x', label: '横向位置(%)', kind: 'number' },
          { name: 'y', label: '纵向位置(%)', kind: 'number' },
          { name: 'variant', label: '样式', kind: 'select', options: ['default', 'gold', 'forest'] },
        ],
      },
      { name: 'notes', label: '图下说明', kind: 'tags' },
    ],
  },
  {
    type: 'contact_form',
    label: '在线留言表单',
    fields: [
      { name: 'title', label: '表单标题', kind: 'text' },
      { name: 'text', label: '表单说明', kind: 'textarea' },
      { name: 'nameLabel', label: '姓名字段名', kind: 'text' },
      { name: 'namePlaceholder', label: '姓名占位', kind: 'text' },
      { name: 'phoneLabel', label: '电话字段名', kind: 'text' },
      { name: 'phonePlaceholder', label: '电话占位', kind: 'text' },
      { name: 'emailLabel', label: '邮箱字段名', kind: 'text' },
      { name: 'emailPlaceholder', label: '邮箱占位', kind: 'text' },
      { name: 'contentLabel', label: '内容字段名', kind: 'text' },
      { name: 'contentPlaceholder', label: '内容占位', kind: 'textarea' },
      { name: 'typeOptions', label: '留言类型候选', kind: 'tags' },
      { name: 'showTypeSelect', label: '显示类型下拉', kind: 'boolean', hint: '关闭时仅占位文案里出现类型，与现网表单一致' },
      { name: 'typeLabel', label: '类型字段名', kind: 'text', hint: '留空默认「咨询类型」' },
      { name: 'submitText', label: '提交按钮文案', kind: 'text' },
      { name: 'successTitle', label: '成功态标题', kind: 'text' },
      { name: 'successTip', label: '成功态说明', kind: 'textarea' },
      { name: 'successHotline', label: '成功态热线提示', kind: 'text', hint: '按 phoneKey 追加 Setting 中的号码' },
      { name: 'phoneKey', label: '热线取值键', kind: 'text', hint: '默认 contact.consumerHotline' },
      { name: 'againText', label: '再写一条文案', kind: 'text' },
    ],
  },
  {
    type: 'entity_list',
    label: '实体集合（引用）',
    entityDriven: true,
    hasColumns: true,
    fields: [
      { name: 'title', label: '区块标题', kind: 'text' },
      { name: 'showImage', label: '显示图片', kind: 'boolean' },
      { name: 'itemAction', label: '卡片动作文案', kind: 'text', hint: '如「进入店铺」，显示在每张卡片上' },
      { name: 'buttonText', label: '「更多」按钮文案', kind: 'text' },
      { name: 'buttonUrl', label: '「更多」按钮链接', kind: 'url' },
    ],
  },
];

const TYPE_INDEX = new Map(BLOCK_TYPES.map((t) => [t.type, t]));

export function blockDef(type: string): BlockTypeDef | undefined {
  return TYPE_INDEX.get(type);
}

export function assertBlockType(type: string): BlockTypeDef {
  const def = TYPE_INDEX.get(type);
  if (!def) throw new BadRequestException(`未知的区块类型：${type}`);
  return def;
}

export const BLOCK_TYPE_OPTIONS = BLOCK_TYPES.map((t) => ({ type: t.type, label: t.label, entityDriven: !!t.entityDriven }));

/** entity_list 可引用的实体源 */
export const ENTITY_SOURCES = [
  { value: 'product', label: '产品' },
  { value: 'news', label: '新闻' },
  { value: 'review', label: '顾客口碑' },
  { value: 'honor', label: '荣誉' },
  { value: 'timeline', label: '大事记' },
  { value: 'video', label: '视频' },
  { value: 'term', label: '分类术语（渠道/标签等）' },
];

const ENTITY_DELEGATE: Record<string, string> = {
  product: 'product',
  news: 'news',
  review: 'review',
  honor: 'honor',
  timeline: 'timelineEvent',
  video: 'video',
  term: 'term',
};

export function entityDelegate(source: string): string | undefined {
  return ENTITY_DELEGATE[source];
}

/** 供 admin 拉取全部区块类型定义 */
export function blockSchemas() {
  return BLOCK_TYPES;
}
