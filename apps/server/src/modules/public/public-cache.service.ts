import { Injectable, Logger } from '@nestjs/common';

interface Entry {
  value: unknown;
  expireAt: number;
}

/**
 * 前台只读聚合接口的内存缓存。
 * 官网内容变更容忍 60 秒延迟，因此不引入外部缓存组件，
 * TTL 可通过 PUBLIC_CACHE_TTL_SEC 调整（设为 0 即关闭缓存，便于本地联调）。
 */
@Injectable()
export class PublicCacheService {
  private readonly logger = new Logger(PublicCacheService.name);
  private readonly store = new Map<string, Entry>();
  private readonly defaultTtlSec = toTtl(process.env.PUBLIC_CACHE_TTL_SEC);

  get ttlSec(): number {
    return this.defaultTtlSec;
  }

  /** 命中返回缓存，未命中执行 factory 并按 TTL 落缓存；TTL<=0 时直通 */
  async wrap<T>(key: string, factory: () => Promise<T>, ttlSec = this.defaultTtlSec): Promise<T> {
    if (ttlSec <= 0) return factory();

    const hit = this.store.get(key);
    const now = Date.now();
    if (hit && hit.expireAt > now) return hit.value as T;
    if (hit) this.store.delete(key);

    const value = await factory();
    this.store.set(key, { value, expireAt: now + ttlSec * 1000 });
    this.sweep(now);
    return value;
  }

  clear(prefix?: string): number {
    if (!prefix) {
      const n = this.store.size;
      this.store.clear();
      return n;
    }
    let n = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        n += 1;
      }
    }
    return n;
  }

  /** 顺带清理过期项，避免长时间运行后 Map 无界增长 */
  private sweep(now: number) {
    if (this.store.size < 256) return;
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (entry.expireAt <= now) {
        this.store.delete(key);
        removed += 1;
      }
    }
    if (removed) this.logger.debug(`cache swept ${removed} expired keys`);
  }
}

function toTtl(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 60;
}
