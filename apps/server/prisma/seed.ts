/**
 * 静态内容初始化导入（规划第 10 节）。
 *
 * - 唯一数据源为 prisma/fixtures/*，不读 app/ 目录；
 * - 只搬运不加工：A/B 类取自抽取产物，C 类经 copyText 取，D 类来自 meta.ts；
 * - 全程 upsert，可对空库重跑两次结果一致，且不覆盖后台改过的密码 / 控件类型；
 * - 末尾做条数断言与引用完整性检查，不通过以非 0 退出。
 *
 * 执行：npx prisma db seed（或 pnpm db:init）
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { PERMISSIONS, PRESET_ROLES } from '../src/common/constants/permissions'
import { SETTINGS } from '../src/common/constants/settings'
import { hashPassword } from '../src/common/utils/password.util'
import { normalizeBlockProps, normalizeEntityQuery } from '../src/modules/page/block.util'
import { COPY, copyText } from './fixtures/copy'
import { EXPECTED_COUNTS } from './fixtures/expected'
import { LAYOUT, LAYOUT_STATS } from './fixtures/layout'
import {
  ADMIN_NAME,
  ADMIN_USERNAME,
  FEATURED_PRODUCT_IDS,
  HONOR_CODES,
  HOT_PRODUCT_IDS,
  LOCALES,
  MEDIA_ASSETS,
  MISSING_IMAGES,
  NEWS_CATEGORY_SLUG,
  NEWS_SLUGS,
  NO_SHOP_PRODUCT_IDS,
  PAGES,
  PRODUCT_CATEGORY_SLUG,
  REVIEW_CODES,
  ROOT_ORG,
  TAXONOMIES,
  THEMES,
  UI_SETTING_COPY,
  VIDEO_CODES,
  imageOf,
  navKeyCode,
  timelineCode,
} from './fixtures/meta'
import { pageConstants } from './fixtures/pages'

const prisma = new PrismaClient()

const siteFixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'site.json'), 'utf-8')) as {
  products: any[]
  news: any[]
  reviews: any[]
  mallLinks: any[]
  contactInfo: Record<string, string>
}

interface ReportRow {
  model: string
  expected: number
  actual: number
  notes?: string
}
const report: ReportRow[] = []
const warnings: string[] = []

function push(model: string, expected: number, actual: number, notes?: string) {
  report.push({ model, expected, actual, notes })
}

/** 期望条数：与 verify-seed.mts 共用 fixtures/expected.ts 这一份基线 */
const EXPECT = EXPECTED_COUNTS

const PUBLISHED = 1

/** fixtures/pages.ts 里导航常量的只读视图（顶层项无 children，子项有） */
interface NavSeed {
  readonly to: string
  readonly label: string
  readonly children?: readonly { readonly to: string; readonly label: string }[]
}

// ==================== 1-4 权限 / 角色 / 组织 / 用户 ====================

async function seedPermissions() {
  for (const item of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key: item.key }, update: { name: item.name, group: item.group }, create: item })
  }
  return prisma.permission.count()
}

async function seedRoles() {
  const permissions = await prisma.permission.findMany({ select: { id: true, key: true } })
  const byKey = new Map<string, string>(permissions.map((p) => [p.key, p.id] as [string, string]))

  let order = 0
  for (const role of PRESET_ROLES) {
    order += 1
    const saved = await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name, remark: role.remark, sortOrder: order, status: PUBLISHED },
      create: { key: role.key, name: role.name, remark: role.remark, sortOrder: order, status: PUBLISHED },
    })
    const keys = role.permissions[0] === '*' ? permissions.map((p) => p.key) : role.permissions
    const ids: string[] = []
    for (const key of keys) {
      const id = byKey.get(key)
      if (!id) {
        warnings.push(`角色 ${role.key} 引用了未登记的权限点 ${key}`)
        continue
      }
      ids.push(id)
    }
    // 全量重建关联，保证改 PRESET_ROLES 后重跑能收敛
    await prisma.rolePermission.deleteMany({ where: { roleId: saved.id } })
    if (ids.length) {
      await prisma.rolePermission.createMany({ data: ids.map((permissionId) => ({ roleId: saved.id, permissionId })) })
    }
  }
  return prisma.role.count()
}

