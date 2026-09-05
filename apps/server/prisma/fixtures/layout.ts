/**
 * 页面装修基线：30 个 Section / 49 个 Block。
 *
 * 约定（规划 §4 末、§10.6）：
 * - 眉标 / 标题 / 副标题一律放 Section，Block 只装内容项，避免同一句标题两处真源；
 * - A/B 类已有结构数据（轮播、统计、标签、实验室、工艺、科研、视频、好评率、保障、导航）
 *   全部从 fixtures/pages.ts 取，不重新誊写；
 * - C 类散文一律通过 copyText(code) 取，保证与 app 源码逐字一致且可比对；
 * - 图片经 imageOf() 处理：源码引用了实际不存在的 lab.jpg / team.jpg，落库换占位图，
 *   seed-report 里记 MISSING；
 * - entity_list 只存 { source, query } 引用，不落实体副本。
 *
 * Section.variant 由现网背景 class 反推：
 *   bg-forest-deep -> forest-dark，bg-forest -> forest，bg-cream-deep/60 -> cream-deep，其余 plain；
 * 带 grain 的记 theme.texture = true。
 */

import { pageConstants } from './pages'
import { copyText } from './copy'
import { imageOf } from './meta'

export interface BlockSeed {
  code: string
  type: string
  /** 区块级小标题（如「创始人语录」），区别于 Section.title */
  title?: string
  columns?: number
  /** entity_list 专用 */
  source?: string
  query?: Record<string, unknown>
  theme?: Record<string, unknown>
  props: Record<string, unknown>
}

export interface SectionSeed {
  anchor: string
  label: string
  eyebrow?: string
  title?: string
  subtitle?: string
  variant?: string
  texture?: boolean
  showInSubNav: boolean
  blocks: BlockSeed[]
}

const C = pageConstants
const t = copyText

/** 序号文案：与现网 String(i + 1).padStart(2, '0') 一致 */
const stepOf = (index: number): string => String(index + 1).padStart(2, '0')

const ENTITY_QUERY = {
  product: (where: Record<string, unknown>, limit: number) => ({ where: { status: 1, ...where }, orderBy: [{ sortOrder: 'asc' }], limit }),
  news: (limit: number) => ({ where: { status: 1 }, orderBy: [{ sortOrder: 'asc' }], limit }),
  video: (limit: number) => ({ where: { status: 1 }, orderBy: [{ sortOrder: 'asc' }], limit }),
  review: (limit: number) => ({ where: { status: 1 }, orderBy: [{ sortOrder: 'asc' }], limit }),
  honor: (limit: number) => ({ where: { status: 1 }, orderBy: [{ sortOrder: 'asc' }], limit }),
  timeline: (limit: number) => ({ where: { status: 1 }, orderBy: [{ year: 'asc' }], limit }),
  term: (taxonomy: string, limit: number) => ({ where: { taxonomy, status: 1 }, orderBy: [{ sortOrder: 'asc' }], limit }),
}

// ==================== home ====================

