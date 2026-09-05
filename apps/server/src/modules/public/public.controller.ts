import {
  CallHandler,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  NestInterceptor,
  NotFoundException,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { pascal } from '../../common/utils/naming.util';
import { findResource, type ResourceDef } from '../content/content.registry';
import { PublicService } from './public.service';
import { PublicListQueryDto } from './dto/public.dto';

/**
 * 前台只读接口统一打上协商缓存标记。
 * ETag 由 Express 在 res.json() 时按响应体自动计算（默认 weak），
 * 配合 If-None-Match 直接返回 304，这里只补 Cache-Control。
 */
@Injectable()
export class PublicHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    return next.handle();
  }
}

@ApiTags('前台-站点')
@Public()
@UseInterceptors(PublicHeadersInterceptor)
@Controller('public')
export class PublicSiteController {
  constructor(private readonly service: PublicService) {}

  @Get('bootstrap')
  @ApiOperation({ summary: '站点骨架（site/theme/nav/分类/语言/全部配置）' })
  bootstrap(@Query('lang') lang?: string) {
    return this.service.bootstrap(lang);
  }

  @Get('pages')
  @ApiOperation({ summary: '已发布页面清单' })
  pages() {
    return this.service.pageKeys();
  }

  @Get('pages/:key')
  @ApiOperation({ summary: '整页装修数据（区块引用已解析）' })
  page(@Param('key') key: string, @Query('lang') lang?: string) {
    return this.service.page(key, lang);
  }
}

/** 前台 URL 片段 -> 内容资源，timeline 是 timeline-events 的短别名 */
const PUBLIC_CONTENT_ROUTES: { path: string; resource: string }[] = [
  { path: 'products', resource: 'products' },
  { path: 'news', resource: 'news' },
  { path: 'videos', resource: 'videos' },
  { path: 'reviews', resource: 'reviews' },
  { path: 'honors', resource: 'honors' },
  { path: 'timeline', resource: 'timeline-events' },
];

function createPublicContentController(route: { path: string; resource: string }) {
  const def: ResourceDef = findResource(route.resource);

  @ApiTags(`前台-${def.label}`)
  @Public()
  @UseInterceptors(PublicHeadersInterceptor)
  @Controller(`public/${route.path}`)
  class PublicResourceController {
    constructor(private readonly service: PublicService) {}

    @Get()
    @ApiOperation({ summary: `${def.label}列表（仅已发布）` })
    list(@Query() query: PublicListQueryDto) {
      return this.service.list(def, query);
    }

    @Get(':slug')
    @ApiOperation({ summary: `${def.label}详情 + 相关推荐` })
    detail(@Param('slug') slug: string, @Query('lang') lang?: string) {
      // 详情只对具备 slug 列的资源开放，否则会命中 Prisma 未知字段
      if (!def.hasSlug) throw new NotFoundException(`${def.label}不提供详情接口`);
      return this.service.detail(def, slug, lang);
    }
  }

  Object.defineProperty(PublicResourceController, 'name', { value: `Public${pascal(def.delegate)}Controller` });
  return PublicResourceController;
}

export const PUBLIC_CONTENT_CONTROLLERS = PUBLIC_CONTENT_ROUTES.map(createPublicContentController);

@ApiTags('前台-浏览量')
@Public()
@Controller('public/view')
export class PublicViewController {
  constructor(private readonly service: PublicService) {}

  @Post(':type/:id')
  @ApiOperation({ summary: '浏览量 +1（type 取 product | news）' })
  bump(@Param('type') type: string, @Param('id') id: string) {
    return this.service.view(viewTarget(type), id);
  }
}

/** 浏览量只对有 views 列的资源有意义，别名一并收敛 */
function viewTarget(type: string): ResourceDef {
  const normalized = (type || '').trim().toLowerCase();
  const alias: Record<string, string> = {
    product: 'products',
    products: 'products',
    news: 'news',
    article: 'news',
  };
  return findResource(alias[normalized] ?? normalized);
}