async function seedOrgs() {
  await prisma.org.upsert({
    where: { code: ROOT_ORG.code },
    update: { name: ROOT_ORG.name, status: PUBLISHED },
    create: { name: ROOT_ORG.name, code: ROOT_ORG.code, leader: ADMIN_NAME, sortOrder: 1, status: PUBLISHED },
  })
  return prisma.org.count()
}

async function seedUsers() {
  const org = await prisma.org.findUnique({ where: { code: ROOT_ORG.code } })
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@123456'
  // update 分支不含 passwordHash：重跑 seed 不能把后台改过的密码重置回去（规划 10.7）
  const user = await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: { name: ADMIN_NAME, status: PUBLISHED, orgId: org?.id ?? null },
    create: {
      username: ADMIN_USERNAME,
      passwordHash: hashPassword(password),
      name: ADMIN_NAME,
      remark: 'seed 创建的超级管理员',
      status: PUBLISHED,
      orgId: org?.id ?? null,
    },
  })
  if (!process.env.SEED_ADMIN_PASSWORD) {
    warnings.push(`超级管理员密码使用缺省值 Admin@123456，生产环境请通过 SEED_ADMIN_PASSWORD 指定`)
  }
  const role = await prisma.role.findUnique({ where: { key: 'super_admin' } })
  if (role) {
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: {}, create: { userId: user.id, roleId: role.id } })
  }
  return prisma.user.count()
}

// ==================== 5 分类与术语 ====================

async function seedTaxonomies() {
  let taxOrder = 0
  for (const tax of TAXONOMIES) {
    taxOrder += 1
    const saved = await prisma.taxonomy.upsert({
      where: { key: tax.key },
      update: { name: tax.name, remark: tax.remark, sortOrder: taxOrder },
      create: { key: tax.key, name: tax.name, remark: tax.remark, sortOrder: taxOrder },
    })
    for (const term of tax.terms) {
      await prisma.term.upsert({
        where: { taxonomyId_slug: { taxonomyId: saved.id, slug: term.slug } },
        update: { name: term.name, nameEn: term.nameEn ?? null, anchor: term.anchor ?? null, url: term.url ?? null, remark: term.remark ?? null, sortOrder: term.sortOrder, status: PUBLISHED },
        create: {
          taxonomyId: saved.id,
          slug: term.slug,
          name: term.name,
          nameEn: term.nameEn ?? null,
          anchor: term.anchor ?? null,
          url: term.url ?? null,
          remark: term.remark ?? null,
          sortOrder: term.sortOrder,
          status: PUBLISHED,
        },
      })
    }
  }
  return prisma.taxonomy.count()
}

/** 供 Product.shopUrl 取用：商城渠道术语的 slug -> url */
async function shopUrls(): Promise<Map<string, string | null>> {
  const tax = await prisma.taxonomy.findUnique({ where: { key: 'shop_channel' }, include: { terms: true } })
  return new Map((tax?.terms ?? []).map((term) => [term.slug, term.url]))
}

// ==================== 6 站点配置 ====================

async function seedSettings() {
  const sortIndexOf = new Map<string, number>()
  const nextSort = (group: string) => {
    const current = sortIndexOf.get(group) ?? 0
    sortIndexOf.set(group, current + 10)
    return current
  }

  for (const item of SETTINGS) {
    const sortOrder = nextSort(item.group)
    await prisma.setting.upsert({
      where: { key: item.key },
      // 规划 10.7：update 只写 value/label/sortOrder，不写 type，避免覆盖运营调整过的控件类型
      update: { value: item.value as any, label: item.label, sortOrder },
      create: { key: item.key, group: item.group, type: item.type, label: item.label, remark: item.remark ?? null, value: item.value as any, sortOrder },
    })
  }

  for (const item of UI_SETTING_COPY) {
    const sortOrder = nextSort(item.group)
    const value = copyText(item.code)
    await prisma.setting.upsert({
      where: { key: item.key },
      update: { value: value as any, label: item.label, sortOrder },
      create: { key: item.key, group: item.group, type: item.type, label: item.label, remark: `取自 ${COPY[item.code].src}`, value: value as any, sortOrder },
    })
  }
  return prisma.setting.count()
}

