/**
 * 反向导出：把库里的当前内容固化为一份可比对的基线文件（规划 10.9）。
 *
 * 用途有三个，按重要性排序：
 *   1. 评审与 diff：后台一段时间的内容调整后，导出物可以直接和上一版对比，看清改了哪些文案；
 *   2. 归档复原：新环境先 `prisma db seed` 复原基线，再用 `scripts/migrate-data.ts --from-dump` 导回导出物；
 *   3. 跨库迁移（第 9 节）：作为源库与目标库的一致性核对基准。
 *
 * 刻意不做的事：不覆盖 prisma/fixtures/ 下那四份手工基线（site.json / pages.ts / copy.ts / meta.ts），
 * 那两个真源互相覆盖会直接毁掉 10.8 的逐字校验；导出物一律落在 prisma/fixtures/dump/ 下。
 *
 * 执行：pnpm dump:fixtures
 *       pnpm dump:fixtures -- --tables=product,news --out=prisma/fixtures/dump/small.json
 *       pnpm dump:fixtures -- --with-runtime      额外导出留言与操作日志（含时间，运行期数据）
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PrismaClient } from '@prisma/client'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(scriptsDir, '..')
const load = (rel: string): Promise<any> => import(pathToFileURL(path.resolve(serverRoot, rel)).href) as Promise<any>

const { loadEnvFile } = await load('src/common/utils/env.util.ts')
const { MIGRATION_TABLES, DUMP_DROP_FIELDS, DUMP_DROP_CONTENT_FIELDS, labelOf } = await load(
  'src/common/constants/migration.tables.ts',
)

const DEFAULT_OUT = 'prisma/fixtures/dump/content.json'
const args = process.argv.slice(2)
const argValue = (name: string): string | undefined =>
  args.find((item) => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const hasFlag = (name: string): boolean => args.includes(`--${name}`)

/** 导出内容表；加了 --with-runtime 才连带导出留言与操作日志这类运行期数据 */
const TABLES = MIGRATION_TABLES.filter((table: any) => !table.runtime)
const RUNTIME_TABLES = MIGRATION_TABLES.filter((table: any) => table.runtime)

function prune(row: Record<string, any>, withRuntime: boolean) {
  const drop = new Set([
    ...DUMP_DROP_FIELDS,
    ...(withRuntime ? [] : DUMP_DROP_CONTENT_FIELDS),
  ])
  return Object.fromEntries(Object.entries(row).filter(([field]) => !drop.has(field)))
}

async function main() {
  const envFile = loadEnvFile(serverRoot)
  if (!envFile) console.warn('[dump] 未找到 .env，直接使用进程环境变量')

  const wanted = argValue('tables')?.split(',').map((name) => name.trim().toLowerCase())
  const withRuntime = hasFlag('with-runtime')
  const tables = [...TABLES, ...(withRuntime ? RUNTIME_TABLES : [])].filter(
    (table) => !wanted?.length || wanted.includes(table.delegate.toLowerCase()) || wanted.includes(table.model.toLowerCase()),
  )
  if (!tables.length) {
    console.error(`[dump] --tables 未匹配到任何表，可选：${[...TABLES, ...RUNTIME_TABLES].map((t) => t.delegate).join(', ')}`)
    process.exitCode = 1
    return
  }

  const prisma = new PrismaClient()
  const byModel: Record<string, any[]> = {}
  const summary: string[] = []
  try {
    for (const table of tables) {
      const rows = await (prisma as any)[table.delegate].findMany({})
      const pruned = rows.map((row: any) => {
        const clean = prune(row, withRuntime)
        // 业务键单独记一列，人工核对与 diff 时不必去数组里翻 slug / navKey
        return { _key: labelOf(table, row), ...clean }
      })
      byModel[table.model] = pruned
      summary.push(`${table.model}=${rows.length}`)
    }
  } finally {
    await prisma.$disconnect()
  }

  const outFile = path.resolve(serverRoot, argValue('out') ?? DEFAULT_OUT)
  mkdirSync(path.dirname(outFile), { recursive: true })
  const dump = {
    generatedBy: 'scripts/dump-to-fixtures.mts',
    note: '反向导出的内容基线。不参与逐字校验，也不覆盖 prisma/fixtures 下那四份手工基线。',
    withRuntime,
    counts: Object.fromEntries(Object.entries(byModel).map(([model, list]) => [model, list.length])),
    data: byModel,
  }
  // 已存在的导出物先留一份上一版，便于两次导出之间做 diff
  if (existsSync(outFile)) {
    const prev = readFileSync(outFile, 'utf8')
    writeFileSync(outFile.replace(/\.json$/, '.prev.json'), prev, 'utf8')
  }
  writeFileSync(outFile, `${JSON.stringify(dump, null, 2)}\n`, 'utf8')

  console.log(`[dump] ${summary.join(' ')}`)
  console.log(`[dump] 输出：${outFile}${existsSync(outFile.replace(/\.json$/, '.prev.json')) ? '（上一版已存为 *.prev.json）' : ''}`)
  console.log('[dump] 复原：npx tsx scripts/migrate-data.ts --from-dump=' + path.relative(serverRoot, outFile).replace(/\\/g, '/'))
}

await main()
