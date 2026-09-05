import { getJson, postJson, withFallback } from './http'
import { fallbackOf } from './fallback'
import type { ContentKey, ListQuery, ListResult, SlugEntity } from './types'

/** 把查询对象转成接口参数，布尔量只在必选时传，避免后端 whitelist 校验噪音 */
function toQuery(query: ListQuery & { lang?: string }) {
  const { category, keyword, featured, hot, page, pageSize, lang } = query
  return {
    category,
    keyword,
    featured: featured ? true : undefined,
    hot: hot ? true : undefined,
    page,
    pageSize,
    lang,
  }
}

/** 列表：失败回落快照（含分页字段，前端的分类筛选与搜索在快照上照常工作） */
export async function fetchList<T>(key: ContentKey, query: ListQuery & { lang?: string } = {}) {
  return withFallback<ListResult<T>>(
    () => getJson<ListResult<T>>(`/public/${key}`, toQuery(query)),
    () => fallbackOf((snapshot) => (snapshot.lists[key] ?? null) as ListResult<T> | null),
  )
}

/** 快照里的列表元素，按前台需要的字段取用 */
function snapshotList<T>(key: ContentKey): Promise<T[]> {
  return fallbackOf<T[]>((snapshot) => ((snapshot.lists[key] ?? { list: [] }) as ListResult<T>).list)
    .then((list) => list ?? [])
}

/**
 * 详情：失败时按 slug / legacyId / id 命中快照，再就地算出「相关资讯」。
 * 后端用 relocated + canonicalSlug 通知前台改写地址，回落路径同样带上这两个字段。
 */
export async function fetchDetail(key: 'products' | 'news', slug: string, lang?: string) {
  return withFallback<SlugEntity>(
    () => getJson<SlugEntity>(`/public/${key}/${slug}`, lang ? { lang } : {}),
    async () => {
      const list = await snapshotList<SlugEntity>(key)
      const item = list.find((row) => row.slug === slug || row.legacyId === slug || row.id === slug)
      if (!item) return null
      const others = list.filter((row) => row.id !== item.id)
      const same = others.filter((row) => row.categorySlug === item.categorySlug)
      const related = [...same, ...others.filter((row) => !same.includes(row))].slice(0, 3)
      const canonicalSlug = item.slug ?? null
      return {
        ...item,
        canonicalSlug,
        relocated: !!canonicalSlug && canonicalSlug !== slug,
        related,
      } as SlugEntity
    },
  )
}

/**
 * 浏览量 +1：静默失败，不影响页面渲染。
 * 服务端只对带 views 列的资源开放（目前仅 news），故类型收狭，避免误用出 400。
 */
export function bumpView(type: 'news', id: string) {
  return postJson(`/public/view/${type}/${id}`)
    .then(() => true)
    .catch(() => false)
}