// ==================== 7 主题与语言 ====================

async function seedThemes() {
  for (const theme of THEMES) {
    await prisma.theme.upsert({
      where: { code: theme.code },
      update: { name: theme.name, tokens: theme.tokens as any, isDefault: theme.isDefault, active: theme.active, remark: theme.remark },
      create: {
        code: theme.code,
        name: theme.name,
        tokens: theme.tokens as any,
        isDefault: theme.isDefault,
        active: theme.active,
        remark: theme.remark,
      },
    })
  }
  // 同一时刻只保留一个 active / isDefault（后台的 activate 接口同样依赖这一约束）
  const first = THEMES.find((theme) => theme.active)
  await prisma.theme.updateMany({ where: { NOT: { code: first?.code ?? '' } }, data: { active: false } })
  const defaultTheme = THEMES.find((theme) => theme.isDefault)
  await prisma.theme.updateMany({ where: { NOT: { code: defaultTheme?.code ?? '' } }, data: { isDefault: false } })
  return prisma.theme.count()
}

async function seedLocales() {
  for (const locale of LOCALES) {
    await prisma.locale.upsert({
      where: { code: locale.code },
      update: {
        name: locale.name,
        nativeName: locale.nativeName,
        isDefault: locale.isDefault,
        active: locale.active,
        sortOrder: locale.sortOrder,
      },
      create: locale,
    })
  }
  const active = LOCALES.filter((locale) => locale.active).map((locale) => locale.code)
  const defaults = LOCALES.filter((locale) => locale.isDefault).map((locale) => locale.code)
  await prisma.locale.updateMany({ where: { code: { notIn: active } }, data: { active: false } })
  await prisma.locale.updateMany({ where: { code: { notIn: defaults } }, data: { isDefault: false } })
  return prisma.locale.count()
}

// ==================== 8 导航栏目 ====================

async function seedNavMenus() {
  let count = 0
  const save = async (data: {
    navKey: string
    position: string
    label: string
    path: string
    sortOrder: number
    parentId?: string | null
  }) => {
    const saved = await prisma.navMenu.upsert({
      where: { navKey: data.navKey },
      update: {
        position: data.position,
        label: data.label,
        path: data.path,
        sortOrder: data.sortOrder,
        parentId: data.parentId ?? null,
        status: PUBLISHED,
      },
      create: {
        navKey: data.navKey,
        position: data.position,
        label: data.label,
        path: data.path,
        sortOrder: data.sortOrder,
        parentId: data.parentId ?? null,
        status: PUBLISHED,
      },
    })
    count += 1
    return saved
  }

  let order = 0
  for (const item of pageConstants.navbar.navItems as readonly NavSeed[]) {
    order += 1
    const parent = await save({ navKey: navKeyCode('header', item.to), position: 'header', label: item.label, path: item.to, sortOrder: order })
    let childOrder = 0
    for (const child of item.children ?? []) {
      childOrder += 1
      await save({
        navKey: navKeyCode('header', child.to, parent.navKey ?? undefined),
        position: 'header',
        label: child.label,
        path: child.to,
        sortOrder: childOrder,
        parentId: parent.id,
      })
    }
  }

  let footerOrder = 0
  for (const item of pageConstants.footer.quickLinks) {
    footerOrder += 1
    await save({ navKey: navKeyCode('footer', item.to), position: 'footer', label: item.label, path: item.to, sortOrder: footerOrder })
  }

  return count
}

// ==================== 9 产品与新闻 ====================

