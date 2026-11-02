import { Module } from "@nestjs/common";
import { ThemeService } from "./theme.service";
import { ThemeController } from "./theme.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [ThemeController],
  providers: [ThemeService, PrismaService],
  exports: [ThemeService],
})
export class ThemeModule {}
