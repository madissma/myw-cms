/**
 * D 类内容：站点属性、主题、语言、分类术语、页面清单与各类稳定编码。
 *
 * Setting 的键值真源在 src/common/constants/settings.ts（前台 bootstrap 与 seed 共用），
 * 本文件只放「不属于 Setting 的模型基线」。
 *
 * 品牌色取自 apps/app/tailwind.config.js L13-16（12 个 hex），字体取自 apps/app/src/index.css L45-53，
 * 圆角取自 apps/app/src/index.css L26（--radius: 0rem）。
 */

import type { CopyCode } from './copy'

// ==================== 主题 ====================

export interface ThemeSeed {
  code: string
  name: string
  isDefault: boolean
  active: boolean
  remark: string
  tokens: {
    color: Record<string, string>
    font: Record<string, string>
    radius: string
  }
}

/** 当前现网配色，token 与 apps/app/tailwind.config.js 逐项对应 */
export const THEMES: ThemeSeed[] = [
  {
    code: 'forest-gold',
    name: '林金（默认）',
    isDefault: true,
    active: true,
    remark: '现网配色：森绿 + 鎏金 + 米白，取自 apps/app/tailwind.config.js',
    tokens: {
      color: {
        cream: '#F5F2E7',
        creamDeep: '#ECE7D6',
        creamDark: '#E3DCC6',
        forest: '#0B3D20',
        forestDeep: '#072B16',
        forestLight: '#1C5A37',
        forestMist: '#3F7A56',
        gold: '#B6913B',
        goldLight: '#D3B96A',
        goldPale: '#EBDDAF',
        ink: '#20241F',
        inkSoft: '#4A5248',
      },
      font: {
        serif: '"Noto Serif SC", "Songti SC", SimSun, serif',
        sans: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
        latin: '"Cormorant Garamond", "Noto Serif SC", serif',
      },
      radius: '0rem',
    },
  },
  {
    code: 'ink-blue',
    name: '墨青（备用）',
    isDefault: false,
    active: false,
    remark: '备用配色，用于验证「后台改色前台即时生效」，未上线',
    tokens: {
      color: {
        cream: '#F3F4F6',
        creamDeep: '#E7E9EE',
        creamDark: '#D9DDE4',
        forest: '#12314F',
        forestDeep: '#0A1F33',
        forestLight: '#26557C',
        forestMist: '#4A7CA6',
        gold: '#B08D57',
        goldLight: '#CBAE7E',
        goldPale: '#E7D9BC',
        ink: '#1B222C',
        inkSoft: '#46505E',
      },
      font: {
        serif: '"Noto Serif SC", "Songti SC", SimSun, serif',
        sans: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
        latin: '"Cormorant Garamond", "Noto Serif SC", serif',
      },
      radius: '0rem',
    },
  },
  {
    code: 'crimson-gold',
    name: '朱金（#B02727）',
    isDefault: false,
    active: false,
    remark:
      '以 #B02727 为 forest 推导的暖色系：深红做暗底、米白偏暖、墨色带红调。金色刻意提亮——前台 CTA 与导航 logo 徽标是「金底红字」，金色压暗红字就会糊。',
    tokens: {
      color: {
        cream: '#F9F5F1',
        creamDeep: '#F0E8E0',
        creamDark: '#E4D6CD',
        forest: '#B02727',
        forestDeep: '#671419',
        forestLight: '#BE4037',
        forestMist: '#BC6B62',
        gold: '#D6A651',
        goldLight: '#E0B767',
        goldPale: '#EFE0BE',
        ink: '#241E1E',
        inkSoft: '#534646',
      },
      font: {
        serif: '"Noto Serif SC", "Songti SC", SimSun, serif',
        sans: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
        latin: '"Cormorant Garamond", "Noto Serif SC", serif',
      },
      radius: '0rem',
    },
  },
]

// ==================== 语言 ====================

export const LOCALES = [
  { code: 'zh-CN', name: '简体中文', nativeName: '简体中文', isDefault: true, active: true, sortOrder: 1 },
  { code: 'en-US', name: '英语', nativeName: 'English', isDefault: false, active: false, sortOrder: 2 },
]

// ==================== 分类与术语 ====================

export interface TermSeed {
  slug: string
  name: string
  nameEn?: string
  anchor?: string
  url?: string
  remark?: string
  /** 术语的文案出处，供保真校验比对（news_category 来自 site.ts 的 category 值） */
  src?: string
  sortOrder: number
}

export interface TaxonomySeed {
  key: string
  name: string
  remark: string
  terms: TermSeed[]
}

