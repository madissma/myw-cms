import { Module } from '@nestjs/common';
import { SiteModule } from '../site/site.module';
import { NavigationModule } from '../navigation/navigation.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { ContentModule } from '../content/content.module';
import { PageModule } from '../page/page.module';
import { PublicCacheService } from './public-cache.service';
import { PublicService } from './public.service';
import {
  PublicHeadersInterceptor,
  PublicSiteController,
  PublicViewController,
  PUBLIC_CONTENT_CONTROLLERS,
} from './public.controller';

/** 前台只读聚合层：本身不写库，把各业务模块的已发布内容拼成前台一次所需的量 */
@Module({
  imports: [SiteModule, NavigationModule, TaxonomyModule, ContentModule, PageModule],
  controllers: [PublicSiteController, ...PUBLIC_CONTENT_CONTROLLERS, PublicViewController],
  providers: [PublicCacheService, PublicService, PublicHeadersInterceptor],
  exports: [PublicService, PublicCacheService],
})
export class PublicModule {}
