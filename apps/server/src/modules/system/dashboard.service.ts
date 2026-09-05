import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CONTENT_RESOURCES } from '../content/content.registry';

/** 内容维度的统计项：delegate -> 展示名 */
const CONTENT_STATS: { delegate: string; label: string }[] = [
  ...CONTENT_RESOURCES.map((r) => ({ delegate: r.delegate, label: r.label })),
  { delegate: 'mediaAsset', label: '素材' },
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [content, structure, message, user, log, recentLogins, latestContents] = await Promise.all([
      this.countContent(),
      this.countStructure(),
      this.countMessages(),
      this.prisma.user.count(),
      this.prisma.operationLog.count(),
      this.prisma.user.findMany({
        where: { lastLoginAt: { not: null } },
        orderBy: { lastLoginAt: 'desc' },
        take: 8,
        select: { id: true, username: true, name: true, lastLoginAt: true },
      }),
      this.latest(),
    ]);

    return {
      content,
      structure,
      message,
      user,
      log,
      recentLogins: recentLogins.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() ?? null })),
      latest: latestContents,
    };
  }

  private async countContent() {
    const out: Record<string, number> = {};
    for (const item of CONTENT_STATS) {
      const delegate = (this.prisma as any)[item.delegate];
      out[item.delegate] = delegate ? await delegate.count() : 0;
    }
    return CONTENT_STATS.map((i) => ({ key: i.delegate, label: i.label, total: out[i.delegate] ?? 0 }));
  }

  private async countStructure() {
    const [page, section, block, navMenu, taxonomy, term] = await Promise.all([
      this.prisma.page.count(),
      this.prisma.section.count(),
      this.prisma.block.count(),
      this.prisma.navMenu.count(),
      this.prisma.taxonomy.count(),
      this.prisma.term.count(),
    ]);
    return { page, section, block, navMenu, taxonomy, term };
  }

  private async countMessages() {
    const [total, pending, handled] = await Promise.all([
      this.prisma.message.count(),
      this.prisma.message.count({ where: { status: 0 } }),
      this.prisma.message.count({ where: { status: { in: [2, 3] } } }),
    ]);
    return { total, pending, handled };
  }

  /** 最近更新的 5 条产品与 5 条新闻，工作台快捷入口 */
  private async latest() {
    const [products, news] = await Promise.all([
      this.prisma.product.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, slug: true, name: true, status: true, updatedAt: true },
      }),
      this.prisma.news.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, slug: true, title: true, status: true, updatedAt: true },
      }),
    ]);
    return {
      products: products.map((p) => ({ ...p, updatedAt: p.updatedAt.toISOString() })),
      news: news.map((n) => ({ ...n, updatedAt: n.updatedAt.toISOString() })),
    };
  }
}
