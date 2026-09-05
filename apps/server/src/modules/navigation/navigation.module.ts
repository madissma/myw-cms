import { Module } from '@nestjs/common';
import { NavService } from './nav.service';
import { NavMenuController } from './nav.controller';

@Module({
  controllers: [NavMenuController],
  providers: [NavService],
  exports: [NavService],
})
export class NavigationModule {}