const home: SectionSeed[] = [
  {
    anchor: 'hero',
    label: '首屏轮播',
    variant: 'forest-dark',
    showInSubNav: false,
    blocks: [
      {
        code: 'slides',
        type: 'hero_slider',
        props: {
          slides: C.home.slides.map((s) => ({
            eyebrow: s.eyebrow,
            title: s.title,
            text: s.desc,
            image: imageOf(s.image),
            primary: t('home.hero.btnBase'),
            primaryUrl: '/about',
            secondary: t('home.hero.btnMall'),
            secondaryUrl: '/mall',
          })),
          interval: 6000,
        },
      },
    ],
  },
  {
    anchor: 'stats',
    label: '企业数据',
    variant: 'forest-dark',
    texture: true,
    showInSubNav: false,
    blocks: [{ code: 'stats', type: 'stat_grid', columns: 5, props: { items: C.home.stats } }],
  },
  {
    anchor: 'about',
    label: '企业简介',
    eyebrow: t('home.about.eyebrow'),
    title: t('home.about.title'),
    showInSubNav: false,
    blocks: [
      { code: 'intro', type: 'richtext', props: { paragraphs: [t('home.about.p1'), t('home.about.p2')] } },
      {
        code: 'founderCard',
        type: 'quote',
        props: {
          image: imageOf('/images/founder.jpg'),
          role: t('home.about.founderTag'),
          text: t('home.about.founderDesc'),
          buttonText: t('home.about.videoBtn'),
          buttonUrl: '/media#videos',
        },
      },
      { code: 'techTags', type: 'tag_cloud', props: { items: C.home.techTags } },
    ],
  },
  {
    anchor: 'products',
    label: '精选产品',
    eyebrow: t('home.products.eyebrow'),
    title: t('home.products.title'),
    subtitle: t('home.products.desc'),
    variant: 'forest',
    texture: true,
    showInSubNav: false,
    blocks: [
      {
        code: 'featured',
        type: 'entity_list',
        columns: 5,
        source: 'product',
        query: ENTITY_QUERY.product({ isFeatured: true }, 5),
        props: { showImage: true, buttonText: t('home.products.link'), buttonUrl: '/products' },
      },
    ],
  },
  {
    anchor: 'base',
    label: '绿色基地',
    eyebrow: t('home.base.eyebrow'),
    title: t('home.base.title'),
    showInSubNav: false,
    blocks: [
      {
        code: 'gallery',
        type: 'gallery',
        columns: 2,
        props: {
          items: [
            { image: imageOf('/images/base-aerial.jpg'), caption: t('home.base.imgAlt') },
            { image: imageOf('/images/base-cultivation.jpg'), caption: t('home.base.imgAlt2') },
          ],
        },
      },
      { code: 'intro', type: 'richtext', props: { paragraphs: [t('home.base.desc')] } },
      {
        code: 'points',
        type: 'feature_list',
        columns: 1,
        props: {
          items: [
            { title: t('home.base.point1Title'), description: t('home.base.point1Desc') },
            { title: t('home.base.point2Title'), description: t('home.base.point2Desc') },
            { title: t('home.base.point3Title'), description: t('home.base.point3Desc') },
          ],
        },
      },
      { code: 'cta', type: 'cta_band', props: { buttonText: t('home.base.btn'), buttonUrl: '/about' } },
    ],
  },
  {
    anchor: 'news',
    label: '森芝宝动态',
    eyebrow: t('home.news.eyebrow'),
    title: t('home.news.title'),
    subtitle: t('home.news.desc'),
    variant: 'cream-deep',
    showInSubNav: false,
    blocks: [
      {
        code: 'latest',
        type: 'entity_list',
        columns: 3,
        source: 'news',
        query: ENTITY_QUERY.news(3),
        props: { showImage: false, buttonText: t('home.news.link'), buttonUrl: '/media' },
      },
    ],
  },
  {
    anchor: 'mall',
    label: '官方商城',
    eyebrow: t('home.mall.eyebrow'),
    title: t('home.mall.title'),
    subtitle: t('home.mall.desc'),
    variant: 'forest-dark',
    texture: true,
    showInSubNav: false,
    blocks: [
      {
        code: 'channels',
        type: 'entity_list',
        columns: 3,
        source: 'term',
        query: ENTITY_QUERY.term('shop_channel', 10),
        props: { showImage: false },
      },
      { code: 'cta', type: 'cta_band', props: { buttonText: t('home.mall.btn'), buttonUrl: '/mall' } },
    ],
  },
]

// ==================== about ====================

