/**
 * B 类内容抽取：各页面模块顶层的数组字面量常量。
 *
 * 用 ts-morph 按白名单抓 VariableStatement 的 initializer 并求值，
 * 不 import 页面文件（会连带拉起 React 与 lucide-react）。
 *
 * 特殊处理：Tech.tsx 的 labs、Mall.tsx 的 guarantees 含 `icon: ShieldCheck`
 * 这类组件引用，无法 JSON 序列化 —— 这里把值位置的大写标识符替换为其名字符串，
 * 前台区块组件维护 iconName -> lucide component 的映射表，未知名回落默认图标。
 *
 * 执行：pnpm extract:pages
 *
 * 适用窗口：仅建站期（前台尚未改为区块驱动时）。前台切换后这些常量已入库、源码里不复存在，
 * 本脚本会报「常量未抓到」并主动中止，不会写盘。
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Node, Project, ts } from 'ts-morph'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(scriptsDir, '..')
const appSrc = path.resolve(serverRoot, '..', '..', 'apps', 'app', 'src')
const outFile = path.resolve(serverRoot, 'prisma', 'fixtures', 'pages.ts')

const TARGETS: { file: string; page: string; names: string[] }[] = [
  { file: 'pages/Home.tsx', page: 'home', names: ['slides', 'stats', 'techTags'] },
  { file: 'pages/About.tsx', page: 'about', names: ['subNav', 'advantages', 'timeline', 'cultures', 'honors'] },
  { file: 'pages/Tech.tsx', page: 'tech', names: ['labs', 'processes', 'research'] },
  { file: 'pages/Media.tsx', page: 'media', names: ['videos'] },
  { file: 'pages/Voice.tsx', page: 'voice', names: ['stats'] },
  { file: 'pages/Mall.tsx', page: 'mall', names: ['guarantees'] },
  { file: 'components/Navbar.tsx', page: 'navbar', names: ['navItems'] },
  { file: 'components/Footer.tsx', page: 'footer', names: ['quickLinks'] },
]

const project = new Project({
  // 不读 tsconfig，也不自动收录整个仓库：只显式 addSourceFileAtPath 白名单文件
  useInMemoryFileSystem: false,
  compilerOptions: { target: ts.ScriptTarget.Latest, jsx: ts.JsxEmit.ReactJSX, allowJs: true },
})

/** 值位置的大写标识符（组件引用）改写成字符串字面量 */
function literalizeComponentRefs(text: string, collect: { start: number; end: number; name: string }[]): string {
  let out = text
  const sorted = [...collect].sort((a, b) => b.start - a.start)
  for (const item of sorted) {
    out = out.slice(0, item.start) + JSON.stringify(item.name) + out.slice(item.end)
  }
  return out
}

function extractInitializer(init: Node, fileText: string): unknown {
  const collect: { start: number; end: number; name: string }[] = []
  if (Node.isIdentifier(init)) return undefined

  init.forEachDescendant((node) => {
    if (!Node.isIdentifier(node)) return
    const name = node.getText()
    if (!/^[A-Z]/.test(name)) return
    const parent = node.getParent()
    // 排除「属性名 / 简写属性 / 成员访问 / 类型位置」，只留值位置的组件引用
    if (parent && Node.isPropertyAssignment(parent) && parent.getNameNode() === node) return
    if (parent && Node.isShorthandPropertyAssignment(parent)) return
    if (parent && (Node.isQualifiedName(parent) || Node.isPropertyAccessExpression(parent))) return
    if (parent && Node.isCallExpression(parent) && parent.getExpression() === node) return
    collect.push({ start: node.getStart(), end: node.getEnd(), name })
  })

  const start = init.getStart()
  const end = init.getEnd()
  const raw = fileText.slice(start, end)
  // 偏移量需相对 initializer 片段本身，故先把绝对位置换算为相对位置
  const relative = collect.map((c) => ({ ...c, start: c.start - start, end: c.end - start }))
  const text = literalizeComponentRefs(raw, relative)
  return new Function(`return (${text})`)()
}

const result: Record<string, Record<string, unknown>> = {}
const missing: string[] = []
const counters: string[] = []

for (const target of TARGETS) {
  const abs = path.join(appSrc, target.file)
  const sourceFile = project.addSourceFileAtPath(abs)
  const fileText = sourceFile.getFullText()
  const bucket: Record<string, unknown> = {}

  for (const name of target.names) {
    const decl = sourceFile.getVariableDeclaration(name)
    const init = decl?.getInitializer()
    if (!init) {
      missing.push(`${target.file}:${name}`)
      continue
    }
    const value = extractInitializer(init, fileText)
    bucket[name] = value
    counters.push(`${target.page}.${name}=${Array.isArray(value) ? value.length : 1}`)
  }

  result[target.page] = bucket
}

const banner = [
  '/**',
  ' * 由 scripts/extract-page-constants.mts 从 app 页面顶层常量抽取，请勿手改。',
  ' * 重新生成：pnpm extract:pages',
  ' *',
  ' * 说明：icon 字段已从组件引用降级为图标名字符串（FlaskConical / ShieldCheck ...），',
  ' * 前台区块组件按名字查表渲染，未注册名字回落默认图标。',
  ' */',
  '',
].join('\n')

const body = `export const pageConstants = ${JSON.stringify(result, null, 2)} as const\n\nexport type PageConstants = typeof pageConstants\n`

if (missing.length) {
  console.error(`[extract] 以下常量未抓到，请核对源码是否改名：\n  ${missing.join('\n  ')}`)
  console.error('[extract] 已中止且未写盘：前台已改区块驱动时这些常量已不在源码里，写下去会毁掉 B 类基线')
  process.exit(1)
}

await mkdir(path.dirname(outFile), { recursive: true })
await writeFile(outFile, `${banner}${body}`, 'utf8')

console.log(`[extract] pages.ts 已生成：${counters.join(' ')}`)
console.log(`[extract] 输出：${outFile}`)
