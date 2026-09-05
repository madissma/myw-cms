/**
 * 跨库数据搬运（规划第 9 节）。
 *
 * 定位键一律用主键 id：Section.pageId / Block.sectionId 引用的是父行的 id，
 * 只有保 id 搬运才不会让父子关系断裂（详见 src/common/constants/migration.tables.ts）。
 *
 * 两种用法：
 *
 * 1) 同一 provider 之间（换文件、换实例）——直连源库，一条命令搞定：
 *      npx tsx scripts/migrate-data.ts --from-url="file:../legacy/dev.db" --truncate
 *
 * 2) 跨 provider（SQLite -> MySQL / PostgreSQL）——生成的 client 与 schema 的 provider 绑定，
 *    一份 client 不能同时连两种库，因此必须走「导出 + 导入」两步：
 *      a. 旧 provider 下：pnpm dump:fixtures -- --with-runtime
 *      b. 改 schema.prisma 的 provider + `prisma generate` + 用 migrate diff 出的 SQL 建表（9.2）
 *      c. npx tsx scripts/migrate-data.ts --from-dump=prisma/fixtures/dump/content.json --truncate
 *    口令散列不在导出物里（不该进版本库），走这条路时需要重新初始化 admin 口令：
 *    跑一次 `prisma db seed`（seed 只 upsert 用户，不会覆盖已搬进来的内容）或后台改密。
 *
 * 常用参数：
 *      --to-url=<url>       目标库，缺省取 .env 的 DATABASE_URL
 *      --tables=a,b         只搬这些表（按模型名或 delegate 名，逗号分隔）
 *      --truncate           先按拓扑逆序清空目标表（跨库搬运前必做，否则会并存两份同 slug 的记录）
 *      --dry-run            只读不写，打印将要搬运的条数
 *      --page-size=200      分页读取的行数
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import {
  DUMP_DROP_CONTENT_FIELDS,
  DUMP_DROP_FIELDS,
  MIGRATION_TABLES,
  keysOf,
  whereFor,
  type MigrationTable,
} from '../src/common/constants/migration.tables'
import { loadEnvFile, resolveSqliteFile } from '../src/common/utils/env.util'

const serverRoot = path.resolve(__dirname, '..')
// Prisma 对 SQLite 的相对 file: 路径以 schema 所在目录为基准
const SCHEMA_DIR = path.join(serverRoot, 'prisma')
const PAGE_SIZE_DEFAULT = 200

const args = process.argv.slice(2)
const argValue = (name: string): string | undefined =>
  args.find((item) => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const hasFlag = (name: string): boolean => args.includes(`--${name}`)

interface Stats {
  table: MigrationTable
  read: number
  written: number
  skipped: number
  /** 有值表示整表未参与搬运，不做条数断言 */
  note?: string
}

/** 导出物里的 _key 是给人看的注释列，不能当字段写库 */
function cleanRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [field, value] of Object.entries(row)) {
    if (field.startsWith('_')) continue
    out[field] = value
  }
  return out
}

/**
 * 可空 Json 列里的 SQL NULL 不能直接传 null（Prisma 在 update 里把 null 当 no-op，
 * 在 create 里会拒绝），必须用 Prisma.DbNull 哨兵。从 schema 里把 Json 字段挑出来。
 */
function jsonFieldIndex(source: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  const re = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm
  for (const [, name, body] of source.matchAll(re)) {
    const fields = new Set<string>()
    for (const line of body.split('\n')) {
      const matched = line.match(/^\s+(\w+)\s+Json(\?)?\b/)
      if (matched?.[2]) fields.add(matched[1])
    }
    if (fields.size) out.set(name, fields)
  }
  return out
}

function pickTables(): MigrationTable[] {
  const wanted = argValue('tables')
    ?.split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)
  if (!wanted?.length) return [...MIGRATION_TABLES]
  const picked = MIGRATION_TABLES.filter(
    (table) => wanted.includes(table.model.toLowerCase()) || wanted.includes(table.delegate.toLowerCase()),
  )
  const missed = wanted.filter(
    (name) => !MIGRATION_TABLES.some((t) => t.model.toLowerCase() === name || t.delegate.toLowerCase() === name),
  )
  if (missed.length) console.warn(`[migrate] --tables 里的未知表名已忽略：${missed.join(', ')}`)
  // 无论 --tables 怎么写，都按拓扑序执行，避免子行先于父行导致外键失败
  return MIGRATION_TABLES.filter((table) => picked.includes(table))
}

