import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Perm } from '../../common/decorators/perm.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BulkIdsDto, StatusDto } from '../../common/dto/status.dto';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { AuditService } from '../../common/audit/audit.service';
import { clientIp } from '../../common/middleware/tracer.middleware';
import { PageService } from './page.service';
import { BLOCK_TYPE_OPTIONS, ENTITY_SOURCES, blockSchemas } from './block.schema';
import {
  BlockQueryDto,
  CreateBlockDto,
  CreatePageDto,
  CreateSectionDto,
  SavePageTreeDto,
  UpdateBlockDto,
  UpdatePageDto,
  UpdateSectionDto,
} from './dto/page.dto';

@ApiTags('后台-页面装修')
@Controller('admin/pages')
export class PageController {
  constructor(
    private readonly service: PageService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Perm('page:view')
  list(@Query() query: PageQueryDto) {
    return this.service.list(query);
  }

  @Get('block-schemas')
  @Perm('page:view')
  @ApiOperation({ summary: '区块类型表单定义（供后台动态渲染）' })
  schemas() {
    return { types: BLOCK_TYPE_OPTIONS, entities: ENTITY_SOURCES, schemas: blockSchemas() };
  }

  @Get(':id')
  @Perm('page:view')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post()
  @Perm('page:create')
  async create(@Body() dto: CreatePageDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.create(dto);
    await this.audit.log({ userId: operatorId, action: 'create', target: `page:${row.key}` });
    return row;
  }

  @Put('tree/:id')
  @Perm('page:edit')
  @ApiOperation({ summary: '整页保存 Page + Section + Block' })
  async saveTree(@Param('id') id: string, @Body() dto: SavePageTreeDto, @CurrentUser('id') operatorId: string, @Req() req: Request) {
    const row = await this.service.saveTree(id, dto);
    await this.audit.log({
      userId: operatorId,
      action: 'update',
      target: `page:${row.key}`,
      ip: clientIp(req),
      payload: { sections: dto.sections?.length ?? 0 },
    });
    return row;
  }

  @Put(':id')
  @Perm('page:edit')
  async update(@Param('id') id: string, @Body() dto: UpdatePageDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.update(id, dto);
    await this.audit.log({ userId: operatorId, action: 'update', target: `page:${row.key}`, payload: dto });
    return row;
  }

  @Patch(':id/status')
  @Perm('page:publish')
  async setStatus(@Param('id') id: string, @Body() dto: StatusDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.setStatus(id, dto.status);
    await this.audit.log({ userId: operatorId, action: 'publish', target: `page:${id}`, payload: { status: dto.status } });
    return row;
  }

  @Delete(':id')
  @Perm('page:delete')
  async remove(@Param('id') id: string, @CurrentUser('id') operatorId: string) {
    const row = await this.service.remove(id);
    await this.audit.log({ userId: operatorId, action: 'delete', target: `page:${id}` });
    return row;
  }

  // ---------- Section ----------

  @Post(':id/sections')
  @Perm('page:edit')
  createSection(@Param('id') id: string, @Body() dto: CreateSectionDto) {
    return this.service.createSection(id, dto);
  }

  @Put('sections/:id')
  @Perm('page:edit')
  updateSection(@Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.service.updateSection(id, dto);
  }

  @Patch('sections/:id/status')
  @Perm('page:edit')
  sectionStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.service.updateSection(id, { status: dto.status });
  }

  @Put('sections/sort/index')
  @Perm('page:edit')
  @ApiOperation({ summary: '区块组排序（body.pageId 由查询参数给出）' })
  resortSections(@Query('pageId') pageId: string, @Body() dto: BulkIdsDto) {
    return this.service.resortSections(pageId, dto.ids);
  }

  @Delete('sections/:id')
  @Perm('page:delete')
  removeSection(@Param('id') id: string) {
    return this.service.removeSection(id);
  }

  // ---------- Block ----------

  @Get('blocks/index')
  @Perm('page:view')
  blocks(@Query() query: BlockQueryDto) {
    return this.service.listBlocks(query);
  }

  @Post('sections/:id/blocks')
  @Perm('page:edit')
  createBlock(@Param('id') id: string, @Body() dto: CreateBlockDto) {
    return this.service.createBlock(id, dto);
  }

  @Put('blocks/:id')
  @Perm('page:edit')
  updateBlock(@Param('id') id: string, @Body() dto: UpdateBlockDto) {
    return this.service.updateBlock(id, dto);
  }

  @Patch('blocks/:id/move')
  @Perm('page:edit')
  @ApiOperation({ summary: '区块移动到另一个区块组' })
  moveBlock(@Param('id') id: string, @Body('sectionId') sectionId: string) {
    return this.service.moveBlock(id, sectionId);
  }

  @Patch('blocks/:id/status')
  @Perm('page:edit')
  blockStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.service.updateBlock(id, { status: dto.status });
  }

  @Put('blocks/sort/index')
  @Perm('page:edit')
  resortBlocks(@Query('sectionId') sectionId: string, @Body() dto: BulkIdsDto) {
    return this.service.resortBlocks(sectionId, dto.ids);
  }

  @Delete('blocks/:id')
  @Perm('page:delete')
  removeBlock(@Param('id') id: string) {
    return this.service.removeBlock(id);
  }
}