const about: SectionSeed[] = [
  {
    anchor: 'intro',
    label: C.about.subNav[0].label,
    eyebrow: t('about.intro.eyebrow'),
    title: t('about.intro.title'),
    showInSubNav: true,
    blocks: [
      {
        code: 'founderQuote',
        type: 'quote',
        title: t('about.founderQuote.label'),
        props: { text: t('about.founderQuote.text'), author: t('about.founderQuote.author') },
      },
      {
        code: 'body',
        type: 'richtext',
        props: { paragraphs: [t('about.intro.p1'), t('about.intro.p2'), t('about.intro.p3')] },
      },
      {
        code: 'advantages',
        type: 'card_grid',
        columns: 4,
        props: { items: C.about.advantages.map(([title, desc]) => ({ title, description: desc })) },
      },
    ],
  },
  {
    anchor: 'history',
    label: C.about.subNav[1].label,
    eyebrow: t('about.history.eyebrow'),
    title: t('about.history.title'),
    variant: 'forest',
    texture: true,
    showInSubNav: true,
    blocks: [
      {
        code: 'events',
        type: 'entity_list',
        source: 'timeline',
        query: ENTITY_QUERY.timeline(30),
        props: { showImage: false },
      },
    ],
  },
  {
    anchor: 'culture',
    label: C.about.subNav[2].label,
    eyebrow: t('about.culture.eyebrow'),
    title: t('about.culture.title'),
    showInSubNav: true,
    blocks: [
      {
        code: 'cultures',
        type: 'culture_grid',
        columns: 4,
        props: { items: C.about.cultures.map(([char, title, desc]) => ({ char, title, description: desc })) },
      },
    ],
  },
  {
    anchor: 'honors',
    label: C.about.subNav[3].label,
    eyebrow: t('about.honors.eyebrow'),
    title: t('about.honors.title'),
    variant: 'cream-deep',
    showInSubNav: true,
    blocks: [
      {
        code: 'honors',
        type: 'entity_list',
        columns: 4,
        source: 'honor',
        query: ENTITY_QUERY.honor(30),
        props: { showImage: false },
      },
    ],
  },
  {
    anchor: 'base',
    label: C.about.subNav[4].label,
    eyebrow: t('about.base.eyebrow'),
    title: t('about.base.title'),
    showInSubNav: true,
    blocks: [
      {
        code: 'gallery',
        type: 'gallery',
        columns: 2,
        props: {
          items: [
            { image: imageOf('/images/base-aerial.jpg'), caption: t('about.base.imgAlt') },
            { image: imageOf('/images/base-cultivation.jpg'), caption: t('about.base.imgAlt2') },
            { image: imageOf('/images/hero-forest.jpg'), caption: t('about.base.imgAlt3') },
          ],
        },
      },
      // About.tsx:276「浙江绿谷、瓯江之源——龙泉，是灵芝生长的黄金纬度带。」
      { code: 'intro', type: 'richtext', props: { paragraphs: [t('about.base.desc')] } },
      {
        code: 'stats',
        type: 'stat_grid',
        columns: 2,
        props: {
          items: [
            { value: t('about.base.stat1'), label: t('about.base.stat1Label') },
            { value: t('about.base.stat2'), label: t('about.base.stat2Label') },
            { value: t('about.base.stat3'), label: t('about.base.stat3Label') },
            { value: t('about.base.stat4'), label: t('about.base.stat4Label') },
          ],
        },
      },
      {
        code: 'points',
        type: 'feature_list',
        columns: 1,
        props: {
          items: [
            { title: t('about.base.point1Title'), description: t('about.base.point1Desc') },
            { title: t('about.base.point2Title'), description: t('about.base.point2Desc') },
          ],
        },
      },
      { code: 'cta', type: 'cta_band', props: { buttonText: t('about.base.btn'), buttonUrl: '/contact' } },
    ],
  },
]

// ==================== tech ====================

