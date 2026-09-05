/**
 * 生成 app 前台的静态兜底快照 `app/src/data/fallback.ts`（规划 §7.2 / §13）。
 *
 * 为什么导库而不是手抄：兜底数据的唯一价值是「后端挂了前台也不白屏」，
 * 手工维护一份等价数据必然与库内容漂移。这里直接复用 PublicService 的真实实现
 * 取 bootstrap / 六个列表 / 八个页面（含已解析的 entity_list），快照与接口逐字一致。
 *
 * 执行：pnpm db:fallback               连库导出（需先 pnpm db:init）
 *       pnpm db:fallback -- --check     只比对不写盘，有差异以非 0 退出（供 CI 用）
 *       pnpm db:fallback -- --app-dir=../../apps/app
 *
 * 注意：视图计数（news.views）等运行期字段会随时间变化，属预期的 diff 噪音。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(scriptsDir, '..')
const load = (rel: string): Promise<any> => import(pathToFileURL(path.resolve(serverRoot, rel)).href) as Promise<any>

const args = process.argv.slice(2)
const argValue = (name: string): string | undefined =>
  args.find((item) => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const hasFlag = (name: string): boolean => args.includes(`--${name}`)

const appDir = path.resolve(serverRoot, argValue('app-dir') ?? '../../apps/app')
const outFile = path.resolve(appDir, 'src/data/fallback.ts')

/** public 路由片段与后台资源 key 的少量不一致，以对外契约为准 */
const PUBLIC_ROUTE: Record<string, string> = { 'timeline-events': 'timeline' }

/** 一次导齐，前台分类筛选与搜索都不必再发请求 */
const LIST_PAGE_SIZE = 100

/** 供结尾统一断库 */
let prismaRef: { $disconnect(): Promise<unknown> } | null = null

async function main() {
  const { loadEnvFile } = await load('src/common/utils/env.util.ts')
  if (!loadEnvFile(serverRoot)) console.warn('[fallback] 未找到 .env，直接使用进程环境变量')

  const { PrismaService } = await load('src/common/prisma/prisma.service.ts')
  const { AuditService } = await load('src/common/audit/audit.service.ts')
  const { SettingService } = await load('src/modules/site/setting.service.ts')
  const { ThemeService } = await load('src/modules/site/theme.service.ts')
  const { LocaleService } = await load('src/modules/site/locale.service.ts')
  const { NavService } = await load('src/modules/navigation/nav.service.ts')
  const { TaxonomyService } = await load('src/modules/taxonomy/taxonomy.service.ts')
  const { ContentService } = await load('src/modules/content/content.service.ts')
  const { CONTENT_RESOURCES } = await load('src/modules/content/content.registry.ts')
  const { BlockAssembler } = await load('src/modules/page/block-assembler.service.ts')
  const { PageService } = await load('src/modules/page/page.service.ts')
  const { PublicService } = await load('src/modules/public/public.service.ts')
  const { PublicCacheService } = await load('src/modules/public/public-cache.service.ts')

  const prisma = new PrismaService() as any
  prismaRef = prisma
  // 补上 WAL / busy_timeout，避免与正在写库的后台进程抢锁
  await prisma.onModuleInit()
  const locales = new LocaleService(prisma)
  const services = {
    settings: new SettingService(prisma),
    themes: new ThemeService(prisma),
    locales,
    nav: new NavService(prisma),
    taxonomy: new TaxonomyService(prisma),
    content: new ContentService(prisma, new AuditService(prisma)),
    pages: new PageService(prisma, new BlockAssembler(prisma), locales),
    // 导出走直通，不读也不写缓存
    cache: new PublicCacheService(),
  }
  const publicService = new PublicService(
    services.settings,
    services.themes,
    services.locales,
    services.nav,
    services.taxonomy,
    services.content,
    services.pages,
    services.cache,
  )

  const bootstrap = await publicService.bootstrap()
  // 时间戳每次导出都不同，留着只会制造无意义 diff
  delete bootstrap.serverTime

  const lists: Record<string, unknown> = {}
  for (const def of CONTENT_RESOURCES as any[]) {
    lists[PUBLIC_ROUTE[def.key] ?? def.key] = await publicService.list(def, { page: 1, pageSize: LIST_PAGE_SIZE })
  }

  const pages: Record<string, unknown> = {}
  for (const summary of await publicService.pageKeys()) {
    pages[summary.key] = await publicService.page(summary.key)
  }

  const snapshot = { generatedAt: new Date().toISOString(), bootstrap, lists, pages }
  const source = render(snapshot)

  if (!existsSync(path.dirname(outFile))) {
    console.error(`[fallback] 目录不存在：${path.dirname(outFile)}（用 --app-dir 指定 app 工程位置）`)
    process.exitCode = 1
    return
  }

  if (hasFlag('check')) {
    if (!existsSync(outFile)) {
      console.error(`[fallback] --check 失败：${outFile} 不存在`)
      process.exitCode = 1
      return
    }
    // 比对时忽略导出时间戳，只看数据本体
    const same = stripStamp(readFileSync(outFile, 'utf8')) === stripStamp(source)
    console.log(same ? '[fallback] 快照与库内数据一致' : '[fallback] 快照已过期，请重新执行 pnpm db:fallback')
    process.exitCode = same ? 0 : 1
    return
  }

  writeFileSync(outFile, source, 'utf8')
  console.log(
    `[fallback] 已导出 ${Object.keys(pages).length} 个页面 / ${Object.keys(lists).length} 个列表 / ` +
      `${(bootstrap.nav.header ?? []).length} 个顶部栏目 -> ${path.relative(path.resolve(serverRoot, '..', '..'), outFile).replace(/\\/g, '/')}`,
  )
  console.log('[fallback] 该文件为生成物，请勿手工编辑（改内容请走后台，再重新导出）')
}

/** 抹掉导出时间戳，使 --check 只反映数据差异 */
function stripStamp(text: string): string {
  return text.replace(/export const FALLBACK_GENERATED_AT = "[^"]*"/, 'export const FALLBACK_GENERATED_AT = ""')
}

function render(snapshot: Record<string, unknown>): string {
  const body = JSON.stringify(stripForExport(snapshot), null, 2)
  return `/**
 * 前台静态兜底快照（generated file，请勿手工编辑）。
 *
 * 由 server/scripts/dump-app-fallback.mts 连库导出，字段与 /api/v1/public/* 的返回逐字一致，
 * 唯一用途是后端不可用时让官网继续渲染（内容降级为「不是最新」而不是白屏）。
 * 重新生成：server 下执行 pnpm db:fallback
 */
import type { FallbackSnapshot } from '../api/types'

export const FALLBACK = ${body} as unknown as FallbackSnapshot

/** 导出时间戳，仅用于人工判断快照新旧 */
export const FALLBACK_GENERATED_AT = ${JSON.stringify((snapshot as any).generatedAt)}
`
}

/** generatedAt 单独以常量导出，不进数据体 */
function stripForExport(snapshot: Record<string, any>) {
  const { generatedAt: _omit, ...rest } = snapshot
  return rest
}

await main().catch((err) => {
  console.error('[fallback] 导出失败：', err)
  process.exitCode = 1
})

if (prismaRef) await prismaRef.$disconnect()