/** product_category.anchor 保留原 app 的 hash（#baojian / #yaoshi / #qita），旧深链不失效 */
export const TAXONOMIES: TaxonomySeed[] = [
  {
    key: 'product_category',
    name: '产品分类',
    remark: '对应 apps/app/src/pages/Products.tsx 的 filters',
    terms: [
      { slug: 'baojian', name: '保健食品', anchor: 'baojian', sortOrder: 1, src: 'apps/app/src/pages/Products.tsx:10' },
      { slug: 'yaoshi', name: '药食同源', anchor: 'yaoshi', sortOrder: 2, src: 'apps/app/src/pages/Products.tsx:11' },
      { slug: 'raw-service', name: '原料与服务', anchor: 'qita', sortOrder: 3, src: 'apps/app/src/pages/Products.tsx:12' },
    ],
  },
  {
    key: 'news_category',
    name: '新闻分类',
    remark: '由 site.ts 的 news[].category 去重得出（正好是 5 类，修正 Media.tsx 写死的 5）',
    terms: [
      { slug: 'company', name: '公司新闻', sortOrder: 1, src: 'apps/app/src/data/site.ts:209' },
      { slug: 'expo', name: '参展信息', sortOrder: 2, src: 'apps/app/src/data/site.ts:221' },
      { slug: 'media', name: '媒体报道', sortOrder: 3, src: 'apps/app/src/data/site.ts:233' },
      { slug: 'industry', name: '行业动态', sortOrder: 4, src: 'apps/app/src/data/site.ts:257' },
      { slug: 'activity', name: '活动公告', sortOrder: 5, src: 'apps/app/src/data/site.ts:269' },
    ],
  },
  {
    key: 'dosage_form',
    name: '剂型',
    remark: '对应 apps/app/src/pages/Tech.tsx:132 的剂型标签',
    terms: [
      { slug: 'tablet', name: '片剂', sortOrder: 1 },
      { slug: 'powder', name: '粉剂', sortOrder: 2 },
      { slug: 'granule', name: '颗粒剂', sortOrder: 3 },
      { slug: 'hard-capsule', name: '硬胶囊剂', sortOrder: 4 },
      { slug: 'soft-capsule', name: '软胶囊剂', sortOrder: 5 },
      { slug: 'pill', name: '丸剂', sortOrder: 6 },
    ],
  },
  {
    key: 'shop_channel',
    name: '商城渠道',
    remark: '现网三张卡片的跳转地址都写死为 tmall.com，seed 先填各平台首页占位',
    terms: [
      {
        slug: 'tmall',
        name: '天猫旗舰店',
        nameEn: 'TMALL',
        url: 'https://www.tmall.com',
        remark: '官方直营 · 正品保障',
        sortOrder: 1,
      },
      {
        slug: 'jd',
        name: '京东旗舰店',
        nameEn: 'JD.COM',
        url: 'https://www.jd.com',
        remark: '京东物流 · 极速送达',
        sortOrder: 2,
      },
      {
        slug: 'taobao',
        name: '淘宝企业店',
        nameEn: 'TAOBAO',
        url: 'https://www.taobao.com',
        remark: '产地直发 · 新鲜到家',
        sortOrder: 3,
      },
    ],
  },
  {
    key: 'tag',
    name: '内容标签',
    remark: '预留：本期不录入术语，运行期由后台按需添加',
    terms: [],
  },
]

// ==================== 页面清单（hero 取自各页 PageHeader 实参） ====================

export interface PageSeed {
  key: string
  name: string
  path: string
  heroTitle?: string
  heroSubtitle?: string
  heroEn?: string
  heroImage?: string
  /** PageHeader 实参所在行 */
  heroSrc?: string
  remark: string
}

