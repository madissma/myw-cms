import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizeCode, textOrNull } from '../../common/utils/index.util';
import { CreateNavMenuDto, UpdateNavMenuDto } from './dto/nav-menu.dto';

export interface NavNode {
  id: string;
  parentId: string | null;
  position: string;
  navKey: string | null;
  label: string;
  labelEn: string | null;
  path: string;
  icon: string | null;
  target: string;
  sortOrder: number;
  status: number;
  children: NavNode[];
}

const navSelect = {
  id: true,
  parentId: true,
  position: true,
  navKey: true,
  label: true,
  labelEn: true,
  path: true,
  icon: true,
  target: true,
  sortOrder: true,
  status: true,
} as const;

@Injectable()
export class NavService {
  constructor(private readonly prisma: PrismaService) {}

  /** 平铺列表，后台表格按 parentId 组树展示 */
  async list(query: { position?: string; parentId?: string; status?: number; keyword?: string } = {}) {
    const where: any = {};
    if (query.position) where.position = query.position;
    if (query.parentId) where.parentId = query.parentId;
    if (query.status !== undefined) where.status = query.status;
    const kw = (query.keyword || '').trim();
    if (kw) where.OR = [{ label: { contains: kw } }, { path: { contains: kw } }, { navKey: { contains: kw } }];

    return this.prisma.navMenu.findMany({ where, select: navSelect, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
  }

  async tree(position?: string) {
    const rows = await this.list(position ? { position } : {});
    return buildTree(rows as any[]);
  }

  /** 前台只读：仅启用项 */
  async publishedTree(position = 'header') {
    const rows = await this.prisma.navMenu.findMany({
      where: { position, status: 1 },
      select: navSelect,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return buildTree(rows as any[]).map(stripNode);
  }

  async detail(id: string) {
    const row = await this.prisma.navMenu.findUnique({ where: { id }, select: navSelect });
    if (!row) throw new NotFoundException('菜单不存在');
    return row;
  }

  async create(dto: CreateNavMenuDto) {
    const parent = await this.loadParent(dto.parentId);
    const position = parent ? parent.position : dto.position || 'header';
    const navKey = await this.resolveNavKey(dto.navKey, parent, dto.label);

    const created = await this.prisma.navMenu.create({
      data: {
        parentId: parent?.id ?? null,
        position,
        navKey,
        label: dto.label.trim(),
        labelEn: textOrNull(dto.labelEn),
        path: dto.path.trim(),
        icon: textOrNull(dto.icon),
        target: dto.target || '_self',
        sortOrder: dto.sortOrder ?? (await this.nextSortOrder(position, parent?.id ?? null)),
        status: dto.status ?? 1,
      },
    });
    return this.detail(created.id);
  }

  async update(id: string, dto: UpdateNavMenuDto) {
    const current = await this.detail(id);
    let position = current.position;

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) throw new BadRequestException('上级菜单不能是自己');
      const parent = await this.loadParent(dto.parentId);
      if (parent && (await this.isDescendant(parent.id, id))) throw new BadRequestException('上级菜单不能是自己的子项');
      position = parent ? parent.position : dto.position || current.position;
      await this.prisma.navMenu.update({ where: { id }, data: { parentId: parent?.id ?? null } });
    } else if (dto.position && !current.parentId) {
      position = dto.position;
    }

    await this.prisma.navMenu.update({
      where: { id },
      data: {
        position,
        label: dto.label?.trim(),
        labelEn: dto.labelEn === undefined ? undefined : textOrNull(dto.labelEn),
        path: dto.path?.trim(),
        icon: dto.icon === undefined ? undefined : textOrNull(dto.icon),
        target: dto.target,
        sortOrder: dto.sortOrder,
        status: dto.status,
      },
    });

    // 顶级改位置时带着子项一起移动，避免父子 position 不一致导致树断裂
    if (position !== current.position && !current.parentId) {
      await this.prisma.navMenu.updateMany({ where: { parentId: id }, data: { position } });
    }
    return this.detail(id);
  }

  async setStatus(id: string, status: number) {
    await this.detail(id);
    await this.prisma.navMenu.update({ where: { id }, data: { status } });
    return { ok: true };
  }

  /** 数据库层面是 Cascade 删除，后台默认要求先清空子项，避免误删整条栏目 */
  async remove(id: string, force = false) {
    await this.detail(id);
    const children = await this.prisma.navMenu.count({ where: { parentId: id } });
    if (children && !force) throw new BadRequestException(`该菜单下还有 ${children} 个子项，确认删除请勾选「连同子项」`);
    await this.prisma.navMenu.delete({ where: { id } });
    return { ok: true, children };
  }

  /** 拖拽排序：ids 为同一父级下的新顺序 */
  async resort(ids: string[]) {
    if (!ids?.length) return { ok: true };
    await Promise.all(
      ids.map((id, index) => this.prisma.navMenu.update({ where: { id }, data: { sortOrder: (index + 1) * 10 } })),
    );
    return { ok: true };
  }

  private async loadParent(parentId?: string) {
    if (!parentId) return null;
    const parent = await this.prisma.navMenu.findUnique({ where: { id: parentId } });
    if (!parent) throw new BadRequestException('上级菜单不存在');
    return parent;
  }

  /** navKey 留空时按 位置.父级编码.名称编码 自动生成，保证 seed 与后台手工添加都能幂等 */
  private async resolveNavKey(input: string | undefined, parent: { navKey: string | null } | null, label: string) {
    const key = textOrNull(input) ? normalizeCode(input as string) : '';
    if (!key) return null;
    const candidate = parent?.navKey ? `${parent.navKey}.${key}` : key;
    const hit = await this.prisma.navMenu.findUnique({ where: { navKey: candidate } });
    if (hit) throw new ConflictException(`菜单编码 ${candidate} 已存在`);
    return candidate;
  }

  private async nextSortOrder(position: string, parentId: string | null) {
    const max = await this.prisma.navMenu.findFirst({
      where: { position, parentId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return (max?.sortOrder ?? 0) + 10;
  }

  private async isDescendant(candidate: string, id: string): Promise<boolean> {
    let cursor: string | null = candidate;
    let guard = 0;
    while (cursor && guard++ < 50) {
      if (cursor === id) return true;
      const row = await this.prisma.navMenu.findUnique({ where: { id: cursor }, select: { parentId: true } });
      cursor = row?.parentId ?? null;
    }
    return false;
  }
}

function buildTree(rows: any[]): NavNode[] {
  const nodes = new Map<string, NavNode>();
  rows.forEach((r) => nodes.set(r.id, { ...r, children: [] }));
  const roots: NavNode[] = [];
  nodes.forEach((node) => {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

/** 前台不需要 navKey 与状态字段 */
function stripNode(node: NavNode): any {
  return {
    id: node.id,
    label: node.label,
    labelEn: node.labelEn,
    path: node.path,
    icon: node.icon,
    target: node.target,
    children: node.children.map(stripNode),
  };
}
