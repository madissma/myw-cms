import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Perm } from '../../common/decorators/perm.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BulkIdsDto, StatusDto } from '../../common/dto/status.dto';
import { ADMIN_MENUS } from '../../common/constants/permissions';
import { AuditService } from '../../common/audit/audit.service';
import { clientIp } from '../../common/middleware/tracer.middleware';
import { UserService } from './user.service';
import { OrgService } from './org.service';
import { RoleService } from './role.service';
import { DashboardService } from './dashboard.service';
import {
  CreateOrgDto,
  CreateRoleDto,
  CreateUserDto,
  LogQueryDto,
  OrgQueryDto,
  PurgeLogDto,
  ResetPasswordDto,
  UpdateOrgDto,
  UpdateRoleDto,
  UpdateUserDto,
  UserQueryDto,
} from './dto/system.dto';

@ApiTags('后台-用户')
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly service: UserService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Perm('system:user:view')
  @ApiOperation({ summary: '用户列表' })
  list(@Query() query: UserQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @Perm('system:user:view')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post()
  @Perm('system:user:create')
  async create(@Body() dto: CreateUserDto, @CurrentUser('id') operatorId: string, @Req() req: Request) {
    const row = await this.service.create(dto, operatorId);
    await this.audit.log({ userId: operatorId, action: 'create', target: `system:user:${row.id}`, ip: clientIp(req) });
    return row;
  }

  @Put(':id')
  @Perm('system:user:edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') operatorId: string,
    @Req() req: Request,
  ) {
    const row = await this.service.update(id, dto, operatorId);
    await this.audit.log({ userId: operatorId, action: 'update', target: `system:user:${id}`, ip: clientIp(req), payload: dto });
    return row;
  }

  @Patch(':id/status')
  @Perm('system:user:edit')
  async setStatus(@Param('id') id: string, @Body() dto: StatusDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.setStatus(id, dto.status, operatorId);
    await this.audit.log({ userId: operatorId, action: 'update', target: `system:user:${id}`, payload: { status: dto.status } });
    return row;
  }

  @Patch(':id/password')
  @Perm('system:user:reset')
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.resetPassword(id, dto);
    await this.audit.log({ userId: operatorId, action: 'update', target: `system:user:${id}:password` });
    return row;
  }

  @Delete(':id')
  @Perm('system:user:delete')
  async remove(@Param('id') id: string, @CurrentUser('id') operatorId: string, @Req() req: Request) {
    const row = await this.service.remove(id, operatorId);
    await this.audit.log({ userId: operatorId, action: 'delete', target: `system:user:${id}`, ip: clientIp(req) });
    return row;
  }
}

@ApiTags('后台-组织')
@Controller('admin/orgs')
export class AdminOrgsController {
  constructor(
    private readonly service: OrgService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Perm('system:org:view')
  @ApiOperation({ summary: '组织列表（平铺）' })
  list(@Query() query: OrgQueryDto) {
    return this.service.list(query);
  }

  @Get('tree')
  @Perm('system:org:view')
  @ApiOperation({ summary: '组织树' })
  tree() {
    return this.service.tree();
  }

  @Get(':id')
  @Perm('system:org:view')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post()
  @Perm('system:org:create')
  async create(@Body() dto: CreateOrgDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.create(dto);
    await this.audit.log({ userId: operatorId, action: 'create', target: `system:org:${row.id}`, payload: dto });
    return row;
  }

  @Put(':id')
  @Perm('system:org:edit')
  async update(@Param('id') id: string, @Body() dto: UpdateOrgDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.update(id, dto);
    await this.audit.log({ userId: operatorId, action: 'update', target: `system:org:${id}`, payload: dto });
    return row;
  }

  @Patch(':id/status')
  @Perm('system:org:edit')
  setStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.service.setStatus(id, dto.status);
  }

  @Put('sort/index')
  @Perm('system:org:edit')
  resort(@Body() dto: BulkIdsDto) {
    return this.service.resort(dto.ids);
  }

  @Delete(':id')
  @Perm('system:org:delete')
  async remove(@Param('id') id: string, @CurrentUser('id') operatorId: string) {
    const row = await this.service.remove(id);
    await this.audit.log({ userId: operatorId, action: 'delete', target: `system:org:${id}` });
    return row;
  }
}

@ApiTags('后台-角色权限')
@Controller('admin/roles')
export class AdminRolesController {
  constructor(
    private readonly service: RoleService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Perm('system:role:view')
  list(@Query() query: { keyword?: string }) {
    return this.service.list(query);
  }

  @Get('permissions')
  @Perm('system:role:view')
  @ApiOperation({ summary: '权限点目录（按组）' })
  catalog() {
    return this.service.catalog();
  }

  @Get(':id')
  @Perm('system:role:view')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post()
  @Perm('system:role:create')
  async create(@Body() dto: CreateRoleDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.create(dto);
    await this.audit.log({ userId: operatorId, action: 'create', target: `system:role:${row.id}`, payload: dto });
    return row;
  }

  @Put(':id')
  @Perm('system:role:edit')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.update(id, dto);
    await this.audit.log({ userId: operatorId, action: 'update', target: `system:role:${id}`, payload: dto });
    return row;
  }

  @Patch(':id/status')
  @Perm('system:role:edit')
  setStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.service.setStatus(id, dto.status);
  }

  @Delete(':id')
  @Perm('system:role:delete')
  async remove(@Param('id') id: string, @CurrentUser('id') operatorId: string) {
    const row = await this.service.remove(id);
    await this.audit.log({ userId: operatorId, action: 'delete', target: `system:role:${id}` });
    return row;
  }
}

@ApiTags('后台-系统')
@Controller('admin')
export class AdminSystemController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly audit: AuditService,
  ) {}

  @Get('dashboard/stats')
  @Perm('dashboard:view')
  @ApiOperation({ summary: '工作台统计' })
  stats() {
    return this.dashboard.stats();
  }

  /** 菜单树：登录即可获取，前端再按 permissions 过滤 */
  @Get('menus')
  @ApiOperation({ summary: '后台菜单树' })
  menus() {
    return ADMIN_MENUS;
  }

  @Get('operation-logs')
  @Perm('system:log:view')
  @ApiOperation({ summary: '操作日志列表' })
  logs(@Query() query: LogQueryDto) {
    return this.audit.list(query);
  }

  @Post('operation-logs/purge')
  @Perm('system:log:purge')
  @ApiOperation({ summary: '清理历史日志' })
  async purge(@Body() dto: PurgeLogDto, @CurrentUser('id') operatorId: string) {
    const count = await this.audit.purge(dto.days);
    await this.audit.log({ userId: operatorId, action: 'delete', target: 'system:log', payload: { days: dto.days, count } });
    return { count };
  }
}