/** 源：live client 分页读；文件导出物一次性读后切片，保证两条路径的消费方式一致 */
async function* readTable(
  source: PrismaClient | null,
  dump: Record<string, any[]> | null,
  table: MigrationTable,
  pageSize: number,
): AsyncGenerator<Record<string, any>[]> {
  if (dump) {
    const rows = (dump[table.model] ?? []).map(cleanRow)
    for (let skip = 0; skip < rows.length; skip += pageSize) yield rows.slice(skip, skip + pageSize)
    return
  }
  const delegate = (source as any)[table.delegate]
  if (table.compound) {
    // 关联表没有 id、行数有限（权限点 x 角色），整体读一次即可；orderBy 必须用数组形式
    yield await delegate.findMany({ orderBy: keysOf(table).map((field) => ({ [field]: 'asc' })) })
    return
  }
  for (let skip = 0; ; skip += pageSize) {
    const rows: Record<string, any>[] = await delegate.findMany({ orderBy: { id: 'asc' }, skip, take: pageSize })
    if (!rows.length) return
    yield rows
    if (rows.length < pageSize) return
  }
}

async function writeRow(
  target: PrismaClient,
  table: MigrationTable,
  row: Record<string, any>,
  jsonFields: Map<string, Set<string>>,
): Promise<'written' | 'skipped'> {
  const where = whereFor(table, row)
  const data = dropNullJson(table, row, jsonFields)
  if (table.compound) {
    // 关联行没有需要更新的业务字段，重复即视为已存在
    try {
      await (target as any)[table.delegate].create({ data })
      return 'written'
    } catch (error: any) {
      // P2002 已存在；P2003 外键落空（如 User 被跳过时其 UserRole）——都记为跳过而不中断
      if (error?.code === 'P2002' || error?.code === 'P2003') return 'skipped'
      throw error
    }
  }
  const { id, ...rest } = data
  await (target as any)[table.delegate].upsert({ where, create: data, update: rest })
  return 'written'
}

/**
 * 可空 Json 列里的 null 剔除掉再写库。
 *
 * Prisma 对 Json 字段的 null 有特殊语义（update 里当 no-op，create 里报错，要写 SQL NULL 得用
 * Prisma.DbNull 哨兵），而省略一个可选字段恰好就是写入 NULL，语义相同且不依赖哨兵名字。
 * 副作用：目标库已有同一行且该列非空时不会被清空，因此跨库搬运必须带 --truncate。
 */
function dropNullJson(table: MigrationTable, row: Record<string, any>, jsonFields: Map<string, Set<string>>) {
  const fields = jsonFields.get(table.model)
  if (!fields) return row
  const out: Record<string, any> = {}
  for (const [field, value] of Object.entries(row)) {
    if (value === null && fields.has(field)) continue
    out[field] = value
  }
  return out
}

