import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PERMISSIONS } from '../../common/constants/permissions';
import { textOrNull } from '../../common/utils/html.util';
import { CreateRoleDto, UpdateRoleDto } from './dto/system.dto';

/** seed 写入的角色：允许改名称与权限，但不可删除、不可改 key */
const PROTECTED_ROLE_KEYS = new Set(['super_admin', 'content_admin', 'editor', 'seo_admin', 'viewer']);

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { keyword?: string } = {}) {
    const where: any = {};
    const kw = (query.keyword || '').trim();
    if (kw) where.OR = [{ name: { contains: kw } }, { key: { contains: kw } }];

    const rows = await this.prisma.role.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        permissions: { include: { permission: { select: { key: true } } } },
        _count: { select: { users: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      remark: r.remark,
      sortOrder: r.sortOrder,
      status: r.status,
      builtin: PROTECTED_ROLE_KEYS.has(r.key),
      userCount: r._count.users,
      permissionKeys: r.permissions.map((p) => p.permission.key),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async detail(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: { select: { key: true } } } } },
    });
    if (!role) throw new NotFoundException('角色不存在');
    return {
      id: role.id,
      key: role.key,
      name: role.name,
      remark: role.remark,
      sortOrder: role.sortOrder,
      status: role.status,
      builtin: PROTECTED_ROLE_KEYS.has(role.key),
      permissionKeys: role.permissions.map((p) => p.permission.key),
    };
  }

  /** 权限点目录：按 group 聚合，后台授权页勾选树的数据源 */
  catalog() {
    const groups = new Map<string, { key: string; name: string }[]>();
    for (const p of PERMISSIONS) {
      if (!groups.has(p.group)) groups.set(p.group, []);
      groups.get(p.group)!.push({ key: p.key, name: p.name });
    }
    return [...groups.entries()].map(([group, items]) => ({ group, items }));
  }

  async create(dto: CreateRoleDto) {
    const key = textOrNull(dto.key);
    if (!key) throw new BadRequestException('角色标识不能为空');
    if (!/^[a-z][a-z0-9_]*$/.test(key)) throw new BadRequestException('角色标识仅支持小写字母、数字与下划线');
    const hit = await this.prisma.role.findUnique({ where: { key } });
    if (hit) throw new ConflictException(`角色标识 ${key} 已存在`);

    const created = await this.prisma.role.create({
      data: {
        key,
        name: dto.name.trim(),
        remark: textOrNull(dto.remark),
        sortOrder: dto.sortOrder ?? 0,
        permissions: { create: await this.permissionCreates(dto.permissionKeys) },
      },
    });
    return this.detail(created.id);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const current = await this.prisma.role.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('角色不存在');
    if (current.key === 'super_admin' && dto.permissionKeys && !dto.permissionKeys.includes('*')) {
      throw new BadRequestException('超级管理员权限不可收回');
    }

    await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        remark: dto.remark === undefined ? undefined : textOrNull(dto.remark),
        sortOrder: dto.sortOrder,
      },
    });

    if (dto.permissionKeys) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      const creates = await this.permissionCreates(dto.permissionKeys);
      if (creates.length) await this.prisma.rolePermission.createMany({ data: creates.map((c) => ({ roleId: id, ...c })) });
    }
    return this.detail(id);
  }

  async setStatus(id: string, status: number) {
    const current = await this.prisma.role.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('角色不存在');
    if (current.key === 'super_admin') throw new BadRequestException('超级管理员角色不可停用');
    await this.prisma.role.update({ where: { id }, data: { status } });
    return { ok: true };
  }

  async remove(id: string) {
    const current = await this.prisma.role.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('角色不存在');
    if (PROTECTED_ROLE_KEYS.has(current.key)) throw new BadRequestException('预置角色不可删除，可调整其权限点');
    const inUse = await this.prisma.userRole.count({ where: { roleId: id } });
    if (inUse) throw new BadRequestException(`该角色下还有 ${inUse} 名用户，无法删除`);
    await this.prisma.role.delete({ where: { id } });
    return { ok: true };
  }

  private async permissionCreates(keys?: string[]) {
    if (!keys?.length) return [];
    const wanted = keys.filter((k) => k !== '*');
    if (keys.includes('*')) return this.allPermissionCreates();
    if (!wanted.length) return [];
    const found = await this.prisma.permission.findMany({ where: { key: { in: wanted } }, select: { id: true } });
    return found.map((p) => ({ permissionId: p.id }));
  }

  private async allPermissionCreates() {
    const found = await this.prisma.permission.findMany({ select: { id: true } });
    return found.map((p) => ({ permissionId: p.id }));
  }
}
