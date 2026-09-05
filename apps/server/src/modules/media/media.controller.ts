import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { Perm } from '../../common/decorators/perm.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../../common/audit/audit.service';
import { clientIp } from '../../common/middleware/tracer.middleware';
import { MediaService } from './media.service';
import { uploadLimits, uploadStorage } from './media.storage';
import { MediaQueryDto, RegisterMediaDto, UpdateMediaDto } from './dto/media.dto';

@ApiTags('后台-素材库')
@Controller('admin/media')
export class AdminMediaController {
  constructor(
    private readonly service: MediaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Perm('media:view')
  list(@Query() query: MediaQueryDto) {
    return this.service.list(query);
  }

  @Get('folders')
  @Perm('media:view')
  folders() {
    return this.service.folders();
  }

  @Get('references')
  @Perm('media:view')
  @ApiOperation({ summary: '查询某个 url 的引用次数' })
  references(@Query('url') url: string) {
    if (!url) throw new BadRequestException('缺少 url 参数');
    return this.service.countReferences(url).then((count) => ({ url, count }));
  }

  @Get(':id')
  @Perm('media:view')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post('upload')
  @Perm('media:upload')
  @UseInterceptors(FileInterceptor('file', { storage: uploadStorage, limits: uploadLimits() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传单个素材' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: RegisterMediaDto,
    @CurrentUser('id') operatorId: string,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('未接收到文件');
    const row = await this.service.register(file, dto?.alt);
    await this.audit.log({ userId: operatorId, action: 'create', target: `media:${row.id}`, ip: clientIp(req), payload: { url: row.url } });
    return row;
  }

  @Post('upload/batch')
  @Perm('media:upload')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: uploadStorage, limits: uploadLimits() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '批量上传素材' })
  async uploadBatch(@UploadedFiles() files: Express.Multer.File[], @CurrentUser('id') operatorId: string) {
    if (!files?.length) throw new BadRequestException('未接收到文件');
    const rows = [];
    for (const file of files) rows.push(await this.service.register(file));
    await this.audit.log({ userId: operatorId, action: 'create', target: 'media:batch', payload: { count: rows.length } });
    return rows;
  }

  @Put(':id')
  @Perm('media:edit')
  update(@Param('id') id: string, @Body() dto: UpdateMediaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Perm('media:delete')
  async remove(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @CurrentUser('id') operatorId: string,
    @Req() req: Request,
  ) {
    const row = await this.service.remove(id, force === '1' || force === 'true');
    await this.audit.log({ userId: operatorId, action: 'delete', target: `media:${id}`, ip: clientIp(req), payload: row });
    return row;
  }
}
