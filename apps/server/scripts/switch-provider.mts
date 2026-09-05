/**
 * provider 切换（规划第 9.1 / 9.2 节）。
 *
 * 真源只有一份：prisma/schema.base.prisma，其中 datasource 的 provider 写成占位符
 *   provider = "__PROVIDER__"
 * 工作文件 prisma/schema.prisma 由本脚本从真源生成，因此不会出现「两份 schema 各改一半」。
 *
 * 用法：
 *   npx tsx scripts/switch-provider.mts --show                        看当前 provider 与真源是否一致
 *   npx tsx scripts/switch-provider.mts --save                        改完模型后把 schema.prisma 归一化存为真源
 *   npx tsx scripts/switch-provider.mts --provider=sqlite             生成回开发用的 SQLite 版本
 *   npx tsx scripts/switch-provider.mts --provider=mysql              生成 MySQL 版本并打印后续命令
 *
 * 切到 mysql / postgresql 后的完整流程（9.2）：
 *   1. 本脚本生成 schema.prisma
 *   2. npx prisma format && npx prisma validate
 *   3. npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<db>/init.sql
 *   4. 用客户端执行 init.sql 建库（不用 db push 直连生产）
 *   5. npx prisma db seed   复原内容基线，或 npx tsx scripts/migrate-data.ts --from-dump=... 搬运既有数据
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE_FILE = path.join(serverRoot, 'prisma', 'schema.base.prisma')
const SCHEMA_FILE = path.join(serverRoot, 'prisma', 'schema.prisma')
const PLACEHOLDER = '__PROVIDER__'
const SUPPORTED = ['sqlite', 'mysql', 'postgresql']

const args = process.argv.slice(2)
const argValue = (name: string): string | undefined =>
  args.find((item) => item.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const hasFlag = (name: string): boolean => args.includes(`--${name}`)

/**
 * 替换 datasource 块里的 provider 行。
 * 必须限定在 datasource 块内：generator 块里同样有一行 `provider = "prisma-client-js"`，
 * 按「文件里第一处 provider」替换会把生成器名改掉（prisma generate 随即报 spawn <provider> ENOENT）。
 */
