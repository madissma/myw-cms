import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Perm } from '../../common/decorators/perm.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { BulkIdsDto, StatusDto } from '../../common/dto/status.dto';
import { AuditService } from '../../common/audit/audit.service';
import { clientIp } from '../../common/middleware/tracer.middleware';
import { pascal } from '../../common/utils/naming.util';
import { ContentService } from './content.service';
import { CONTENT_RESOURCES, ResourceDef } from './content.registry';

/**
 * 按资源描述生成后台 CRUD 控制器，六类内容共用同一套实现。
 * 路由：/api/v1/admin/<def.key>[/...]
 */
export function createContentController(def: ResourceDef) {
  @ApiTags(`后台-${def.label}`)
  @Controller(`admin/${def.key}`)
  class AdminResourceController {
    constructor(
      private readonly service: ContentService,
      private readonly audit: AuditService,
    ) {}

    @Get()
    @Perm(`${def.perm}:view`)
    @ApiOperation({ summary: `${def.label}列表` })
    list(@Query() query: PageQueryDto) {
      return this.service.list(def, query);
    }

    @Get(':id')
    @Perm(`${def.perm}:view`)
    @ApiOperation({ summary: `${def.label}详情` })
    detail(@Param('id') id: string) {
      return this.service.detail(def, id);
    }

    @Post()
    @Perm(`${def.perm}:create`)
    @ApiOperation({ summary: `新增${def.label}` })
    async create(@Body() body: Record<string, any>, @CurrentUser('id') userId: string, @Req() req: Request) {
      const row = await this.service.create(def, body);
      await this.audit.log({ userId, action: 'create', target: `${def.target}:${row.id}`, ip: clientIp(req), payload: body });
      return row;
    }

    @Put(':id')
    @Perm(`${def.perm}:edit`)
    @ApiOperation({ summary: `编辑${def.label}` })
    async update(@Param('id') id: string, @Body() body: Record<string, any>, @CurrentUser('id') userId: string, @Req() req: Request) {
      const row = await this.service.update(def, id, body);
      await this.audit.log({ userId, action: 'update', target: `${def.target}:${id}`, ip: clientIp(req), payload: body });
      return row;
    }

    @Patch(':id/status')
    @Perm(`${def.perm}:edit`)
    @ApiOperation({ summary: `${def.label}上下架` })
    async setStatus(@Param('id') id: string, @Body() dto: StatusDto, @CurrentUser('id') userId: string, @Req() req: Request) {
      const row = await this.service.setStatus(def, id, dto.status);
      await this.audit.log({ userId, action: 'publish', target: `${def.target}:${id}`, ip: clientIp(req), payload: { status: dto.status } });
      return row;
    }

    @Put('sort/index')
    @Perm(`${def.perm}:edit`)
    @ApiOperation({ summary: `${def.label}排序` })
    resort(@Body() dto: BulkIdsDto, @CurrentUser('id') userId: string) {
      return this.service.resort(def, dto.ids).then((r) => {
        this.audit.log({ userId, action: 'sort', target: def.target, payload: { ids: dto.ids } });
        return r;
      });
    }

    @Delete(':id')
    @Perm(`${def.perm}:delete`)
    @ApiOperation({ summary: `删除${def.label}` })
    async remove(@Param('id') id: string, @CurrentUser('id') userId: string, @Req() req: Request) {
      const r = await this.service.remove(def, id);
      await this.audit.log({ userId, action: 'delete', target: `${def.target}:${id}`, ip: clientIp(req) });
      return r;
    }

    @Post('bulk-delete')
    @Perm(`${def.perm}:delete`)
    @ApiOperation({ summary: `批量删除${def.label}` })
    bulkRemove(@Body() dto: BulkIdsDto, @CurrentUser('id') userId: string) {
      return this.service.bulkRemove(def, dto.ids).then((r) => {
        this.audit.log({ userId, action: 'delete', target: def.target, payload: { ids: dto.ids } });
        return r;
      });
    }
  }

  Object.defineProperty(AdminResourceController, 'name', { value: `Admin${pascal(def.delegate)}Controller` });
  return AdminResourceController;
}

export const CONTENT_CONTROLLERS = CONTENT_RESOURCES.map(createContentController);