async function seedProducts() {
  const urls = await shopUrls()
  const tmall = urls.get('tmall') ?? null
  let order = 0
  for (const item of siteFixtures.products) {
    order += 1
    const categorySlug = PRODUCT_CATEGORY_SLUG[item.category]
    if (!categorySlug) warnings.push(`产品 ${item.id} 的分类「${item.category}」未在 PRODUCT_CATEGORY_SLUG 中登记`)
    const data = {
      legacyId: item.id,
      name: item.name,
      nameEn: item.en,
      categorySlug: categorySlug ?? item.category,
      tag: item.tag ?? null,
      tagline: item.tagline ?? null,
      summary: item.tagline ?? null,
      description: item.description ?? null,
      image: item.image ?? null,
      params: (item.params ?? []) as any,
      certs: (item.certs ?? []) as any,
      features: (item.features ?? []) as any,
      audiences: (item.audiences ?? []) as any,
      spec: item.spec ?? null,
      usage: item.usage ?? null,
      shopUrl: NO_SHOP_PRODUCT_IDS.includes(item.id) ? null : tmall,
      isFeatured: FEATURED_PRODUCT_IDS.includes(item.id),
      isHot: HOT_PRODUCT_IDS.includes(item.id),
      sortOrder: order,
      status: PUBLISHED,
    }
    await prisma.product.upsert({ where: { slug: item.id }, update: data, create: { slug: item.id, ...data } })
  }
  return prisma.product.count()
}

async function seedNews() {
  const rows = [...siteFixtures.news]
  // 现网按 date 倒序展示，sortOrder 按该顺序赋 1..n（规划 10.6）
  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  let order = 0
  for (const item of rows) {
    order += 1
    const categorySlug = NEWS_CATEGORY_SLUG[item.category]
    if (!categorySlug) warnings.push(`新闻 ${item.id} 的分类「${item.category}」未在 NEWS_CATEGORY_SLUG 中登记`)
    const slug = NEWS_SLUGS[item.id]
    if (!slug) warnings.push(`新闻 ${item.id} 缺少 NEWS_SLUGS 映射`)
    const data = {
      legacyId: item.id,
      title: item.title,
      categorySlug: categorySlug ?? item.category,
      summary: item.summary ?? null,
      paragraphs: (item.content ?? []) as any,
      publishedAt: item.date ? new Date(`${item.date}T00:00:00.000Z`) : null,
      sortOrder: order,
      status: PUBLISHED,
    }
    await prisma.news.upsert({ where: { slug: slug ?? item.id }, update: data, create: { slug: slug ?? item.id, ...data } })
  }
  return prisma.news.count()
}

// ==================== 10 视频 / 口碑 / 荣誉 / 大事记 ====================

async function seedVideos() {
  const list = pageConstants.media.videos
  if (list.length !== VIDEO_CODES.length) throw new Error(`VIDEO_CODES 长度(${VIDEO_CODES.length})与视频条数(${list.length})不一致`)
  let order = 0
  for (const item of list) {
    order += 1
    const data = {
      title: item.title,
      duration: item.duration,
      description: item.desc,
      // 规划 §2：lab.jpg 等源码引用但文件不存在的图，一律换为占位图落库，seed-report 标 MISSING 待运营替换
      poster: imageOf(item.poster),
      sortOrder: order,
      status: PUBLISHED,
    }
    await prisma.video.upsert({ where: { code: VIDEO_CODES[order - 1] }, update: data, create: { code: VIDEO_CODES[order - 1], ...data } })
  }
  return prisma.video.count()
}

async function seedReviews() {
  const list = siteFixtures.reviews
  if (list.length !== REVIEW_CODES.length) throw new Error(`REVIEW_CODES 长度(${REVIEW_CODES.length})与口碑条数(${list.length})不一致`)
  let order = 0
  for (const item of list) {
    order += 1
    const data = {
      customerName: item.name,
      location: item.location ?? null,
      role: item.role ?? null,
      product: item.product ?? null,
      content: item.text,
      isAuthorized: true,
      sortOrder: order,
      status: PUBLISHED,
    }
    await prisma.review.upsert({ where: { code: REVIEW_CODES[order - 1] }, update: data, create: { code: REVIEW_CODES[order - 1], ...data } })
  }
  return prisma.review.count()
}