const DATASOURCE_BLOCK = /datasource\s+\w+\s*\{[\s\S]*?\n\}/
const PROVIDER_LINE = /^(\s*provider\s*=\s*)(["'])(?:[^"']*)\2(\s*)$/m
const PROVIDER_VALUE = /^\s*provider\s*=\s*["']([^"']*)["']/m

function setProvider(source: string, provider: string): string {
  const block = source.match(DATASOURCE_BLOCK)?.[0]
  if (!block) throw new Error('schema 里找不到 datasource 块，请检查文件格式')
  if (!PROVIDER_LINE.test(block)) throw new Error('datasource 块里找不到 provider 行，请检查 schema 格式')
  const nextBlock = block.replace(PROVIDER_LINE, `$1$2${provider}$2$3`)
  // 用函数作替换，避开替换串里 $ 的转义语义
  return source.replace(block, () => nextBlock)
}

function readProvider(source: string): string {
  const block = source.match(DATASOURCE_BLOCK)?.[0] ?? ''
  return block.match(PROVIDER_VALUE)?.[1] ?? '(未找到)'
}

/** 按 model 块切分，用于给出 @db.Text 提醒时能确认字段真的存在 */
function parseModels(source: string): Map<string, string> {
  const out = new Map<string, string>()
  const re = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm
  for (const [, name, body] of source.matchAll(re)) out.set(name, body)
  return out
}

/**
 * MySQL 下 String 默认映射 VARCHAR(191)，长文本字段必须补 @db.Text（9.3）。
 * 只列 schema 里确实是裸 String 的那些，Json 字段在 MySQL >= 5.7 直接映射 JSON，无需处理。
 */
function longTextHints(source: string, provider: string): string[] {
  if (provider !== 'mysql') return []
  const candidates = [
    ['Page', 'body'],
    ['News', 'bodyHtml'],
    ['News', 'summary'],
    ['Product', 'description'],
    ['Product', 'summary'],
    ['Product', 'usage'],
    ['Review', 'content'],
    ['TimelineEvent', 'content'],
    ['Video', 'description'],
    ['Message', 'content'],
    ['Message', 'reply'],
  ]
  const models = parseModels(source)
  const hints: string[] = []
  for (const [model, field] of candidates) {
    const body = models.get(model)
    if (!body) continue
    const line = body.split('\n').find((item) => new RegExp(`^\\s+${field}\\s+String\\b`).test(item))
    if (line && !line.includes('@db.')) hints.push(`${model}.${field}`)
  }
  return hints
}

/** 数据模型正文：从第一个顶层声明开始，忽略头部说明注释，用于真源与工作文件的一致性提示 */
function datamodel(source: string): string {
  const lines = source.split('\n')
  const start = lines.findIndex((line) => /^\s*(generator|datasource|model|enum|type)\b/.test(line))
  return lines.slice(start < 0 ? 0 : start).join('\n').trim()
}

/** 真源缺失时从当前工作文件归一化生成，避免新手拉到仓库后无真源可用 */
function ensureBase(current: string): string {
  if (existsSync(BASE_FILE)) return readFileSync(BASE_FILE, 'utf8')
  const base = setProvider(current, PLACEHOLDER)
  writeFileSync(
    BASE_FILE,
    `// 由 scripts/switch-provider.mts --save 生成：跨库唯一真源，provider 为占位符，\n` +
      `// 工作文件 schema.prisma 请用 npx tsx scripts/switch-provider.mts --provider=<${SUPPORTED.join('|')}> 生成。\n` +
      base,
    'utf8',
  )
  console.log(`[provider] 真源不存在，已从当前 schema.prisma 归一化生成：${path.relative(serverRoot, BASE_FILE)}`)
  return readFileSync(BASE_FILE, 'utf8')
}

function main() {
  if (!existsSync(SCHEMA_FILE)) {
    console.error(`[provider] 找不到 ${path.relative(serverRoot, SCHEMA_FILE)}`)
    process.exitCode = 1
    return
  }
  const current = readFileSync(SCHEMA_FILE, 'utf8')

  if (hasFlag('save')) {
    const normalized = setProvider(current, PLACEHOLDER)
    writeFileSync(BASE_FILE, normalized, 'utf8')
    console.log(`[provider] 已存为真源：${path.relative(serverRoot, BASE_FILE)}（provider = "${PLACEHOLDER}"）`)
    return
  }

  const wanted = argValue('provider')
  if (!wanted) {
    const base = existsSync(BASE_FILE) ? readFileSync(BASE_FILE, 'utf8') : null
    console.log(`[provider] schema.prisma = ${readProvider(current)}`)
    if (base) console.log(`[provider] schema.base.prisma = ${readProvider(base)}`)
    if (base && datamodel(setProvider(current, PLACEHOLDER)) !== datamodel(base)) {
      console.log('[provider] 真源与工作文件的模型定义不一致（有改动未 --save），确认后可执行 --save')
    }
    console.log(`[provider] 可选 provider：${SUPPORTED.join(' | ')}`)
    return
  }
  if (!SUPPORTED.includes(wanted)) {
    console.error(`[provider] 不支持 ${wanted}，可选：${SUPPORTED.join(' | ')}`)
    process.exitCode = 1
    return
  }

  const base = ensureBase(current)
  const next = setProvider(base, wanted)
  mkdirSync(path.dirname(SCHEMA_FILE), { recursive: true })
  writeFileSync(SCHEMA_FILE, next, 'utf8')
  console.log(`[provider] 已从真源生成 schema.prisma，provider = "${wanted}"`)

  const hints = longTextHints(next, wanted)
  if (hints.length) {
    console.warn(`[provider] 注意（9.3）：MySQL 下这些裸 String 字段需补 @db.Text 或改表为 LONGTEXT：${hints.join(', ')}`)
    console.warn('[provider] 补法应写进真源后重新 --save / 生成，别只改工作文件')
  }

  const dbDir = `prisma/migrations/${wanted}`
  console.log('\n后续命令（PowerShell，按需执行）：')
  console.log('  npx prisma format; npx prisma validate')
  console.log(`  mkdir ${dbDir} -Force`)
  console.log(
    `  npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > ${dbDir}/init.sql`,
  )
  console.log('  # 用数据库客户端执行上面的 init.sql 建库，再把 .env 的 DATABASE_URL 指向新库')
  console.log('  npx prisma generate')
  console.log('  pnpm db:seed                        # 复原内容基线')
  console.log('  # 或 npx tsx scripts/migrate-data.ts --from-url="file:../data/szb.db" --truncate   # 搬运既有数据')
  if (wanted !== 'sqlite') {
    console.log('  # 记得把 PrismaService 里的 PRAGMA 初始化（WAL/busy_timeout/foreign_keys）跳过，那是 SQLite 专属')
  }
}

main()
