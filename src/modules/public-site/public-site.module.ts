import { Module } from "@nestjs/common";
import { PublicSiteService } from "./public-site.service";
import { PublicSiteController } from "./public-site.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [PublicSiteController],
  providers: [PublicSiteService, PrismaService],
  exports: [PublicSiteService],
})
export class PublicSiteModule {}
