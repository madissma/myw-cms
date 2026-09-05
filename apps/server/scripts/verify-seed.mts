/**
 * seed 保真校验（规划 10.8）：seed 之后的回归闸门。
 *
 * 五道检查：
 *   1) 条数断言     全表计数 vs prisma/fixtures/expected.ts
 *   2) A 类逐字     fixtures/site.json vs 库内产品 / 新闻 / 口碑 / 渠道 / 联系方式
 *   3) B 类基线     fixtures/pages.ts vs 库内视频 / 荣誉 / 大事记 / 导航；layout.ts vs 库内 Page/Section/Block（含 props 深比对）
 *   4) C 类         fixtures/copy.ts 每条校验其文案确已落库（常开）；
 *                   另可逐字比对 app 源码指定行，见 APP_SOURCE_GATE
 *   5) 引用完整性   分类命中、entity_list 可解析（复用 BlockAssembler）、区块图片已登记
 *
 * 执行：pnpm db:verify
 *       pnpm db:verify -- --fixtures-only     建站期诊断：只跑 C 类的 app 源码逐字比对（不连库）；
 *                                             前台已改区块驱动、源码不再持有原文，现在跑必得假阳性
 * 产物：prisma/seed-report.md；任一 FAIL 以非 0 退出。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PrismaClient } from '@prisma/client'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(scriptsDir, '..')
const repoRoot = path.resolve(serverRoot, '..', '..')   // apps/server -> 仓库根
const reportFile = path.resolve(serverRoot, 'prisma', 'seed-report.md')
const fixturesOnly = process.argv.slice(2).includes('--fixtures-only')
/**
 * app 源码逐字闸门（规划 §10.8：作为 M5 前台改造期间的回归闸门，切换完成后可移除）。
 *
 * 前台已整体改为 Page / Section / Block 驱动，C 类散文已从 JSX 迁入 fixtures/copy.ts 并入库，
 * app 源码不再持有原文，比对它只会得到「源码为空」的假阳性；
 * 因此常开的是「copy.ts 文案确已落库」，源码逐字比对退为建站期的显式诊断模式（--fixtures-only）。
 * 若回滚前台改造或需要重新核对原文，把本常量改回 true。
 */
const APP_SOURCE_GATE = false

/** .mts 里按 nodenext 不能写无扩展名的相对 import，统一走运行期解析 */
const load = (rel: string): Promise<any> => import(pathToFileURL(path.resolve(serverRoot, rel)).href) as Promise<any>

const { loadEnvFile } = await load('src/common/utils/env.util.ts')
const { EXPECTED_COUNTS } = await load('prisma/fixtures/expected.ts')
const { COPY } = await load('prisma/fixtures/copy.ts')
const { LAYOUT } = await load('prisma/fixtures/layout.ts')
const meta = await load('prisma/fixtures/meta.ts')
const { pageConstants } = await load('prisma/fixtures/pages.ts')
const { normalizeBlockProps, normalizeEntityQuery } = await load('src/modules/page/block.util.ts')
const { BlockAssembler } = await load('src/modules/page/block-assembler.service.ts')
const { SETTINGS } = await load('src/common/constants/settings.ts')

const site = JSON.parse(readFileSync(path.resolve(serverRoot, 'prisma/fixtures/site.json'), 'utf-8'))

// ==================== 结果收集 ====================

type Level = 'PASS' | 'SOFT' | 'FAIL'
interface Row {
  group: string
  item: string
  level: Level
  detail: string
  /** 期望 / 实际取值，仅写入报告，供差异定位 */
  pair?: string
}
const rows: Row[] = []
/**
 * soft = true 表示宽松断言（如 derived 文案只比对固定片段），不通过时只记 SOFT 不阻塞。
 * note 为通过时也要写进报告的说明（如 C 类的匹配方式）。
 */