async function seedHonors() {
  const list = pageConstants.about.honors
  if (list.length !== HONOR_CODES.length) throw new Error(`HONOR_CODES 长度(${HONOR_CODES.length})与荣誉条数(${list.length})不一致`)
  let order = 0
  for (const [name, issuer, year] of list) {
    order += 1
    const data = { name, issuer, year, sortOrder: order, status: PUBLISHED }
    await prisma.honor.upsert({ where: { code: HONOR_CODES[order - 1] }, update: data, create: { code: HONOR_CODES[order - 1], ...data } })
  }
  return prisma.honor.count()
}

async function seedTimeline() {
  const list = [...pageConstants.about.timeline].sort((a, b) => (a.year < b.year ? -1 : a.year > b.year ? 1 : 0))
  let order = 0
  for (const item of list) {
    order += 1
    const code = timelineCode(item.year)
    const data = { year: item.year, content: item.text, sortOrder: order, status: PUBLISHED }
    await prisma.timelineEvent.upsert({ where: { code }, update: data, create: { code, ...data } })
  }
  return prisma.timelineEvent.count()
}

// ==================== 11 页面 / 区块 ====================

async function seedPagesAndBlocks() {
  for (const page of PAGES) {
    const saved = await prisma.page.upsert({
      where: { key: page.key },
      update: {
        name: page.name,
        path: page.path,
        heroTitle: page.heroTitle ?? null,
        heroSubtitle: page.heroSubtitle ?? null,
        heroEn: page.heroEn ?? null,
        heroImage: page.heroImage ?? null,
        status: PUBLISHED,
      },
      create: {
        key: page.key,
        name: page.name,
        path: page.path,
        heroTitle: page.heroTitle ?? null,
        heroSubtitle: page.heroSubtitle ?? null,
        heroEn: page.heroEn ?? null,
        heroImage: page.heroImage ?? null,
        status: PUBLISHED,
      },
    })

    const sections = LAYOUT[page.key] ?? []
    let sectionOrder = 0
    for (const section of sections) {
      sectionOrder += 1
      const sectionData = {
        label: section.label,
        eyebrow: section.eyebrow ?? null,
        title: section.title ?? null,
        subtitle: section.subtitle ?? null,
        variant: section.variant ?? null,
        showInSubNav: section.showInSubNav,
        sortOrder: sectionOrder,
        status: PUBLISHED,
      }
      const savedSection = await prisma.section.upsert({
        where: { pageId_anchor: { pageId: saved.id, anchor: section.anchor } },
        update: sectionData,
        create: { pageId: saved.id, anchor: section.anchor, ...sectionData },
      })

      let blockOrder = 0
      for (const block of section.blocks) {
        blockOrder += 1
        const props = normalizeBlockProps(block.type, block.props)
        const isEntity = block.type === 'entity_list'
        const query = isEntity ? normalizeEntityQuery(block.source, block.query ?? {}) : undefined
        const data = {
          type: block.type,
          title: block.title ?? null,
          props: props as any,
          columns: block.columns ?? null,
          theme: ({ texture: !!section.texture, ...(block.theme ?? {}) } as any),
          source: isEntity ? block.source ?? null : null,
          query: isEntity ? (query as any) : null,
          sortOrder: blockOrder,
          status: PUBLISHED,
        }
        await prisma.block.upsert({
          where: { sectionId_code: { sectionId: savedSection.id, code: block.code } },
          update: data,
          create: { sectionId: savedSection.id, code: block.code, ...data },
        })
      }
    }
  }
  return prisma.block.count()
}

// ==================== 12 素材 ====================

async function seedMediaAssets() {
  for (const asset of MEDIA_ASSETS) {
    const ext = path.extname(asset.url).slice(1)
    const data = { name: asset.name, alt: asset.alt, mime: ext ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : null, folder: '/images' }
    await prisma.mediaAsset.upsert({
      where: { url: asset.url },
      // update 不写 size/width/height：这些由上传接口回填，seed 无从得知也不该清零
      update: data,
      create: { url: asset.url, ...data },
    })
  }
  return prisma.mediaAsset.count()
}

