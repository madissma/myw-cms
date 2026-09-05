import { Module } from '@nestjs/common';
import { SettingService } from './setting.service';
import { ThemeService } from './theme.service';
import { LocaleService } from './locale.service';
import {
  AdminSettingsController,
  AdminThemesController,
  AdminLocalesController,
  AdminTranslationsController,
} from './site.controller';

@Module({
  controllers: [AdminSettingsController, AdminThemesController, AdminLocalesController, AdminTranslationsController],
  providers: [SettingService, ThemeService, LocaleService],
  exports: [SettingService, ThemeService, LocaleService],
})
export class SiteModule {}
