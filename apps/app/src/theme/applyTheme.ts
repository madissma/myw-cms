import type { ThemePayload } from '../api/types'

/**
 * 运行时主题注入：把后台 Theme.tokens 写进 :root 的 CSS 变量。
 *
 * 品牌色在 tailwind.config.js 里已改为 rgb(var(--c-*) / <alpha-value>) 形式，
 * 变量值必须是「R G B」三元组（不带 rgb() 包裹），否则 bg-forest-deep/85 这类透明度写法会失效。
 * 因此这里把后台存的 hex 拆成三个十进制分量，实现「后台改色，前台无需重新构建即时生效」。
 */

/** Theme.color 的驼峰键 -> CSS 变量名，与 tailwind.config.js 的色阶一一对应 */
const COLOR_VARS: Record<string, string> = {
  cream: '--c-cream',
  creamDeep: '--c-cream-deep',
  creamDark: '--c-cream-dark',
  forest: '--c-forest',
  forestDeep: '--c-forest-deep',
  forestLight: '--c-forest-light',
  forestMist: '--c-forest-mist',
  gold: '--c-gold',
  goldLight: '--c-gold-light',
  goldPale: '--c-gold-pale',
  ink: '--c-ink',
  inkSoft: '--c-ink-soft',
}

const FONT_VARS: Record<string, string> = {
  serif: '--f-serif-sc',
  sans: '--f-sans-sc',
  latin: '--f-latin',
}

/** #RRGGBB / #RGB -> "R G B"，非法值返回 null 交由调用方跳过 */
export function hexToRgbTriplet(hex: string): string | null {
  const text = hex.trim().replace('#', '')
  const full = text.length === 3 ? text.split('').map((ch) => ch + ch).join('') : text
  if (!/^[0-9a-f]{6}$/i.test(full)) return null
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

/** 返回实际写入的变量条数，便于调试；theme 为空时不动样式（沿用 index.css 的默认配色） */
export function applyTheme(theme: ThemePayload | null | undefined): number {
  const tokens = theme?.tokens
  if (!tokens) return 0
  const root = document.documentElement
  let count = 0

  for (const [key, value] of Object.entries(COLOR_VARS)) {
    const raw = tokens.color?.[key]
    if (typeof raw !== 'string') continue
    const triplet = hexToRgbTriplet(raw)
    if (!triplet) continue
    root.style.setProperty(value, triplet)
    count += 1
  }
  for (const [key, cssVar] of Object.entries(FONT_VARS)) {
    const raw = tokens.font?.[key]
    if (typeof raw !== 'string' || !raw.trim()) continue
    root.style.setProperty(cssVar, raw)
    count += 1
  }
  if (typeof tokens.radius === 'string' && tokens.radius.trim()) {
    root.style.setProperty('--radius', tokens.radius)
    count += 1
  }
  if (theme?.code) root.dataset.theme = theme.code
  return count
}

/** 同步站点标题与 favicon（规划 §7.6） */
export function applySiteMeta(title: string, favicon?: string): void {
  if (title) document.title = title
  if (!favicon) return
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = favicon
}
