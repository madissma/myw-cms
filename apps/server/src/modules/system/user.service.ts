import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SUPER_ADMIN } from '../auth/auth.service';
import { checkPasswordStrength, hashPassword, paginate, pageParams, searchFilter, textOrNull } from '../../common/utils/index.util';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto, UserQueryDto } from './dto/system.dto';

const userSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
  remark: true,
  status: true,
  orgId: true,
  lastLoginAt: true,
  createdAt: true,
  org: { select: { id: true, name: true } },
  roles: { include: { role: { select: { id: true, key: true, name: true } } } },
} as const;

type RoleRow = { role: { id: string; key: string; name: string } };

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: UserQueryDto) {
    const { page, pageSize } = pageParams(query);
    const where: any = {};
    if (query.status !== undefined) where.status = query.status;
    if (query.orgId) where.orgId = query.orgId;
    if (query.roleId) where.roles = { some: { roleId: query.roleId } };
    const kw = (query.keyword || '').trim();
    if (kw) where.OR = searchFilter(['username', 'name', 'email', 'phone'], kw);

    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: userSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(
      list.map((u) => ({
        ...u,
        roles: (u.roles as RoleRow[]).map((r) => r.role),
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    );
  }

  async detail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        remark: true,
        status: true,
        orgId: true,
        createdAt: true,
        roles: { select: { roleId: true } },
      },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return { ...user, roleIds: user.roles.map((r) => r.roleId), roles: undefined };
  }

  async create(dto: CreateUserDto, operatorId: string) {
    const username = dto.username.trim();
    if (username.length < 3) throw new BadRequestException('用户名至少 3 个字符');
    const weak = checkPasswordStrength(dto.password);
    if (weak) throw new BadRequestException(weak);

    const hit = await this.prisma.user.findUnique({ where: { username } });
    if (hit) throw new BadRequestException(`用户名 ${username} 已存在`);
    await this.assertOrg(dto.orgId);

    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(dto.password),
        name: dto.name.trim(),
        email: textOrNull(dto.email),
        phone: textOrNull(dto.phone),
        avatar: textOrNull(dto.avatar),
        remark: textOrNull(dto.remark),
        status: dto.status ?? 1,
        orgId: dto.orgId || null,
        roles: { create: (await this.validRoleIds(dto.roleIds)).map((roleId) => ({ role: { connect: { id: roleId } } })) },
      },
    });
    return this.detail(user.id);
  }

  async update(id: string, dto: UpdateUserDto, operatorId: string) {
    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('用户不存在');
    await this.assertOrg(dto.orgId);

    await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        email: dto.email === undefined ? undefined : textOrNull(dto.email),
        phone: dto.phone === undefined ? undefined : textOrNull(dto.phone),
        avatar: dto.avatar === undefined ? undefined : textOrNull(dto.avatar),
        remark: dto.remark === undefined ? undefined : textOrNull(dto.remark),
        status: dto.status,
        orgId: dto.orgId === undefined ? undefined : dto.orgId || null,
      },
    });

    if (dto.roleIds) {
      await this.assertNotLastSuperAdmin(id, {
        status: dto.status,
        roleIds: dto.roleIds,
      });
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      const roleIds = await this.validRoleIds(dto.roleIds);
      if (roleIds.length) await this.prisma.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });
    } else if (dto.status !== undefined) {
      await this.assertNotLastSuperAdmin(id, { status: dto.status });
    }
    return this.detail(id);
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    const weak = checkPasswordStrength(dto.password);
    if (weak) throw new BadRequestException(weak);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: hashPassword(dto.password) } });
    return { ok: true };
  }

  async setStatus(id: string, status: number, operatorId: string) {
    await this.assertNotLastSuperAdmin(id, { status });
    await this.prisma.user.update({ where: { id }, data: { status } });
    return { ok: true };
  }

  async remove(id: string, operatorId: string) {
    if (id === operatorId) throw new BadRequestException('不能删除当前登录账号');
    await this.assertNotLastSuperAdmin(id, { removed: true });
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  private async assertOrg(orgId?: string) {
    if (!orgId) return;
    const org = await this.prisma.org.findUnique({ where: { id: orgId } });
    if (!org) throw new BadRequestException('所选组织不存在');
  }

  private async validRoleIds(roleIds?: string[]) {
    if (!roleIds?.length) return [];
    const found = await this.prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true } });
    return found.map((r) => r.id);
  }

  /** 兜底：系统里必须留有一个可用的超级管理员 */
  private async assertNotLastSuperAdmin(
    userId: string,
    change: { status?: number; roleIds?: string[]; removed?: boolean },
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: { select: { key: true } } } } },
    });
    if (!target) throw new NotFoundException('用户不存在');
    if (!target.roles.some((r) => r.role.key === SUPER_ADMIN)) return;

    let stillSuper = target.status === 1;
    if (change.removed) stillSuper = false;
    if (change.status !== undefined && change.status !== 1) stillSuper = false;
    if (change.roleIds) {
      const roles = await this.prisma.role.findMany({ where: { id: { in: change.roleIds } }, select: { key: true } });
      stillSuper = stillSuper && roles.some((r) => r.key === SUPER_ADMIN);
    }
    if (!stillSuper) return;

    const others = await this.prisma.user.count({
      where: { id: { not: userId }, status: 1, roles: { some: { role: { key: SUPER_ADMIN } } } },
    });
    if (!others) throw new ForbiddenException('必须保留至少一个启用状态的超级管理员');
  }
}
