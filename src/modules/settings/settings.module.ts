import { Module } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { SettingsController } from "./settings.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, PrismaService],
  exports: [SettingsService],
})
export class SettingsModule {}