const tech: SectionSeed[] = [
  {
    anchor: 'rd',
    label: '研发中心',
    eyebrow: t('tech.rd.eyebrow'),
    title: t('tech.rd.title'),
    showInSubNav: true,
    blocks: [
      {
        code: 'labs',
        type: 'card_grid',
        columns: 4,
        props: { items: C.tech.labs.map((l) => ({ icon: l.icon, title: l.title, description: l.desc })) },
      },
    ],
  },
  {
    anchor: 'lines',
    label: '产线介绍',
    eyebrow: t('tech.lines.eyebrow'),
    title: t('tech.lines.title'),
    variant: 'forest-dark',
    showInSubNav: true,
    blocks: [
      {
        code: 'banner',
        type: 'gallery',
        columns: 1,
        props: { items: [{ image: imageOf('/images/lab.jpg'), caption: t('tech.lines.imgAlt') }] },
      },
      {
        code: 'processes',
        type: 'numbered_list',
        columns: 1,
        props: { items: C.tech.processes.map(([title, desc], i) => ({ step: stepOf(i), title, description: desc })) },
      },
    ],
  },
  {
    anchor: 'dosage',
    label: '全剂型生产',
    eyebrow: t('tech.dosage.eyebrow'),
    title: t('tech.dosage.title'),
    showInSubNav: false,
    blocks: [
      { code: 'intro', type: 'richtext', props: { paragraphs: [t('tech.dosage.desc')] } },
      {
        code: 'forms',
        type: 'tag_cloud',
        props: { items: t('tech.dosageForms').split('、'), baseUrl: '/products#' },
      },
      {
        code: 'photo',
        type: 'gallery',
        columns: 1,
        props: { items: [{ image: imageOf('/images/production-line.jpg'), caption: t('tech.dosage.imgAlt') }] },
      },
    ],
  },
  {
    anchor: 'coop',
    label: '校企合作',
    eyebrow: t('tech.coop.eyebrow'),
    title: t('tech.coop.title'),
    variant: 'cream-deep',
    texture: true,
    showInSubNav: true,
    blocks: [
      {
        code: 'photo',
        type: 'gallery',
        columns: 1,
        props: { items: [{ image: imageOf('/images/university.jpg'), caption: t('tech.coop.imgAlt') }] },
      },
      {
        code: 'projects',
        type: 'research_list',
        columns: 1,
        props: { items: C.tech.research.map(([title, period, lab]) => ({ title, date: period, partner: lab })) },
      },
      { code: 'note', type: 'richtext', props: { paragraphs: [t('tech.coop.note')] } },
    ],
  },
  {
    anchor: 'team',
    label: '团队',
    eyebrow: t('tech.team.eyebrow'),
    title: t('tech.team.title'),
    showInSubNav: false,
    blocks: [
      {
        code: 'photo',
        type: 'gallery',
        columns: 1,
        props: { items: [{ image: imageOf('/images/team.jpg'), caption: t('tech.team.imgAlt') }] },
      },
      { code: 'intro', type: 'richtext', props: { paragraphs: [t('tech.team.p1'), t('tech.team.p2')] } },
    ],
  },
]

// ==================== products ====================

const products: SectionSeed[] = [
  {
    anchor: 'list',
    label: '产品列表',
    showInSubNav: false,
    blocks: [
      {
        code: 'all',
        type: 'entity_list',
        columns: 3,
        source: 'product',
        // 现网分类切换与搜索在前端完成，故一次取全量（上限受 normalizeEntityQuery 的 60 约束）
        query: ENTITY_QUERY.product({}, 60),
        props: { showImage: true },
      },
    ],
  },
  {
    anchor: 'b2b',
    label: '原料与代工',
    variant: 'forest-dark',
    texture: true,
    showInSubNav: false,
    blocks: [
      {
        code: 'band',
        type: 'cta_band',
        props: {
          title: t('products.b2bTitle'),
          text: t('products.b2bDesc'),
          buttonText: t('products.b2bBtn'),
          buttonUrl: '/contact',
        },
      },
    ],
  },
]

