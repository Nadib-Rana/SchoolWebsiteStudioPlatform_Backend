import { Module } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { I18nService } from "./i18n.service";
import { SettingsController } from "./settings.controller";

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, I18nService],
  exports: [SettingsService, I18nService],
})
export class SettingsModule {}
