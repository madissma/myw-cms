/**
 * A 类内容抽取：app/src/data/site.ts 是纯数据模块（无 JSX、无组件依赖），
 * 直接 import 后 dump 成 fixtures/site.json，零人工誊写。
 *
 * 执行：pnpm extract:site
 *
 * 输出刻意不含时间戳：同一份源码重复执行产物字节一致，便于 diff 与评审。
 */
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(scriptsDir, '..')
const appDataModule = path.resolve(serverRoot, '..', '..', 'apps', 'app', 'src', 'data', 'site.ts')
const outFile = path.resolve(serverRoot, 'prisma', 'fixtures', 'site.json')

if (!existsSync(appDataModule)) {
  console.error(`[extract] 源文件不存在: ${appDataModule}`)
  process.exit(1)
}

const mod = (await import(pathToFileURL(appDataModule).href)) as {
  products: unknown[]
  news: unknown[]
  reviews: unknown[]
  mallLinks: { name: string; url: string; desc?: string; badge?: string }[]
  contactInfo: Record<string, string>
}

const fixture = {
  generatedFrom: 'apps/app/src/data/site.ts',
  generatedBy: 'scripts/extract-from-app.mts',
  products: mod.products,
  news: mod.news,
  reviews: mod.reviews,
  mallLinks: mod.mallLinks,
  contactInfo: mod.contactInfo,
}

await mkdir(path.dirname(outFile), { recursive: true })
await writeFile(outFile, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8')

console.log(
  `[extract] site.json 已生成：products=${mod.products.length} news=${mod.news.length}` +
    ` reviews=${mod.reviews.length} mallLinks=${mod.mallLinks.length} settings=${Object.keys(mod.contactInfo).length}`,
)
console.log(`[extract] 输出：${outFile}`)
