import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { checkPasswordStrength, hashPassword, verifyPassword } from '../../common/utils/password.util';
import type { AuthUser, JwtPayload } from '../../common/auth/auth-user.interface';
import type { ChangePasswordDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';

export const SUPER_ADMIN = 'super_admin';

type UserWithRoles = User & { roles: { role: { key: string } }[] };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  /** 登录并签发双 token；失败统一 401，不泄露用户名是否存在 */
  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !verifyPassword(dto.password, user.passwordHash)) {
      await this.audit.log({
        userId: user?.id,
        username: dto.username,
        action: 'login',
        target: `auth:login:${dto.username}`,
        ip,
        payload: { result: 'failed' },
      });
      throw new UnauthorizedException('用户名或密码错误');
    }
    if (user.status !== 1) throw new UnauthorizedException('账号已被禁用，请联系管理员');

    const authUser = await this.buildAuthUser(user);
    const tokens = await this.issueTokens(authUser);

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.log({ userId: user.id, username: user.username, action: 'login', target: 'auth:login', ip });

    return { ...tokens, user: authUser };
  }

  async refresh(token: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('刷新凭证无效');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('凭证类型不正确');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: true } } },
    });
    if (!user || user.status !== 1) throw new UnauthorizedException('账号不可用');

    const authUser = await this.buildAuthUser(user);
    return this.issueTokens(authUser);
  }

  /** 供前端渲染菜单：基础资料 + 角色 + 权限点 */
  async profile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } }, org: true },
    });
    if (!user) throw new UnauthorizedException('用户不存在');

    const permissions = await this.resolvePermissions(user.roles.map((r) => r.role.key));
    const { passwordHash, roles, org, ...rest } = user;
    return {
      ...rest,
      orgName: org?.name ?? null,
      roles: roles.map((r) => r.role.key),
      roleNames: roles.map((r) => r.role.name),
      permissions,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name?.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        avatar: dto.avatar?.trim() || null,
      },
    });
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    if (!verifyPassword(dto.oldPassword, user.passwordHash)) throw new BadRequestException('原密码不正确');

    const weak = checkPasswordStrength(dto.newPassword);
    if (weak) throw new BadRequestException(weak);

    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(dto.newPassword) } });
    await this.audit.log({ userId: user.id, username: user.username, action: 'update', target: 'auth:password', ip });
    return { ok: true };
  }

  /** super_admin 直接给通配权限点，其余角色按 RolePermission 展开 */
  async resolvePermissions(roleKeys: string[]): Promise<string[]> {
    if (!roleKeys.length) return [];
    if (roleKeys.includes(SUPER_ADMIN)) return ['*'];
    const rows = await this.prisma.permission.findMany({
      where: { roles: { some: { role: { key: { in: roleKeys } } } } },
      select: { key: true },
    });
    return Array.from(new Set(rows.map((r) => r.key)));
  }

  private async buildAuthUser(user: UserWithRoles): Promise<AuthUser> {
    const roles = user.roles.map((r) => r.role.key);
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      roles,
      permissions: await this.resolvePermissions(roles),
    };
  }

  private async issueTokens(authUser: AuthUser) {
    const base: JwtPayload = {
      sub: authUser.id,
      username: authUser.username,
      name: authUser.name,
      roles: authUser.roles,
      permissions: authUser.permissions,
    };
    const accessToken = await this.jwt.signAsync({ ...base, type: 'access' });
    const refreshToken = await this.jwt.signAsync({ ...base, type: 'refresh' }, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN as any,
    });
    return { accessToken, refreshToken };
  }
}