// ==================== 13 断言 ====================

async function assertReferences() {
  const problems: string[] = []

  const terms = await prisma.term.findMany({ select: { slug: true, taxonomy: { select: { key: true } } } })
  const termKeys = new Set(terms.map((term) => `${term.taxonomy.key}/${term.slug}`))
  const products = await prisma.product.findMany({ select: { slug: true, categorySlug: true } })
  for (const product of products) {
    if (!termKeys.has(`product_category/${product.categorySlug}`)) problems.push(`产品 ${product.slug} 的分类 ${product.categorySlug} 无对应术语`)
  }
  const news = await prisma.news.findMany({ select: { slug: true, categorySlug: true } })
  for (const item of news) {
    if (!termKeys.has(`news_category/${item.categorySlug}`)) problems.push(`新闻 ${item.slug} 的分类 ${item.categorySlug} 无对应术语`)
  }

  const blocks = await prisma.block.findMany({ where: { type: 'entity_list', status: PUBLISHED }, select: { code: true, source: true, query: true } })
  for (const block of blocks) {
    const found = await resolveForCheck(block.source, block.query)
    if (!found) problems.push(`entity_list 区块 ${block.code} 查询不到数据（source=${block.source}）`)
  }

  const usedImages = new Set<string>()
  const galleryBlocks = await prisma.block.findMany({ where: { type: { in: ['gallery', 'image_text', 'image_split', 'hero_slider', 'map_sketch'] } }, select: { props: true } })
  for (const row of galleryBlocks) collectImages(row.props, usedImages)
  for (const missing of MISSING_IMAGES) usedImages.add(missing.ref)
  const assets = await prisma.mediaAsset.findMany({ select: { url: true } })
  const known = new Set(assets.map((asset) => asset.url))
  for (const url of usedImages) {
    if (!known.has(url) && !missingUrl(url)) problems.push(`区块引用了未登记的图片 ${url}`)
  }
  return problems
}

function collectImages(value: unknown, out: Set<string>) {
  if (typeof value === 'string') {
    if (value.startsWith('/images/') || value.startsWith('/uploads/')) out.add(value)
    return
  }
  if (Array.isArray(value)) return value.forEach((row) => collectImages(row, out))
  if (value && typeof value === 'object') return Object.values(value).forEach((row) => collectImages(row, out))
}

const missingUrl = (url: string) => MISSING_IMAGES.some((item) => item.ref === url)

/** 轻量解析一次 entity_list，用于断言引用可解析（与 BlockAssembler 同规则） */
async function resolveForCheck(source: string | null, query: unknown): Promise<boolean> {
  if (!source) return false
  const input = (query ?? {}) as Record<string, any>
  const rawWhere = (input.where ?? {}) as Record<string, any>
  const take = Math.min(60, Math.max(1, Number(input.limit) || 6))
  const DELEGATE: Record<string, string> = {
    product: 'product',
    news: 'news',
    video: 'video',
    review: 'review',
    honor: 'honor',
    timeline: 'timelineEvent',
  }
  try {
    if (source === 'term') {
      const group = await prisma.taxonomy.findUnique({ where: { key: String(rawWhere.taxonomy ?? '') } })
      if (!group) return false
      const rows = await prisma.term.findMany({ where: { taxonomyId: group.id, status: PUBLISHED }, take })
      return rows.length > 0
    }
    const where: Record<string, any> = { status: PUBLISHED }
    for (const key of ['categorySlug', 'isFeatured', 'isHot', 'isTop', 'isAuthorized']) {
      if (rawWhere[key] !== undefined) where[key] = rawWhere[key]
    }
    const delegate = (prisma as any)[DELEGATE[source] ?? '']
    if (!delegate) return false
    const rows = await delegate.findMany({ where, take })
    return rows.length > 0
  } catch (err) {
    warnings.push(`entity_list 断言执行失败：${(err as Error).message}`)
    return false
  }
}

