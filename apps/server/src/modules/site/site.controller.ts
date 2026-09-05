import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Perm } from '../../common/decorators/perm.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../../common/audit/audit.service';
import { clientIp } from '../../common/middleware/tracer.middleware';
import { SettingService } from './setting.service';
import { ThemeService } from './theme.service';
import { LocaleService } from './locale.service';
import {
  BulkSettingDto,
  BulkTranslationDto,
  CreateLocaleDto,
  CreateSettingDto,
  CreateThemeDto,
  SettingQueryDto,
  TranslationQueryDto,
  UpdateLocaleDto,
  UpdateSettingDto,
  UpdateThemeDto,
} from './dto/site.dto';

@ApiTags('后台-站点配置')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(
    private readonly service: SettingService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Perm('site:setting:view')
  list(@Query() query: SettingQueryDto) {
    return this.service.list(query);
  }

  @Get('group/:group')
  @Perm('site:setting:view')
  @ApiOperation({ summary: '按分组取配置' })
  byGroup(@Param('group') group: string) {
    return this.service.list({ group });
  }

  @Post()
  @Perm('site:setting:create')
  async create(@Body() dto: CreateSettingDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.create(dto);
    await this.audit.log({ userId: operatorId, action: 'create', target: `site:setting:${row.key}`, payload: dto });
    return row;
  }

  @Put('bulk')
  @Perm('site:setting:edit')
  @ApiOperation({ summary: '批量保存配置表单' })
  async bulk(@Body() dto: BulkSettingDto, @CurrentUser('id') operatorId: string, @Req() req: Request) {
    const result = await this.service.upsertBulk(dto.items);
    await this.audit.log({
      userId: operatorId,
      action: 'update',
      target: 'site:setting:bulk',
      ip: clientIp(req),
      payload: { keys: dto.items.map((i) => i.key) },
    });
    return result;
  }

  @Put(':id')
  @Perm('site:setting:edit')
  async update(@Param('id') id: string, @Body() dto: UpdateSettingDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.update(id, dto);
    await this.audit.log({ userId: operatorId, action: 'update', target: `site:setting:${row.key}`, payload: dto });
    return row;
  }

  @Delete(':id')
  @Perm('site:setting:delete')
  async remove(@Param('id') id: string, @CurrentUser('id') operatorId: string) {
    const row = await this.service.remove(id);
    await this.audit.log({ userId: operatorId, action: 'delete', target: `site:setting:${id}` });
    return row;
  }
}

@ApiTags('后台-网站风格')
@Controller('admin/themes')
export class AdminThemesController {
  constructor(
    private readonly service: ThemeService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Perm('site:theme:view')
  list() {
    return this.service.list();
  }

  @Get('active')
  @Perm('site:theme:view')
  active() {
    return this.service.active();
  }

  @Post()
  @Perm('site:theme:create')
  async create(@Body() dto: CreateThemeDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.create(dto);
    await this.audit.log({ userId: operatorId, action: 'create', target: `site:theme:${row.code}` });
    return row;
  }

  @Put(':id')
  @Perm('site:theme:edit')
  async update(@Param('id') id: string, @Body() dto: UpdateThemeDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.update(id, dto);
    await this.audit.log({ userId: operatorId, action: 'update', target: `site:theme:${row.code}`, payload: dto });
    return row;
  }

  @Post(':id/activate')
  @Perm('site:theme:activate')
  @ApiOperation({ summary: '启用主题（前台即时生效）' })
  async activate(@Param('id') id: string, @CurrentUser('id') operatorId: string) {
    const row = await this.service.activate(id);
    await this.audit.log({ userId: operatorId, action: 'publish', target: `site:theme:${row.code}` });
    return row;
  }

  @Post(':id/default')
  @Perm('site:theme:edit')
  setDefault(@Param('id') id: string) {
    return this.service.setDefault(id);
  }

  @Delete(':id')
  @Perm('site:theme:delete')
  remove(@Param('id') id: string, @CurrentUser('id') operatorId: string) {
    return this.service.remove(id).then((r) => {
      this.audit.log({ userId: operatorId, action: 'delete', target: `site:theme:${id}` });
      return r;
    });
  }
}

@ApiTags('后台-语言配置')
@Controller('admin/locales')
export class AdminLocalesController {
  constructor(private readonly service: LocaleService) {}

  @Get()
  @Perm('site:locale:view')
  list() {
    return this.service.list();
  }

  @Post()
  @Perm('site:locale:create')
  create(@Body() dto: CreateLocaleDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Perm('site:locale:edit')
  update(@Param('id') id: string, @Body() dto: UpdateLocaleDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/default')
  @Perm('site:locale:edit')
  setDefault(@Param('id') id: string) {
    return this.service.setDefault(id);
  }

  @Delete(':id')
  @Perm('site:locale:delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@ApiTags('后台-多语言翻译')
@Controller('admin/translations')
export class AdminTranslationsController {
  constructor(private readonly service: LocaleService) {}

  @Get()
  @Perm('site:translation:view')
  list(@Query() query: TranslationQueryDto) {
    return this.service.translations(query);
  }

  @Get('of/:entity/:entityId')
  @Perm('site:translation:view')
  @ApiOperation({ summary: '某条记录的译文集合' })
  ofEntity(@Param('entity') entity: string, @Param('entityId') entityId: string) {
    return this.service.ofEntity(entity, entityId);
  }

  @Post('upsert')
  @Perm('site:translation:edit')
  upsert(@Body() dto: BulkTranslationDto) {
    return this.service.upsertMany(dto.items as any);
  }

  @Delete(':id')
  @Perm('site:translation:delete')
  remove(@Param('id') id: string) {
    return this.service.removeTranslationById(id);
  }
}