// ==================== media ====================

const media: SectionSeed[] = [
  {
    anchor: 'videos',
    label: '企业视频',
    eyebrow: t('media.videos.eyebrow'),
    title: t('media.videos.title'),
    showInSubNav: true,
    blocks: [
      {
        code: 'videos',
        type: 'entity_list',
        columns: 3,
        source: 'video',
        query: ENTITY_QUERY.video(12),
        props: { showImage: true },
      },
    ],
  },
  {
    anchor: 'news',
    label: '企业动态',
    eyebrow: t('media.news.eyebrow'),
    title: t('media.news.title'),
    variant: 'cream-deep',
    showInSubNav: true,
    blocks: [
      {
        code: 'list',
        type: 'entity_list',
        columns: 1,
        source: 'news',
        query: ENTITY_QUERY.news(20),
        props: { showImage: false },
      },
    ],
  },
]

// ==================== voice ====================

const voice: SectionSeed[] = [
  {
    anchor: 'stats',
    label: '口碑数据',
    variant: 'forest-dark',
    texture: true,
    showInSubNav: false,
    blocks: [{ code: 'stats', type: 'stat_grid', columns: 4, props: { items: C.voice.stats } }],
  },
  {
    anchor: 'reviews',
    label: '全部评价',
    eyebrow: t('voice.reviews.eyebrow'),
    title: t('voice.reviews.title'),
    showInSubNav: false,
    blocks: [
      {
        code: 'list',
        type: 'entity_list',
        columns: 3,
        source: 'review',
        query: ENTITY_QUERY.review(20),
        props: { showImage: false },
      },
      {
        code: 'foot',
        type: 'richtext',
        props: { paragraphs: [t('voice.foot.text'), t('voice.foot.link')] },
      },
    ],
  },
]

// ==================== mall ====================

const mall: SectionSeed[] = [
  {
    anchor: 'platforms',
    label: '商城入口',
    showInSubNav: false,
    blocks: [
      {
        code: 'channels',
        type: 'entity_list',
        columns: 3,
        source: 'term',
        query: ENTITY_QUERY.term('shop_channel', 10),
        props: { showImage: false, itemAction: t('mall.platforms.enter') },
      },
    ],
  },
  {
    anchor: 'guarantees',
    label: '服务保障',
    variant: 'cream-deep',
    showInSubNav: false,
    blocks: [
      {
        code: 'items',
        type: 'card_grid',
        columns: 3,
        props: { items: C.mall.guarantees.map((g) => ({ icon: g.icon, title: g.title, description: g.desc })) },
      },
    ],
  },
  {
    anchor: 'hot',
    label: '热销臻品',
    eyebrow: t('mall.hot.eyebrow'),
    title: t('mall.hot.title'),
    showInSubNav: false,
    blocks: [
      {
        code: 'products',
        type: 'entity_list',
        columns: 4,
        source: 'product',
        query: ENTITY_QUERY.product({ isHot: true }, 8),
        props: { showImage: true },
      },
    ],
  },
  {
    anchor: 'foot',
    label: '底部引导',
    showInSubNav: false,
    blocks: [
      {
        code: 'band',
        type: 'cta_band',
        props: {
          title: t('mall.foot.title'),
          text: t('mall.foot.desc'),
          buttonText: t('home.mall.btn'),
          buttonUrl: '/products',
        },
      },
    ],
  },
]

// ==================== contact ====================

