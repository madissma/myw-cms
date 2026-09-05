import { Module } from '@nestjs/common';
import { SiteModule } from '../site/site.module';
import { MessageService } from './message.service';
import { AdminMessagesController, PublicMessagesController } from './message.controller';

@Module({
  imports: [SiteModule],
  controllers: [AdminMessagesController, PublicMessagesController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