export const PAGES: PageSeed[] = [
  { key: 'home', name: '首页', path: '/', remark: '首屏为轮播，不用 PageHeader', heroImage: '' },
  {
    key: 'about',
    name: '走进森芝宝',
    path: '/about',
    heroTitle: '走进森芝宝',
    heroSubtitle: '三十年深耕一味灵芝，从龙泉深山的一间实验室，到集种植、科研、加工、销售于一体的国家高新技术企业。',
    heroEn: 'ABOUT',
    heroImage: '/images/hero-lingzhi.jpg',
    heroSrc: 'apps/app/src/pages/About.tsx:73-78',
    remark: '',
  },
  {
    key: 'products',
    name: '产品中心',
    path: '/products',
    heroTitle: '产品中心',
    heroSubtitle: '源自GACP认证基地的道地灵芝，经现代科技精深加工，呈献保健食品、药食同源与原料服务三大体系。',
    heroEn: 'PRODUCTS',
    heroImage: '/images/hero-lingzhi.jpg',
    heroSrc: 'apps/app/src/pages/Products.tsx:47-52',
    remark: '',
  },
  {
    key: 'tech',
    name: '科技强企',
    path: '/tech',
    heroTitle: '科技强企',
    heroSubtitle: '以研发为矛、以智造为盾——超临界萃取、超低温破壁、数字化提取，让千年本草智慧搭载现代科技引擎。',
    heroEn: 'TECH',
    heroImage: '/images/hero-tech.jpg',
    heroSrc: 'apps/app/src/pages/Tech.tsx:45-50',
    remark: '',
  },
  {
    key: 'media',
    name: '媒体中心',
    path: '/media',
    heroTitle: '媒体中心',
    heroSubtitle: '影像与文字，记录森芝宝的每一步成长。',
    heroEn: 'MEDIA',
    heroImage: '/images/base-aerial.jpg',
    heroSrc: 'apps/app/src/pages/Media.tsx:19-24',
    remark: '',
  },
  {
    key: 'voice',
    name: '顾客口碑',
    path: '/voice',
    heroTitle: '顾客口碑',
    heroSubtitle: '金杯银杯，不如顾客的口碑。听一听他们与森芝宝的故事。',
    heroEn: 'VOICE',
    heroImage: '/images/base-cultivation.jpg',
    heroSrc: 'apps/app/src/pages/Voice.tsx:16-21',
    remark: '',
  },
  {
    key: 'mall',
    name: '官方商城',
    path: '/mall',
    heroTitle: '官方商城',
    heroSubtitle: '认准森芝宝官方旗舰店，道地灵芝正品直达您手中。',
    heroEn: 'MALL',
    heroImage: '/images/hero-lingzhi.jpg',
    heroSrc: 'apps/app/src/pages/Mall.tsx:18-23',
    remark: '',
  },
  {
    key: 'contact',
    name: '联系我们',
    path: '/contact',
    heroTitle: '联系我们',
    heroSubtitle: '无论产品咨询、经销合作还是原料采购，森芝宝随时静候您的来信。',
    heroEn: 'CONTACT',
    heroImage: '/images/hero-forest.jpg',
    heroSrc: 'apps/app/src/pages/Contact.tsx:17-22',
    remark: '',
  },
]

// ==================== 内容表的稳定编码与字段派生 ====================

/** 产品分类中文名 -> categorySlug（规划 10.6） */
export const PRODUCT_CATEGORY_SLUG: Record<string, string> = {
  保健食品: 'baojian',
  药食同源: 'yaoshi',
  原料与服务: 'raw-service',
}

export const NEWS_CATEGORY_SLUG: Record<string, string> = {
  公司新闻: 'company',
  参展信息: 'expo',
  媒体报道: 'media',
  行业动态: 'industry',
  活动公告: 'activity',
}

/** Home.tsx L49 的 slice(0,5) 命中前 5 条 -> isFeatured */
export const FEATURED_PRODUCT_IDS = ['spore-powder', 'spore-oil', 'extract', 'tea', 'slices']
/** Mall.tsx L14 的白名单 -> isHot */
export const HOT_PRODUCT_IDS = ['spore-powder', 'spore-oil', 'extract', 'tea']
/** B2B 两条不给商城跳转地址 */
export const NO_SHOP_PRODUCT_IDS = ['raw-material', 'oem']

/** 新闻语义 slug（中文标题无法机器转写，按内容人工分配，与 legacyId 一一对应） */
export const NEWS_SLUGS: Record<string, string> = {
  n1: 'news-committee-member',
  n2: 'news-cie-expo',
  n3: 'news-longquan-industry',
  n4: 'news-joint-lab',
  n5: 'news-standard-release',
  n6: 'news-festival-2026',
}

/**
 * 稳定编码按 fixtures 的数组下标一一对应（seed 会断言长度一致，
 * 不一致直接失败），避免用长中文标题做键导致改一个字就 seed 出重复记录。
 */
export const VIDEO_CODES = [
  'vid-gongpian',
  'vid-jidi',
  'vid-gongyi',
  'vid-fangtan',
  'vid-pobi',
  'vid-huajie',
]

export const REVIEW_CODES = [
  'rev-hz-chen',
  'rev-sh-wang',
  'rev-wz-lin',
  'rev-gz-liu',
  'rev-sz-zhou',
  'rev-bj-wu',
]

