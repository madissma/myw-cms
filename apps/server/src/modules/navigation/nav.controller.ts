import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Perm } from '../../common/decorators/perm.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BulkIdsDto, StatusDto } from '../../common/dto/status.dto';
import { AuditService } from '../../common/audit/audit.service';
import { NavService } from './nav.service';
import { CreateNavMenuDto, NavQueryDto, UpdateNavMenuDto } from './dto/nav-menu.dto';

@ApiTags('后台-导航栏目')
@Controller('admin/nav-menus')
export class NavMenuController {
  constructor(
    private readonly service: NavService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Perm('nav:view')
  @ApiOperation({ summary: '菜单平铺列表' })
  list(@Query() query: NavQueryDto) {
    return this.service.list(query);
  }

  @Get('tree')
  @Perm('nav:view')
  @ApiOperation({ summary: '菜单树' })
  tree(@Query('position') position?: string) {
    return this.service.tree(position);
  }

  @Get(':id')
  @Perm('nav:view')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post()
  @Perm('nav:create')
  async create(@Body() dto: CreateNavMenuDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.create(dto);
    await this.audit.log({ userId: operatorId, action: 'create', target: `nav:${row.id}`, payload: dto });
    return row;
  }

  @Put(':id')
  @Perm('nav:edit')
  async update(@Param('id') id: string, @Body() dto: UpdateNavMenuDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.update(id, dto);
    await this.audit.log({ userId: operatorId, action: 'update', target: `nav:${id}`, payload: dto });
    return row;
  }

  @Patch(':id/status')
  @Perm('nav:edit')
  setStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.service.setStatus(id, dto.status);
  }

  @Put('sort/index')
  @Perm('nav:edit')
  @ApiOperation({ summary: '同级拖拽排序' })
  resort(@Body() dto: BulkIdsDto, @CurrentUser('id') operatorId: string) {
    return this.service.resort(dto.ids).then((r) => {
      this.audit.log({ userId: operatorId, action: 'sort', target: 'nav', payload: { ids: dto.ids } });
      return r;
    });
  }

  @Delete(':id')
  @Perm('nav:delete')
  async remove(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser('id') operatorId: string,
  ) {
    const row = await this.service.remove(id, force === '1' || force === 'true');
    await this.audit.log({ userId: operatorId, action: 'delete', target: `nav:${id}`, payload: row });
    return row;
  }
}