async function countAll() {
  return {
    Permission: await prisma.permission.count(),
    Role: await prisma.role.count(),
    Org: await prisma.org.count(),
    User: await prisma.user.count(),
    Taxonomy: await prisma.taxonomy.count(),
    Term: await prisma.term.count(),
    Setting: await prisma.setting.count(),
    Theme: await prisma.theme.count(),
    Locale: await prisma.locale.count(),
    NavMenu: await prisma.navMenu.count(),
    Product: await prisma.product.count(),
    News: await prisma.news.count(),
    Video: await prisma.video.count(),
    Review: await prisma.review.count(),
    Honor: await prisma.honor.count(),
    TimelineEvent: await prisma.timelineEvent.count(),
    Page: await prisma.page.count(),
    Section: await prisma.section.count(),
    Block: await prisma.block.count(),
    MediaAsset: await prisma.mediaAsset.count(),
  } as Record<string, number>
}

// ==================== 入口 ====================

async function main() {
  const steps: [string, () => Promise<number>][] = [
    ['Permission', seedPermissions],
    ['Role', seedRoles],
    ['Org', seedOrgs],
    ['User', seedUsers],
    ['Taxonomy', seedTaxonomies],
    ['Setting', seedSettings],
    ['Theme', seedThemes],
    ['Locale', seedLocales],
    ['NavMenu', seedNavMenus],
    ['Product', seedProducts],
    ['News', seedNews],
    ['Video', seedVideos],
    ['Review', seedReviews],
    ['Honor', seedHonors],
    ['TimelineEvent', seedTimeline],
    ['Page', seedPagesAndBlocks],
    ['MediaAsset', seedMediaAssets],
  ]

  const startedAt = Date.now()
  for (const [name, fn] of steps) {
    const actual = await fn()
    push(name, EXPECT[name] ?? actual, actual)
  }

  // 步骤里返回的计数有合并（Taxonomy / Page），这里统一按全表复核一遍
  const totals = await countAll()
  for (const row of report) row.actual = totals[row.model] ?? row.actual
  // Term 随 Taxonomy、Section 随 Page 一起写入，没有独立步骤，这里补齐断言行并保持拓扑顺序
  const order = Object.keys(EXPECT)
  for (const model of order) {
    if (!report.some((row) => row.model === model)) report.push({ model, expected: EXPECT[model], actual: totals[model] ?? 0 })
  }
  report.sort((a, b) => order.indexOf(a.model) - order.indexOf(b.model))

  const problems = await assertReferences()
  const failures = report.filter((row) => row.actual !== row.expected)

  console.log('\n================ seed 结果 ================')
  for (const row of report) {
    const flag = row.actual === row.expected ? 'OK  ' : 'FAIL'
    console.log(`${flag} ${row.model.padEnd(14)} 期望 ${String(row.expected).padStart(3)}  实际 ${String(row.actual).padStart(3)}`)
  }
  console.log(`\nPage/Section/Block 分布：${Object.entries(LAYOUT_STATS.byPage)
    .map(([page, stat]) => `${page} ${stat.sections}/${stat.blocks}`)
    .join('、')}`)
  for (const item of MISSING_IMAGES) console.log(`MISSING 引用图片 ${item.ref}（${item.usedBy}）已用占位图 ${imageOf(item.ref)} 落库，待补素材`)
  for (const warning of warnings) console.log(`WARN  ${warning}`)
  for (const problem of problems) console.log(`REF   ${problem}`)
  console.log(`\n耗时 ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
  console.log('===========================================\n')

  if (failures.length) {
    console.error(`seed 条数断言失败：${failures.map((row) => `${row.model}(${row.actual}/${row.expected})`).join('、')}`)
    process.exitCode = 1
    return
  }
  if (problems.length) {
    console.error(`seed 引用完整性断言失败：\n - ${problems.join('\n - ')}`)
    process.exitCode = 1
  }
}

main()
  .catch((err) => {
    console.error('seed 失败：', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