export const HONOR_CODES = [
  'honor-gxjs',
  'honor-zjky',
  'honor-lqds',
  'honor-gacp',
  'honor-zjwyh',
  'honor-zycy',
  'honor-organic',
  'honor-iso9001',
]

/** 大事记按 year 升序赋 sortOrder，code 用年份 */
export const timelineCode = (year: string): string => `tl-${year}`
export const navKeyCode = (position: string, path: string, parentKey?: string): string => {
  const seg = path.split('#')[0].split('/').filter(Boolean).join('.') || 'home'
  if (position === 'footer') return `footer.quick.${seg === 'home' ? 'home' : seg}`
  return parentKey ? `${parentKey}.${path.includes('#') ? path.split('#')[1] : seg}` : `header.${seg}`
}

// ==================== 素材基线 ====================

/** apps/app/public/images 现有 13 张图，url 保持 /images/... 不变（文件仍由 app 静态目录提供） */
export const MEDIA_ASSETS = [
  { url: '/images/base-aerial.jpg', name: 'base-aerial', alt: 'GACP认证基地航拍' },
  { url: '/images/base-cultivation.jpg', name: 'base-cultivation', alt: '原木段木栽培' },
  { url: '/images/founder.jpg', name: 'founder', alt: '创始人曹隆枢' },
  { url: '/images/hero-forest.jpg', name: 'hero-forest', alt: '云雾山林' },
  { url: '/images/hero-lingzhi.jpg', name: 'hero-lingzhi', alt: '一朵灵芝' },
  { url: '/images/hero-tech.jpg', name: 'hero-tech', alt: '现代科技' },
  { url: '/images/prod-extract.png', name: 'prod-extract', alt: '灵芝提取物' },
  { url: '/images/prod-oil.png', name: 'prod-oil', alt: '灵芝孢子油软胶囊' },
  { url: '/images/prod-slices.png', name: 'prod-slices', alt: '有机灵芝切片' },
  { url: '/images/prod-spore.png', name: 'prod-spore', alt: '破壁灵芝孢子粉' },
  { url: '/images/prod-tea.png', name: 'prod-tea', alt: '原木赤灵芝茶' },
  { url: '/images/production-line.jpg', name: 'production-line', alt: '全自动生产线' },
  { url: '/images/university.jpg', name: 'university', alt: '校企合作' },
]

/**
 * 源码引用了但 apps/app/public/images 下不存在的两个文件（现网为破图）。
 * seed 时统一走 imageOf() 换为存在的占位图（区块 props 与实体图片字段都过这一层），
 * seed-report 里标 MISSING 待运营补素材后替换。
 */
export const MISSING_IMAGES: { ref: string; placeholder: string; usedBy: string }[] = [
  { ref: '/images/lab.jpg', placeholder: '/images/production-line.jpg', usedBy: '原 Tech.tsx:83 研发中心卡、原 Media.tsx:12 视频封面' },
  { ref: '/images/team.jpg', placeholder: '/images/hero-tech.jpg', usedBy: '原 Tech.tsx:199 团队段配图' },
]

export const imageOf = (url: string): string => MISSING_IMAGES.find((m) => m.ref === url)?.placeholder ?? url

/**
 * 源码里无法确定真实值的占位内容（规划 10.6 要求 seed 报告标 TODO），
 * verify-seed 会把这一节原样写进 seed-report.md，作为上线前的运营核对清单。
 */
export const SEED_TODOS: { item: string; note: string }[] = [
  {
    item: 'Term(shop_channel).url',
    note: '现网三张店铺卡片跳转地址均写死为 https://www.tmall.com（apps/app/src/pages/Mall.tsx:31），seed 先按各平台首页占位，待商务确认实际店铺地址后在后台「分类术语 - 商城渠道」替换',
  },
  {
    item: 'Setting icp.number / police.number',
    note: '页脚备案号为占位值（浙ICP备00000000号-1 / 浙公网安备33118100000000号），上线前需替换为真实备案号',
  },
  {
    item: 'Video.url',
    note: '现网无真实视频源（仅 poster / duration），seed 留空，待运营上传后在后台「视频管理」补充',
  },
]

// ==================== 组织与角色 ====================

export const ROOT_ORG = {
  name: '浙江森芝宝生物科技有限公司',
  code: 'SENZHIBAO',
  remark: '根节点，由 seed 创建',
}

export const ADMIN_USERNAME = 'admin'
export const ADMIN_NAME = '超级管理员'

/**
 * 组件内部固定文案（不属于区块、也不属于 Page/Section 的那一类）统一落 Setting(group=ui)，
 * 使后台可改且与 copy.ts 的 C 类逐字比对能对上。
 * 区块专属文案（表单字段名/按钮等）一律存 Block.props，不在此重复登记，避免两处真源。
 */
