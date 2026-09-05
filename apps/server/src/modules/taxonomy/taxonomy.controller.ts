import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Perm } from '../../common/decorators/perm.decorator';
import { BulkIdsDto, StatusDto } from '../../common/dto/status.dto';
import { TaxonomyService } from './taxonomy.service';
import { CreateTaxonomyDto, CreateTermDto, TermQueryDto, UpdateTaxonomyDto, UpdateTermDto } from './dto/taxonomy.dto';

@ApiTags('分类与术语')
@Controller('admin')
export class TaxonomyController {
  constructor(private readonly service: TaxonomyService) {}

  @Get('taxonomies')
  @Perm('taxonomy:view')
  @ApiOperation({ summary: '分类组列表' })
  listTaxonomies() {
    return this.service.listTaxonomies();
  }

  @Post('taxonomies')
  @Perm('taxonomy:create')
  createTaxonomy(@Body() dto: CreateTaxonomyDto) {
    return this.service.createTaxonomy(dto);
  }

  @Put('taxonomies/:id')
  @Perm('taxonomy:edit')
  updateTaxonomy(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.service.updateTaxonomy(id, dto);
  }

  @Delete('taxonomies/:id')
  @Perm('taxonomy:delete')
  removeTaxonomy(@Param('id') id: string) {
    return this.service.removeTaxonomy(id);
  }

  @Get('terms')
  @Perm('taxonomy:view')
  @ApiOperation({ summary: '术语列表' })
  listTerms(@Query() query: TermQueryDto) {
    return this.service.listTerms(query);
  }

  @Post('terms')
  @Perm('taxonomy:create')
  createTerm(@Body() dto: CreateTermDto) {
    return this.service.createTerm(dto);
  }

  @Put('terms/:id')
  @Perm('taxonomy:edit')
  updateTerm(@Param('id') id: string, @Body() dto: UpdateTermDto) {
    return this.service.updateTerm(id, dto);
  }

  @Patch('terms/:id/status')
  @Perm('taxonomy:edit')
  setTermStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.service.setStatus(id, dto.status);
  }

  @Put('terms/sort/index')
  @Perm('taxonomy:edit')
  resort(@Body() dto: BulkIdsDto) {
    return this.service.resort(dto.ids);
  }

  @Delete('terms/:id')
  @Perm('taxonomy:delete')
  removeTerm(@Param('id') id: string) {
    return this.service.removeTerm(id);
  }
}
