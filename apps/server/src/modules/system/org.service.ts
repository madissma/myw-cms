import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { textOrNull } from '../../common/utils/html.util';
import { CreateOrgDto, UpdateOrgDto } from './dto/system.dto';

export interface OrgNode {
  id: string;
  parentId: string | null;
  name: string;
  code: string | null;
  leader: string | null;
  phone: string | null;
  sortOrder: number;
  status: number;
  userCount: number;
  children: OrgNode[];
}

const orgSelect = {
  id: true,
  parentId: true,
  name: true,
  code: true,
  leader: true,
  phone: true,
  sortOrder: true,
  status: true,
  _count: { select: { users: true } },
} as const;

@Injectable()
export class OrgService {
  constructor(private readonly prisma: PrismaService) {}

  /** 平铺列表，前端自行组树；也用于 el-tree 的 data */
  async list(query: { keyword?: string; status?: number } = {}) {
    const where: any = {};
    if (query.status !== undefined) where.status = query.status;
    const kw = (query.keyword || '').trim();
    if (kw) where.name = { contains: kw };

    const rows = await this.prisma.org.findMany({
      where,
      select: orgSelect,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map((r) => ({ ...r, userCount: r._count.users, _count: undefined }));
  }

  /** 组好的树，供侧边组织选择器使用 */
  async tree() {
    const flat = await this.list();
    const nodes = new Map<string, OrgNode>();
    flat.forEach((o) => nodes.set(o.id, { ...(o as any), children: [] }));

    const roots: OrgNode[] = [];
    nodes.forEach((node) => {
      const parent = node.parentId ? nodes.get(node.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    });
    return roots;
  }

  async detail(id: string) {
    const org = await this.prisma.org.findUnique({ where: { id }, select: orgSelect });
    if (!org) throw new NotFoundException('组织不存在');
    return { ...org, userCount: org._count.users, _count: undefined };
  }

  async create(dto: CreateOrgDto) {
    const name = dto.name.trim();
    if (dto.parentId) await this.assertExists(dto.parentId, '上级组织');
    const code = textOrNull(dto.code);
    if (code) {
      const hit = await this.prisma.org.findUnique({ where: { code } });
      if (hit) throw new ConflictException(`组织编码 ${code} 已存在`);
    }
    const created = await this.prisma.org.create({
      data: {
        parentId: dto.parentId || null,
        name,
        code,
        leader: textOrNull(dto.leader),
        phone: textOrNull(dto.phone),
        sortOrder: dto.sortOrder ?? (await this.nextSortOrder(dto.parentId)),
        status: dto.status ?? 1,
      },
    });
    return this.detail(created.id);
  }

  async update(id: string, dto: UpdateOrgDto) {
    await this.assertExists(id, '组织');
    if (dto.parentId) {
      if (dto.parentId === id) throw new BadRequestException('上级组织不能是自己');
      await this.assertExists(dto.parentId, '上级组织');
      if (await this.isDescendant(dto.parentId, id)) throw new BadRequestException('上级组织不能是自己的子节点');
    }

    const code = dto.code === undefined ? undefined : textOrNull(dto.code);
    if (code) {
      const hit = await this.prisma.org.findUnique({ where: { code } });
      if (hit && hit.id !== id) throw new ConflictException(`组织编码 ${code} 已存在`);
    }

    await this.prisma.org.update({
      where: { id },
      data: {
        parentId: dto.parentId === undefined ? undefined : dto.parentId || null,
        name: dto.name?.trim(),
        code,
        leader: dto.leader === undefined ? undefined : textOrNull(dto.leader),
        phone: dto.phone === undefined ? undefined : textOrNull(dto.phone),
        sortOrder: dto.sortOrder,
        status: dto.status,
      },
    });
    return this.detail(id);
  }

  async setStatus(id: string, status: number) {
    await this.assertExists(id, '组织');
    await this.prisma.org.update({ where: { id }, data: { status } });
    return { ok: true };
  }

  async remove(id: string) {
    await this.assertExists(id, '组织');
    const children = await this.prisma.org.count({ where: { parentId: id } });
    if (children) throw new BadRequestException('该组织下还有子部门，请先删除子部门');
    const users = await this.prisma.user.count({ where: { orgId: id } });
    if (users) throw new BadRequestException(`该组织下还有 ${users} 名用户，无法删除`);
    await this.prisma.org.delete({ where: { id } });
    return { ok: true };
  }

  async resort(ids: string[]) {
    if (!ids?.length) return { ok: true };
    await Promise.all(
      ids.map((id, index) => this.prisma.org.update({ where: { id }, data: { sortOrder: (index + 1) * 10 } })),
    );
    return { ok: true };
  }

  private async nextSortOrder(parentId?: string) {
    const where: any = parentId ? { parentId } : { parentId: null };
    const max = await this.prisma.org.findFirst({ where, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    return (max?.sortOrder ?? 0) + 10;
  }

  private async assertExists(id: string, label: string) {
    const found = await this.prisma.org.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException(`${label}不存在`);
  }

  /** candidate 是否位于 id 的子树内 */
  private async isDescendant(candidate: string, id: string): Promise<boolean> {
    let cursor: string | null = candidate;
    let guard = 0;
    while (cursor && guard++ < 50) {
      if (cursor === id) return true;
      const row: { parentId: string | null } | null = await this.prisma.org.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = row?.parentId ?? null;
    }
    return false;
  }
}