async function main() {
  const envFile = loadEnvFile(serverRoot)
  if (!envFile) console.warn('[migrate] 未找到 .env，直接使用进程环境变量')

  const fromUrl = argValue('from-url')
  const fromDump = argValue('from-dump')
  const toUrl = argValue('to-url') ?? process.env.DATABASE_URL
  const dryRun = hasFlag('dry-run')
  const truncate = hasFlag('truncate')
  const pageSize = Number(argValue('page-size') ?? PAGE_SIZE_DEFAULT)

  if (!fromUrl && !fromDump) {
    console.error('[migrate] 需要指定数据源：--from-url=<url> 或 --from-dump=<file>')
    process.exitCode = 1
    return
  }
  if (fromUrl && fromDump) {
    console.error('[migrate] --from-url 与 --from-dump 只能二选一')
    process.exitCode = 1
    return
  }
  if (!dryRun && !toUrl) {
    console.error('[migrate] 缺少目标库：--to-url 或 .env 的 DATABASE_URL')
    process.exitCode = 1
    return
  }
  const sameSqliteFile =
    !!fromUrl &&
    !!toUrl &&
    (() => {
      const src = resolveSqliteFile(fromUrl, SCHEMA_DIR)
      const dst = resolveSqliteFile(toUrl, SCHEMA_DIR)
      return !!src && !!dst && src.toLowerCase() === dst.toLowerCase()
    })()
  if (sameSqliteFile || (fromUrl && toUrl && fromUrl === toUrl)) {
    console.error('[migrate] 源库与目标库相同，拒绝自我复制')
    process.exitCode = 1
    return
  }

  let dump: Record<string, any[]> | null = null
  if (fromDump) {
    const dumpFile = path.resolve(serverRoot, fromDump)
    const parsed = JSON.parse(readFileSync(dumpFile, 'utf8')) as {
      withRuntime?: boolean
      counts?: Record<string, number>
      data?: Record<string, any[]>
    }
    if (!parsed.data) {
      console.error(`[migrate] ${dumpFile} 里没有 data 字段，不像是 dump-to-fixtures.mts 的产物`)
      process.exitCode = 1
      return
    }
    dump = parsed.data
    if (!parsed.withRuntime) {
      const missing = MIGRATION_TABLES.filter((table) => table.runtime && !dump?.[table.model]?.length)
      if (missing.length) {
        console.warn(`[migrate] 导出物未含运行期数据（${missing.map((t) => t.model).join(', ')}），如需搬运请用 --with-runtime 重新导出`)
      }
    }
    console.warn(
      `[migrate] 导出物不含 ${[...DUMP_DROP_FIELDS, ...DUMP_DROP_CONTENT_FIELDS].join(', ')}：` +
        'User 表整表跳过，导入后请跑一次 prisma db seed 补回 admin（其余内容不受影响）',
    )
  }

  const tables = pickTables()
  if (!tables.length) {
    console.error('[migrate] 没有可搬运的表')
    process.exitCode = 1
    return
  }

  const source = fromDump ? null : new PrismaClient({ datasourceUrl: fromUrl })
  const target = dryRun ? null : new PrismaClient({ datasourceUrl: toUrl })
  const jsonFields = jsonFieldIndex(readFileSync(path.join(SCHEMA_DIR, 'schema.prisma'), 'utf8'))
  const stats: Stats[] = []
  const started = Date.now()

  try {
    if (target && truncate) {
      for (const table of [...tables].reverse()) {
        const deleted = await (target as any)[table.delegate].deleteMany({})
        if (deleted.count) console.log(`[migrate] 清空 ${table.model}：${deleted.count} 行`)
      }
    }
    for (const table of tables) {
      const item: Stats = { table, read: 0, written: 0, skipped: 0 }
      // 导出物里没有口令散列这类凭据列，硬写会撞上必填校验，直接交给 seed 重建
      if (dump && table.secret) {
        item.note = '导出物不含凭据列，已跳过（由 prisma db seed 重建 admin）'
        stats.push(item)
        console.warn(`[migrate] ${table.model} ${item.note}`)
        continue
      }
      for await (const rows of readTable(source, dump, table, pageSize)) {
        for (const row of rows) {
          item.read += 1
          if (!target) continue
          item[(await writeRow(target, table, row, jsonFields)) as 'written' | 'skipped'] += 1
        }
      }
      stats.push(item)
      const suffix = item.skipped ? ` 已存在或外键落空跳过 ${item.skipped}` : ''
      console.log(`[migrate] ${table.model.padEnd(15)} 读 ${item.read}${dryRun ? '' : ` 写 ${item.written}`}${suffix}`)
    }

    const total = stats.reduce((sum, item) => sum + item.read, 0)
    const empty = stats.filter((item) => !item.read)
    const diffs: string[] = []
    if (target) {
      console.log('[migrate] 目标库计数核对：')
      for (const item of stats) {
        const actual = await (target as any)[item.table.delegate].count()
        console.log(`  ${item.table.model.padEnd(15)} 读 ${item.read} 写 ${item.written} 库内 ${actual}${item.note ? ` （${item.note}）` : ''}`)
        if (item.note) continue
        // 清过库才能断言：库内应恰好等于实际写入数（因唯一键冲突 / 外键落空而跳过的行不计）
        // 没清时目标库可能已有 seed 出来的基线，只能断言不少于写入数
        const ok = truncate ? actual === item.written : actual >= item.written
        if (!ok) diffs.push(`${item.table.model} 写 ${item.written} 跳过 ${item.skipped} / 库内 ${actual}`)
      }
    }
    console.log(
      `[migrate] ${dryRun ? '试运行' : '完成'}：${stats.length} 张表 ${total} 行，耗时 ${((Date.now() - started) / 1000).toFixed(1)}s`,
    )
    if (empty.length) console.log(`[migrate] 空表：${empty.map((item) => item.table.model).join(', ')}`)
    if (diffs.length) {
      console.error(`[migrate] 条数不一致：\n  ${diffs.join('\n  ')}`)
      process.exitCode = 1
    }
  } finally {
    // 两侧都要断开：SQLite 下没断开的连接会一直锁着库文件，后续 prisma CLI 会报 database is locked
    await source?.$disconnect()
    await target?.$disconnect()
  }
}

main().catch((error) => {
  console.error('[migrate] 失败：', error?.message ?? error)
  if (error?.stack) console.error(error.stack)
  process.exitCode = 1
})