export const UI_SETTING_COPY: { key: string; group: string; type: string; label: string; code: CopyCode }[] = [
  { key: 'ui.productParams', group: 'ui', type: 'text', label: '产品详情-产品参数标题', code: 'product.params' },
  { key: 'ui.productUsage', group: 'ui', type: 'text', label: '产品详情-食用方法标题', code: 'product.usage' },
  { key: 'ui.productFeatures', group: 'ui', type: 'text', label: '产品详情-特点与适用标题', code: 'product.features' },
  { key: 'ui.productAudiences', group: 'ui', type: 'text', label: '产品详情-适用人群标题', code: 'product.audiences' },
  { key: 'ui.productRelated', group: 'ui', type: 'text', label: '产品详情-相关推荐标题', code: 'product.related' },
  { key: 'ui.productBuyBtn', group: 'ui', type: 'text', label: '产品详情-商城购买按钮', code: 'product.buyBtn' },
  { key: 'ui.productConsult', group: 'ui', type: 'text', label: '产品详情-咨询客服按钮', code: 'product.consult' },
  { key: 'ui.productSpecLabel', group: 'ui', type: 'text', label: '产品详情-规格前缀', code: 'product.specLabel' },
  { key: 'ui.productBack', group: 'ui', type: 'text', label: '产品详情-返回列表按钮', code: 'product.backList' },
  { key: 'ui.productCrumb', group: 'ui', type: 'text', label: '产品详情-面包屑', code: 'product.back' },
  { key: 'ui.productNotFound', group: 'ui', type: 'text', label: '产品详情-不存在标题', code: 'product.notfound' },
  { key: 'ui.productNotFoundDesc', group: 'ui', type: 'text', label: '产品详情-不存在说明', code: 'product.notfoundDesc' },
  { key: 'ui.newsRelated', group: 'ui', type: 'text', label: '新闻详情-相关资讯标题', code: 'news.related' },
  { key: 'ui.newsBack', group: 'ui', type: 'text', label: '新闻详情-返回列表按钮', code: 'news.backList' },
  { key: 'ui.newsCrumb', group: 'ui', type: 'text', label: '新闻详情-面包屑', code: 'news.back' },
  { key: 'ui.newsNotFound', group: 'ui', type: 'text', label: '新闻详情-不存在标题', code: 'news.notfound' },
  { key: 'ui.newsNotFoundDesc', group: 'ui', type: 'text', label: '新闻详情-不存在说明', code: 'news.notfoundDesc' },
  { key: 'ui.productsSearchPlaceholder', group: 'ui', type: 'text', label: '产品列表-搜索框占位', code: 'products.searchPlaceholder' },
  { key: 'ui.productsEmptyTitle', group: 'ui', type: 'text', label: '产品列表-空状态标题', code: 'products.emptyTitle' },
  { key: 'ui.productsEmptyDesc', group: 'ui', type: 'text', label: '产品列表-空状态说明', code: 'products.emptyDesc' },
  { key: 'ui.productsDetailBtn', group: 'ui', type: 'text', label: '产品卡片-查看详情', code: 'products.detail' },
  { key: 'ui.productsFilterAll', group: 'ui', type: 'text', label: '产品列表-「全部」筛选项', code: 'products.all' },
  { key: 'ui.mallOfficialTag', group: 'ui', type: 'text', label: '商城卡片-官方直营标签', code: 'mall.hot.official' },
  { key: 'ui.footerNavTitle', group: 'ui', type: 'text', label: '页脚-快速导航栏标题', code: 'footer.navTitle' },
  { key: 'ui.footerContactTitle', group: 'ui', type: 'text', label: '页脚-联系我们栏标题', code: 'footer.contactTitle' },
  { key: 'ui.footerHotlineSuffix', group: 'ui', type: 'text', label: '页脚-商务合作后缀', code: 'footer.hotlineSuffix' },
  { key: 'ui.footerConsumerSuffix', group: 'ui', type: 'text', label: '页脚-消费者服务后缀', code: 'footer.consumerSuffix' },
  { key: 'ui.aboutAsideTitle', group: 'ui', type: 'text', label: '关于页侧栏-标题', code: 'about.side.bizTitle' },
  { key: 'ui.aboutAsideDesc', group: 'ui', type: 'text', label: '关于页侧栏-说明', code: 'about.side.bizDesc' },
  { key: 'ui.aboutAsideBtn', group: 'ui', type: 'text', label: '关于页侧栏-按钮', code: 'about.side.bizBtn' },
]