const contact: SectionSeed[] = [
  {
    anchor: 'info',
    label: '联系信息',
    showInSubNav: false,
    blocks: [
      {
        code: 'channels',
        type: 'feature_list',
        columns: 1,
        props: {
          // 标签写死在区块，取值走 Setting（规划 §2：contactInfo -> Setting(group=contact)），
          // 前台按 valueKey 覆盖 description，保证热线/地址只有一处真源
          items: [
            { icon: 'MapPin', title: t('contact.channel.address'), valueKey: 'contact.address' },
            { icon: 'Phone', title: t('contact.channel.hotline'), valueKey: 'contact.hotline' },
            { icon: 'Phone', title: t('contact.channel.consumer'), valueKey: 'contact.consumerHotline' },
            { icon: 'Mail', title: t('contact.channel.email'), valueKey: 'contact.email' },
            { icon: 'Clock', title: t('contact.channel.hours'), valueKey: 'contact.hours' },
          ],
        },
      },
      {
        code: 'wechat',
        type: 'card_grid',
        columns: 1,
        props: {
          items: [
            { title: t('contact.wechat.title'), subtitle: t('contact.wechat.label'), description: t('contact.wechat.desc') },
          ],
        },
      },
    ],
  },
  {
    anchor: 'form',
    label: '在线留言',
    showInSubNav: false,
    blocks: [
      {
        code: 'form',
        type: 'contact_form',
        props: {
          title: t('contact.form.title'),
          text: t('contact.form.desc'),
          nameLabel: t('contact.form.nameLabel'),
          namePlaceholder: t('contact.form.namePlaceholder'),
          phoneLabel: t('contact.form.phoneLabel'),
          phonePlaceholder: t('contact.form.phonePlaceholder'),
          emailLabel: t('contact.form.emailLabel'),
          emailPlaceholder: t('contact.form.emailPlaceholder'),
          contentLabel: t('contact.form.contentLabel'),
          contentPlaceholder: t('contact.form.contentPlaceholder'),
          // 与 Message.type 注释一致；placeholder 里以「如：…」形式出现
          typeOptions: ['产品咨询', '经销合作', '原料采购', 'OEM代工'],
          submitText: t('contact.form.submit'),
          successTitle: t('contact.form.successTitle'),
          successTip: t('contact.form.successTip'),
          successHotline: t('contact.form.successHotline'),
          // 号码不落实体，前台按 key 现取 Setting，与联系信息行为一致
          phoneKey: 'contact.consumerHotline',
          againText: t('contact.form.again'),
        },
      },
    ],
  },
  {
    anchor: 'map',
    label: '区位示意图',
    eyebrow: t('contact.map.eyebrow'),
    title: t('contact.map.title'),
    subtitle: t('contact.map.desc'),
    variant: 'forest-dark',
    texture: true,
    showInSubNav: false,
    blocks: [
      {
        code: 'sketch',
        type: 'map_sketch',
        // 现网为纯 CSS 绘制（无底图），x/y 取自 Contact.tsx 的绝对定位百分比
        props: {
          marker: t('contact.map.marker'),
          labels: [
            { text: t('contact.map.label1'), x: 12, y: 12 },
            { text: t('contact.map.label2'), x: 90, y: 16 },
            { text: t('contact.map.label3'), x: 16, y: 86 },
            { text: t('contact.map.label4'), x: 86, y: 88 },
            { text: t('contact.map.label5'), x: 70, y: 30 },
            { text: t('contact.map.label6'), x: 28, y: 38 },
          ],
        },
      },
    ],
  },
]

// ==================== 汇总 ====================

export const LAYOUT: Record<string, SectionSeed[]> = {
  home,
  about,
  products,
  tech,
  media,
  voice,
  mall,
  contact,
}

/** 供 seed 与 verify 共用的派生统计 */
export const LAYOUT_STATS = Object.entries(LAYOUT).reduce(
  (acc, [page, sections]) => {
    acc.pages += 1
    acc.sections += sections.length
    acc.blocks += sections.reduce((n, s) => n + s.blocks.length, 0)
    acc.byPage[page] = { sections: sections.length, blocks: sections.reduce((n, s) => n + s.blocks.length, 0) }
    return acc
  },
  { pages: 0, sections: 0, blocks: 0, byPage: {} as Record<string, { sections: number; blocks: number }> },
)
