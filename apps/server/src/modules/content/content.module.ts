import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { CONTENT_CONTROLLERS } from './content.controller';
import { AdminContentMetaController } from './content-meta.controller';

@Module({
  providers: [ContentService],
  controllers: [AdminContentMetaController, ...CONTENT_CONTROLLERS],
  exports: [ContentService],
})
export class ContentModule {}
