import { defineStore } from 'pinia'
import { ref } from 'vue'
import { terms as fetchTerms } from '@/api/modules/taxonomy'
import type { TermOption } from '@/types/api'

/**
 * 分类术语缓存：产品/新闻等表单里的下拉框共用一份数据，
 * 同一 taxonomyKey 的并发请求用 inflight 去重，避免逐个字段挂载都打一次接口。
 */
export const useDictStore = defineStore('dict', () => {
  const cache = ref<Record<string, TermOption[]>>({})
  const inflight = new Map<string, Promise<TermOption[]>>()

  async function load(key: string, force = false): Promise<TermOption[]> {
    if (!force && cache.value[key]) return cache.value[key]
    const running = inflight.get(key)
    if (running) return running

    const task = fetchTerms({ taxonomyKey: key, pageSize: 200, status: 1, sort: 'sortOrder:asc' })
      .then((res) => {
        const opts: TermOption[] = (res?.list ?? []).map((item) => ({
          id: item.id,
          slug: item.slug,
          name: item.name,
          anchor: item.anchor,
          url: item.url,
        }))
        cache.value = { ...cache.value, [key]: opts }
        return opts
      })
      .finally(() => {
        inflight.delete(key)
      })

    inflight.set(key, task)
    return task
  }

  function cached(key: string): TermOption[] {
    return cache.value[key] ?? []
  }

  function nameOf(key: string, slug?: string | null): string {
    if (!slug) return ''
    return cached(key).find((item) => item.slug === slug)?.name ?? slug
  }

  /** 术语被后台增删后调用，强制下次重新拉取 */
  function invalidate(key?: string): void {
    if (key) {
      const next = { ...cache.value }
      delete next[key]
      cache.value = next
      return
    }
    cache.value = {}
  }

  return { cache, load, cached, nameOf, invalidate }
})
