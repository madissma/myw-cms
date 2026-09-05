import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Perm } from '../../common/decorators/perm.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/auth/rate-limit.guard';
import { AuditService } from '../../common/audit/audit.service';
import { BulkIdsDto } from '../../common/dto/status.dto';
import { SettingService } from '../site/setting.service';
import { MessageService } from './message.service';
import {
  AssignMessageDto,
  MessageQueryDto,
  MessageStatusDto,
  ReplyMessageDto,
  SubmitMessageDto,
} from './dto/message.dto';

@ApiTags('后台留言箱')
@Controller('admin/messages')
export class AdminMessagesController {
  constructor(
    private readonly service: MessageService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Perm('message:view')
  list(@Query() query: MessageQueryDto) {
    return this.service.list(query);
  }

  @Get('counters')
  @Perm('message:view')
  @ApiOperation({ summary: '各状态留言数量' })
  counters() {
    return this.service.counters();
  }

  @Get('export')
  @Perm('message:export')
  @ApiOperation({ summary: '导出 CSV' })
  async exportCsv(@Query() query: MessageQueryDto, @Req() req: Request, @Res() res: Response) {
    const csv = await this.service.exportCsv(query, req);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="messages-${stamp}.csv"`);
    res.send(csv);
  }

  @Get(':id')
  @Perm('message:view')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Patch(':id/status')
  @Perm('message:edit')
  async setStatus(@Param('id') id: string, @Body() dto: MessageStatusDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.setStatus(id, dto.status);
    await this.audit.log({ userId: operatorId, action: 'update', target: `message:${id}`, payload: { status: dto.status } });
    return row;
  }

  @Patch(':id/assign')
  @Perm('message:edit')
  assign(@Param('id') id: string, @Body() dto: AssignMessageDto, @CurrentUser('id') operatorId: string) {
    return this.service.assign(id, dto.handlerId ?? operatorId);
  }

  @Post(':id/reply')
  @Perm('message:reply')
  @ApiOperation({ summary: '回复留言' })
  async reply(
    @Param('id') id: string,
    @Body() dto: ReplyMessageDto,
    @CurrentUser('id') operatorId: string,
    @Req() req: Request,
  ) {
    const row = await this.service.reply(id, dto, operatorId);
    await this.audit.log({ userId: operatorId, action: 'update', target: `message:${id}`, ip: req.ip, payload: dto });
    return row;
  }

  @Post('bulk-delete')
  @Perm('message:delete')
  async bulkRemove(@Body() dto: BulkIdsDto, @CurrentUser('id') operatorId: string) {
    const row = await this.service.removeMany(dto.ids);
    await this.audit.log({ userId: operatorId, action: 'delete', target: 'message:bulk', payload: dto });
    return row;
  }

  @Delete(':id')
  @Perm('message:delete')
  async remove(@Param('id') id: string, @CurrentUser('id') operatorId: string) {
    const row = await this.service.removeMany([id]);
    await this.audit.log({ userId: operatorId, action: 'delete', target: `message:${id}` });
    return row;
  }
}

@ApiTags('前台-留言')
@Controller('public/messages')
export class PublicMessagesController {
  constructor(
    private readonly service: MessageService,
    private readonly settings: SettingService,
  ) {}

  @Post()
  @Public()
  @RateLimit({ limit: 1, windowSec: 60 })
  @ApiOperation({ summary: '提交在线留言' })
  async submit(@Body() dto: SubmitMessageDto, @Req() req: Request) {
    const result = await this.service.submit(dto, req);
    const values = await this.settings.values();
    return { ...result, tip: values['form.successTip'] ?? '感谢您的留言，我们会尽快与您联系。' };
  }
}