function check(group: string, item: string, ok: boolean, failDetail = '', soft = false, note = ''): boolean {
  if (ok) rows.push({ group, item, level: 'PASS', detail: note || (soft ? '宽松匹配' : '') })
  else rows.push({ group, item, level: soft ? 'SOFT' : 'FAIL', detail: failDetail })
  return ok
}
function expectEq(group: string, item: string, expected: unknown, actual: unknown, soft = false) {
  const same = stable(expected) === stable(actual)
  const ok = check(group, item, same, same ? '' : '值不一致', soft)
  rows[rows.length - 1].pair = `期望 ${brief(expected)} / 实际 ${brief(actual)}`
  return ok
}

/** 键排序后序列化，避免 Json 字段因属性顺序产生假差异 */
function stable(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    return `{${entries.map(([k, v]) => `${k}:${stable(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}
function brief(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  const one = String(text ?? '').replace(/\s+/g, ' ')
  return one.length > 60 ? `${one.slice(0, 60)}…` : one
}

// ==================== 文本归一化（规划 10.8：去空白、统一引号、剔 JSX） ====================

function normalizeText(raw: string): string {
  return String(raw ?? '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ') // JSX 注释
    .replace(/<[^<>]*>/g, ' ') // 标签及其属性
    .replace(/[{}]/g, '')
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, '')
}
/**
 * 源码侧可见文本：先把 `{'…'}` / `{"…"}` / `{`…`}` 表达式就地换成其正文（保证与标签内文本的相对顺序），
 * 再走通用清洗。
 */
function normalizeSourceRange(raw: string): string {
  const expanded = String(raw ?? '')
    .replace(/\{(["'])((?:\\.|(?!\1).)*)\1\}/g, (_all, _quote, inner) => ` ${inner} `)
    .replace(/\{`([^`]*)`\}/g, ' $1 ')
  return normalizeText(expanded)
}
/** 属性值兜底：index.html 的 meta content、单行 `<img alt="…" />` 等正文全在引号里的场景 */
function normalizeSourceAttrs(raw: string): string {
  const quoted = [...String(raw ?? '').matchAll(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g)].map((match) => match[2])
  return quoted.map(normalizeText).join('')
}
const segmentsOf = (text: string): string[] =>
  normalizeText(text)
    .split(/[·、|]/)
    .map((seg) => seg.trim())
    .filter((seg) => seg.length >= 2)

// ==================== 1 条数断言 ====================

const DELEGATES: Record<string, string> = {
  Permission: 'permission',
  Role: 'role',
  Org: 'org',
  User: 'user',
  Taxonomy: 'taxonomy',
  Term: 'term',
  Setting: 'setting',
  Theme: 'theme',
  Locale: 'locale',
  NavMenu: 'navMenu',
  Product: 'product',
  News: 'news',
  Video: 'video',
  Review: 'review',
  Honor: 'honor',
  TimelineEvent: 'timelineEvent',
  Page: 'page',
  Section: 'section',
  Block: 'block',
  MediaAsset: 'mediaAsset',
}

async function verifyCounts(prisma: PrismaClient) {
  for (const [model, expected] of Object.entries(EXPECTED_COUNTS)) {
    const actual = await (prisma as any)[DELEGATES[model]].count()
    expectEq('1 条数', model, expected, actual)
  }
}

// ==================== 2 A 类逐字 ====================

async function verifyClassA(prisma: PrismaClient) {
  // 商城渠道术语：shopUrl 派生自它，故先取一次
  const channel = await prisma.taxonomy.findUnique({ where: { key: 'shop_channel' }, include: { terms: { orderBy: { sortOrder: 'asc' } } } })
  const tmallUrl = channel?.terms.find((term) => term.slug === 'tmall')?.url ?? null

  for (const item of site.products) {
    const row = await prisma.product.findUnique({ where: { slug: item.id } })
    if (!check('2 A类', `product ${item.id} 存在`, !!row, '库内缺失')) continue
    const group = `2 A类`
    expectEq(group, `product ${item.id}.name`, item.name, row.name)
    expectEq(group, `product ${item.id}.nameEn`, item.en, row.nameEn)
    expectEq(group, `product ${item.id}.category`, meta.PRODUCT_CATEGORY_SLUG[item.category], row.categorySlug)
    expectEq(group, `product ${item.id}.tag`, item.tag, row.tag)
    expectEq(group, `product ${item.id}.tagline`, item.tagline, row.tagline)
    expectEq(group, `product ${item.id}.description`, item.description, row.description)
    expectEq(group, `product ${item.id}.image`, item.image, row.image)
    expectEq(group, `product ${item.id}.spec`, item.spec, row.spec)
    expectEq(group, `product ${item.id}.usage`, item.usage, row.usage)
    for (const field of ['params', 'certs', 'features', 'audiences']) {
      expectEq(group, `product ${item.id}.${field}`, item[field] ?? [], row[field] ?? [])
    }
    expectEq(group, `product ${item.id}.isFeatured`, meta.FEATURED_PRODUCT_IDS.includes(item.id), row.isFeatured)
    expectEq(group, `product ${item.id}.isHot`, meta.HOT_PRODUCT_IDS.includes(item.id), row.isHot)
    expectEq(group, `product ${item.id}.shopUrl`, meta.NO_SHOP_PRODUCT_IDS.includes(item.id) ? null : tmallUrl, row.shopUrl)
  }

  for (const item of site.news) {
    const slug = meta.NEWS_SLUGS[item.id]
    const row = await prisma.news.findUnique({ where: { slug } })
    if (!check('2 A类', `news ${item.id} 存在`, !!row, `按 slug=${slug} 查不到`)) continue
    expectEq('2 A类', `news ${item.id}.title`, item.title, row.title)
    expectEq('2 A类', `news ${item.id}.category`, meta.NEWS_CATEGORY_SLUG[item.category], row.categorySlug)
    expectEq('2 A类', `news ${item.id}.summary`, item.summary, row.summary)
    expectEq('2 A类', `news ${item.id}.paragraphs`, item.content, row.paragraphs ?? [])
    expectEq('2 A类', `news ${item.id}.publishedAt`, item.date, row.publishedAt ? row.publishedAt.toISOString().slice(0, 10) : null)
  }

  const reviews = await prisma.review.findMany({ orderBy: { sortOrder: 'asc' } })
  site.reviews.forEach((item, index) => {
    const row = reviews[index]
    if (!check('2 A类', `review ${item.name} 存在`, !!row, '库内条数不足')) return
    expectEq('2 A类', `review[${index}].customerName`, item.name, row.customerName)
    expectEq('2 A类', `review[${index}].location`, item.location, row.location)
    expectEq('2 A类', `review[${index}].role`, item.role, row.role)
    expectEq('2 A类', `review[${index}].product`, item.product, row.product)
    expectEq('2 A类', `review[${index}].content`, item.text, row.content)
  })

  const channelTerms = channel?.terms ?? []
  site.mallLinks.forEach((item, index) => {
    const term = channelTerms[index]
    if (!check('2 A类', `shop_channel[${index}] 存在`, !!term, '库内条数不足')) return
    expectEq('2 A类', `shop_channel[${index}].name`, item.name, term.name)
    expectEq('2 A类', `shop_channel[${index}].nameEn`, item.en, term.nameEn)
    expectEq('2 A类', `shop_channel[${index}].remark`, item.desc, term.remark)
    check('2 A类', `shop_channel[${index}].url 已填`, !!term.url, `现网三张卡片写死 tmall.com，seed 需填各平台地址（${term.name}）`)
  })

  for (const [key, value] of Object.entries(site.contactInfo)) {
    const setting = await prisma.setting.findUnique({ where: { key: `contact.${key}` } })
    if (!check('2 A类', `setting contact.${key} 存在`, !!setting, '库内缺失')) continue
    expectEq('2 A类', `contact.${key}`, value, setting.value)
  }

  for (const item of SETTINGS) {
    const setting = await prisma.setting.findUnique({ where: { key: item.key } })
    if (!check('2 A类', `setting ${item.key} 存在`, !!setting, '库内缺失')) continue
    // contact.* 已被 A 类源数据覆盖比对，其余按 fixtures 的默认值核对
    if (item.group !== 'contact') expectEq('2 A类', `setting ${item.key}`, item.value, setting.value)
  }
}

// ==================== 3 B 类基线 ====================

async function verifyClassB(prisma: PrismaClient) {
  const videos = await prisma.video.findMany({ orderBy: { sortOrder: 'asc' } })
  pageConstants.media.videos.forEach((item, index) => {
    const row = videos[index]
    if (!check('3 B类', `video[${index}] 存在`, !!row, '库内条数不足')) return
    expectEq('3 B类', `video[${index}].title`, item.title, row.title)
    expectEq('3 B类', `video[${index}].duration`, item.duration, row.duration)
    expectEq('3 B类', `video[${index}].description`, item.desc, row.description)
    expectEq('3 B类', `video[${index}].poster`, meta.imageOf(item.poster), row.poster)
  })

  const honors = await prisma.honor.findMany({ orderBy: { sortOrder: 'asc' } })
  pageConstants.about.honors.forEach(([name, issuer, year], index) => {
    const row = honors[index]
    if (!check('3 B类', `honor[${index}] 存在`, !!row, '库内条数不足')) return
    expectEq('3 B类', `honor[${index}].name`, name, row.name)
    expectEq('3 B类', `honor[${index}].issuer`, issuer, row.issuer)
    expectEq('3 B类', `honor[${index}].year`, year, row.year)
  })

  const timeline = await prisma.timelineEvent.findMany({ orderBy: { sortOrder: 'asc' } })
  const byYear = [...pageConstants.about.timeline].sort((a, b) => (a.year < b.year ? -1 : 1))
  byYear.forEach((item, index) => {
    const row = timeline[index]
    if (!check('3 B类', `timeline[${index}] 存在`, !!row, '库内条数不足')) return
    expectEq('3 B类', `timeline[${index}].year`, item.year, row.year)
    expectEq('3 B类', `timeline[${index}].content`, item.text, row.content)
  })

  // 导航：header 树（含子锚点）+ footer，逐层按 label / path 比对
  const navRoots = await prisma.navMenu.findMany({
    where: { position: 'header', parentId: null },
    orderBy: { sortOrder: 'asc' },
    include: { children: { orderBy: { sortOrder: 'asc' } } },
  })
  pageConstants.navbar.navItems.forEach((item, index) => {
    const row = navRoots[index]
    if (!check('3 B类', `nav[${index}] ${item.label} 存在`, !!row, '库内缺失')) return
    expectEq('3 B类', `nav[${index}].label`, item.label, row.label)
    expectEq('3 B类', `nav[${index}].path`, item.to, row.path)
    const children: { to: string; label: string }[] = (item as any).children ?? []
    children.forEach((child, childIndex) => {
      const childRow = row.children[childIndex]
      if (!check('3 B类', `nav[${index}].children[${childIndex}] 存在`, !!childRow, '库内缺失')) return
      expectEq('3 B类', `nav[${index}].children[${childIndex}].label`, child.label, childRow.label)
      expectEq('3 B类', `nav[${index}].children[${childIndex}].path`, child.to, childRow.path)
    })
  })
  const footers = await prisma.navMenu.findMany({ where: { position: 'footer' }, orderBy: { sortOrder: 'asc' } })
  pageConstants.footer.quickLinks.forEach((item, index) => {
    const row = footers[index]
    if (!check('3 B类', `footer nav[${index}] 存在`, !!row, '库内条数不足')) return
    expectEq('3 B类', `footer nav[${index}].label`, item.label, row.label)
    expectEq('3 B类', `footer nav[${index}].path`, item.to, row.path)
  })

  // 页面装修基线：layout.ts 与库内 Page / Section / Block 全量对齐
  for (const page of meta.PAGES) {
    const saved = await prisma.page.findUnique({
      where: { key: page.key },
      include: { sections: { orderBy: { sortOrder: 'asc' }, include: { blocks: { orderBy: { sortOrder: 'asc' } } } } },
    })
    if (!check('3 B类', `page ${page.key} 存在`, !!saved, '库内缺失')) continue
    expectEq('3 B类', `page ${page.key}.name`, page.name, saved.name)
    expectEq('3 B类', `page ${page.key}.path`, page.path, saved.path)
    expectEq('3 B类', `page ${page.key}.heroTitle`, page.heroTitle, saved.heroTitle)
    expectEq('3 B类', `page ${page.key}.heroSubtitle`, page.heroSubtitle, saved.heroSubtitle)
    expectEq('3 B类', `page ${page.key}.heroEn`, page.heroEn, saved.heroEn)
    expectEq('3 B类', `page ${page.key}.heroImage`, page.heroImage, saved.heroImage)

    const expectedSections = LAYOUT[page.key] ?? []
    expectEq('3 B类', `page ${page.key}.sections.length`, expectedSections.length, saved.sections.length)
    expectedSections.forEach((section: any, index: number) => {
      const savedSection = saved.sections[index]
      const owner = `section ${page.key}.${section.anchor}`
      if (!check('3 B类', `${owner} 存在`, !!savedSection, '库内缺失')) return
      expectEq('3 B类', `${owner}.anchor`, section.anchor, savedSection.anchor)
      expectEq('3 B类', `${owner}.label`, section.label, savedSection.label)
      expectEq('3 B类', `${owner}.eyebrow`, section.eyebrow ?? null, savedSection.eyebrow)
      expectEq('3 B类', `${owner}.title`, section.title ?? null, savedSection.title)
      expectEq('3 B类', `${owner}.subtitle`, section.subtitle ?? null, savedSection.subtitle)
      expectEq('3 B类', `${owner}.variant`, section.variant ?? null, savedSection.variant)
      expectEq('3 B类', `${owner}.showInSubNav`, section.showInSubNav, savedSection.showInSubNav)
      expectEq('3 B类', `${owner}.blocks.length`, section.blocks.length, savedSection.blocks.length)

      section.blocks.forEach((block: any, blockIndex: number) => {
        const savedBlock = savedSection.blocks[blockIndex]
        const blockOwner = `${owner} / ${block.code}`
        if (!check('3 B类', `${blockOwner} 存在`, !!savedBlock, '库内缺失')) return
        expectEq('3 B类', `${blockOwner}.type`, block.type, savedBlock.type)
        expectEq('3 B类', `${blockOwner}.columns`, block.columns ?? null, savedBlock.columns)
        expectEq('3 B类', `${blockOwner}.title`, block.title ?? null, savedBlock.title)
        // 与 admin 表单同一套归一规则，保证 seed 写入的内容后台一定改得动
        expectEq('3 B类', `${blockOwner}.props`, normalizeBlockProps(block.type, block.props), savedBlock.props)
        if (block.type === 'entity_list') {
          expectEq('3 B类', `${blockOwner}.source`, block.source, savedBlock.source)
          expectEq('3 B类', `${blockOwner}.query`, normalizeEntityQuery(block.source, block.query ?? {}), savedBlock.query)
        }
      })
    })
  }

  // 素材登记
  const assets = await prisma.mediaAsset.findMany({ select: { url: true, name: true, alt: true } })
  const assetByUrl = new Map<string, any>(assets.map((asset) => [asset.url, asset]))
  for (const asset of meta.MEDIA_ASSETS) {
    const row = assetByUrl.get(asset.url)
    if (!check('3 B类', `mediaAsset ${asset.url} 存在`, !!row, '库内缺失')) continue
    expectEq('3 B类', `mediaAsset ${asset.url}.name`, asset.name, row.name)
  }
}

// ==================== 4 C 类逐字 ====================

/** 读取 app 源码指定行区间，产出三种归一化视图；返回 null 表示定位失败 */
function readSource(src: string): SourceView | null {
  const match = /^(.+?):(\d+)(?:-(\d+))?$/.exec(src)
  if (!match) return null
  const file = path.resolve(repoRoot, match[1])
  if (!existsSync(file)) return null
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  const range = lines.slice(Number(match[2]) - 1, Number(match[3] ?? match[2])).join('')
  const all = lines.join('\n')
  return {
    visible: normalizeSourceRange(range),
    attrs: normalizeSourceAttrs(range),
    whole: normalizeSourceRange(all) + normalizeSourceAttrs(all),
  }
}

interface SourceView {
  visible: string
  attrs: string
  whole: string
}

type MatchWay = 'exact' | 'contains' | 'attr' | 'derived' | 'none'
const WAY_NOTE: Record<Exclude<MatchWay, 'none'>, string> = {
  exact: '',
  contains: '源码行含标签或插值，按包含匹配',
  attr: '正文在属性值里（meta content / alt），按属性匹配',
  derived: 'derived 文案按固定片段匹配',
}

/** 优先级：完全相等 > 可见文本包含 > 属性值包含 > derived 片段包含 */
function matchWay(text: string, source: SourceView, derived: boolean): MatchWay {
  const normalized = normalizeText(text)
  if (!normalized) return 'none'
  if (normalized === source.visible) return 'exact'
  if (source.visible.includes(normalized)) return 'contains'
  if (source.attrs.includes(normalized)) return 'attr'
  if (derived) {
    const segments = segmentsOf(text)
    if (segments.length && segments.every((seg) => source.whole.includes(seg))) return 'derived'
  }
  return 'none'
}

/** withSource 为真时逐字比对 app 源码行（建站期诊断），否则只断言文案确已落库 */
async function verifyClassC(dbText: { has(text: string): boolean; hasAll(segments: string[]): boolean } | null, withSource: boolean) {
  for (const [code, item] of Object.entries(COPY as Record<string, { src: string; text: string; derived?: boolean }>)) {
    if (withSource) {
      const source = readSource(item.src)
      if (!check('4 C类', `${code} 源码定位 ${item.src}`, !!source, '文件或用行号不存在')) continue
      const way = matchWay(item.text, source as SourceView, !!item.derived)
      check(
        '4 C类',
        `${code} 与源码一致`,
        way !== 'none',
        `归一化后 期望 ${brief(item.text)} / 源码 ${brief((source as SourceView).visible || (source as SourceView).attrs)}`,
        false,
        way === 'none' ? '' : WAY_NOTE[way as Exclude<MatchWay, 'none'>],
      )
    }
    if (dbText) {
      const stored = item.derived ? dbText.hasAll(segmentsOf(item.text)) : dbText.has(normalizeText(item.text))
      check('4 C类', `${code} 已落库`, stored, '库内找不到该文案（未接线或已被覆盖）', !!item.derived, item.derived ? 'derived 按片段匹配' : '')
    }
  }
}

// ==================== 5 引用完整性 ====================

async function verifyReferences(prisma: PrismaClient) {
  const assembler = new BlockAssembler(prisma as any)
  const terms = await prisma.term.findMany({ select: { slug: true, taxonomy: { select: { key: true } } } })
  const termKeys = new Set(terms.map((term) => `${term.taxonomy.key}/${term.slug}`))

  for (const product of await prisma.product.findMany({ select: { slug: true, categorySlug: true } })) {
    check('5 引用', `product ${product.slug} 分类命中术语`, termKeys.has(`product_category/${product.categorySlug}`), `缺 Term(product_category/${product.categorySlug})`)
  }
  for (const newsRow of await prisma.news.findMany({ select: { slug: true, categorySlug: true } })) {
    check('5 引用', `news ${newsRow.slug} 分类命中术语`, termKeys.has(`news_category/${newsRow.categorySlug}`), `缺 Term(news_category/${newsRow.categorySlug})`)
  }

  const entityBlocks = await prisma.block.findMany({ where: { type: 'entity_list', status: 1 } })
  for (const block of entityBlocks) {
    const items = await assembler.resolveEntities(block.source, block.query)
    check('5 引用', `entity_list ${block.code} 可解析`, items.length > 0, `解析结果 ${items.length} 条（source=${block.source}）`)
  }

  const known = new Set((await prisma.mediaAsset.findMany({ select: { url: true } })).map((asset) => asset.url))
  const used = new Set<string>()
  for (const block of await prisma.block.findMany({ select: { props: true } })) collectImages(block.props, used)
  // 实体上的图片字段同样要可加载，否则前台就是破图（视频封面曾漏过这一层）
  for (const row of await prisma.video.findMany({ select: { poster: true } })) collectImages(row.poster, used)
  for (const row of await prisma.product.findMany({ select: { image: true, images: true } })) {
    collectImages(row.image, used)
    collectImages(row.images, used)
  }
  for (const row of await prisma.news.findMany({ select: { cover: true } })) collectImages(row.cover, used)
  for (const url of used) {
    const missing = meta.MISSING_IMAGES.some((item: any) => item.ref === url)
    check('5 引用', `图片 ${url} 已登记`, known.has(url) || missing, missing ? '源码引用但文件缺失，已记 MISSING' : '未登记且非已知缺失')
  }
}

function collectImages(value: unknown, out: Set<string>) {
  if (typeof value === 'string') {
    if (value.startsWith('/images/') || value.startsWith('/uploads/')) out.add(value)
    return
  }
  if (Array.isArray(value)) return value.forEach((row) => collectImages(row, out))
  if (value && typeof value === 'object') return Object.values(value).forEach((row) => collectImages(row, out))
}

// ==================== 报告 ====================

function renderMarkdown(counts: { pass: number; soft: number; fail: number }): string {
  const groups = [...new Set(rows.map((row) => row.group))]
  const lines = [
    '# seed 保真校验报告',
    '',
    `> 由 \`scripts/verify-seed.mts\` 生成于 ${new Date().toISOString()}，请勿手工编辑。`,
    `> 模式：${fixturesOnly ? '仅校验 fixtures 与 app 源码（--fixtures-only，未连库）' : '连接数据库全量校验'}`,
    '',
    `- PASS ${counts.pass}　SOFT ${counts.soft}　FAIL ${counts.fail}`,
    '',
    '| 分组 | 通过 | 宽松 | 失败 |',
    '|---|---|---|---|',
  ]
  for (const group of groups) {
    const list = rows.filter((row) => row.group === group)
    lines.push(
      `| ${group} | ${list.filter((row) => row.level === 'PASS').length}/${list.length} | ${list.filter((row) => row.level === 'SOFT').length} | ${list.filter((row) => row.level === 'FAIL').length} |`,
    )
  }
  lines.push('', '## 条数基线', '', '| 模型 | 期望 / 实际 | 结果 |', '|---|---|---|')
  for (const row of rows.filter((item) => item.group === '1 条数')) {
    lines.push(`| ${row.item} | ${row.pair ?? ''} | ${row.level} |`)
  }
  lines.push('', '## 差异与非通过项（含带说明的通过项）', '', '| 分组 | 校验项 | 结果 | 期望 / 实际 | 说明 |', '|---|---|---|---|---|')
  const interesting = rows.filter((row) => row.group !== '1 条数' && (row.level !== 'PASS' || row.detail))
  for (const row of interesting) {
    lines.push(`| ${row.group} | ${row.item} | ${row.level} | ${(row.pair ?? '').replace(/\|/g, '\\|')} | ${row.detail.replace(/\|/g, '\\|')} |`)
  }
  if (!interesting.length) lines.push('| - | 无差异 | PASS | | |')
  lines.push('', '## 待补素材（MISSING）', '')
  for (const item of meta.MISSING_IMAGES as { ref: string; placeholder: string; usedBy: string }[]) {
    lines.push(`- \`${item.ref}\`（${item.usedBy}）：源码引用但 apps/app/public/images 下不存在，落库改用 \`${item.placeholder}\`，待素材到位后由后台素材库替换。`)
  }
  lines.push('', '## 待确认占位值（TODO）', '')
  for (const item of meta.SEED_TODOS as { item: string; note: string }[]) {
    lines.push(`- ${item.item}：${item.note}`)
  }
  lines.push('', '## 说明', '')
  lines.push('- `SOFT` 为已确认的预期差异（如 derived 文案按片段匹配），不阻塞；`FAIL` 需修复后重跑 `pnpm db:init`。')
  lines.push(
    `- C 类的 app 源码逐字比对当前${APP_SOURCE_GATE ? '开启' : '关闭（前台已切换为区块驱动，原文真源已是 fixtures/copy.ts）'}，`
      + '显式跑一次用 `pnpm db:verify -- --fixtures-only`；该模式比对的是源码里已不存在的原文，'
      + '其 FAIL 不作为交付闸门。',
  )
  lines.push('- 归一化规则：去 JSX 标签与注释、就地取出 `{"…"}` 表达式正文、统一全角引号、去除全部空白。')
  lines.push('- C 类匹配优先级：可见文本完全相等 > 可见文本包含 > 属性值包含 > derived 片段包含；靠后三者通过的已在说明里标明匹配方式。')
  lines.push('')
  return lines.join('\n')
}

function printSummary(counts: { pass: number; soft: number; fail: number }) {
  console.log('\n============ seed 保真校验 ============')
  const groups = [...new Set(rows.map((row) => row.group))]
  for (const group of groups) {
    const list = rows.filter((row) => row.group === group)
    const failed = list.filter((row) => row.level !== 'PASS')
    console.log(`${failed.length ? 'FAIL' : 'OK  '} ${group.padEnd(10)} ${list.length - failed.length}/${list.length} 通过`)
    for (const row of failed.slice(0, 12)) console.log(`       - [${row.level}] ${row.item}${row.detail ? ` :: ${row.detail}` : ''}`)
    if (failed.length > 12) console.log(`       … 其余 ${failed.length - 12} 条见 seed-report.md`)
  }
  console.log(`\n合计 PASS ${counts.pass} / SOFT ${counts.soft} / FAIL ${counts.fail}`)
  console.log(`报告：${reportFile}`)
  console.log('======================================\n')
}

// ==================== 入口 ====================

async function main() {
  if (fixturesOnly) {
    await verifyClassC(null, true)
  } else {
    const file = loadEnvFile(serverRoot)
    if (!file) console.warn('[verify] 未找到 .env，直接使用进程环境变量')
    const prisma = new PrismaClient()
    try {
      await verifyCounts(prisma)
      await verifyClassA(prisma)
      await verifyClassB(prisma)
      const strings = new Set<string>()
      for (const model of Object.values(DELEGATES)) {
        for (const row of await (prisma as any)[model].findMany()) collectStrings(row, strings)
      }
      await verifyClassC(
        {
          has: (text) => strings.has(text),
          hasAll: (segments) => segments.every((seg) => [...strings].some((value) => value.includes(seg))),
        },
        APP_SOURCE_GATE,
      )
      await verifyReferences(prisma)
    } finally {
      await prisma.$disconnect()
    }
  }

  const counts = {
    pass: rows.filter((row) => row.level === 'PASS').length,
    soft: rows.filter((row) => row.level === 'SOFT').length,
    fail: rows.filter((row) => row.level === 'FAIL').length,
  }
  writeFileSync(reportFile, renderMarkdown(counts), 'utf8')
  printSummary(counts)
  if (counts.fail) {
    console.error(`保真校验未通过：${counts.fail} 项 FAIL`)
    process.exitCode = 1
  }
}

/** 把库里所有字符串归一化后收进集合，供 C 类文案存在性检查 */
function collectStrings(value: unknown, out: Set<string>) {
  if (typeof value === 'string') {
    const normalized = normalizeText(value)
    if (normalized) out.add(normalized)
    return
  }
  if (value instanceof Date) return
  if (Array.isArray(value)) return value.forEach((row) => collectStrings(row, out))
  if (value && typeof value === 'object') return Object.values(value).forEach((row) => collectStrings(row, out))
}

main()
  .catch((err) => {
    console.error('[verify] 执行失败：', err)
    process.exitCode = 1
  })
