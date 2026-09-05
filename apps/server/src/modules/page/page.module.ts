import { Module } from '@nestjs/common';
import { SiteModule } from '../site/site.module';
import { PageService } from './page.service';
import { BlockAssembler } from './block-assembler.service';
import { PageController } from './page.controller';

@Module({
  imports: [SiteModule],
  controllers: [PageController],
  providers: [PageService, BlockAssembler],
  exports: [PageService, BlockAssembler],
})
export class PageModule {}
