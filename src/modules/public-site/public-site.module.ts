import { Module } from "@nestjs/common";
import { PublicSiteService } from "./public-site.service";
import { PublicInquiryService } from "./public-inquiry.service";
import { PublicResourceService } from "./public-resource.service";
import { PublicSiteController } from "./public-site.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [PublicSiteController],
  providers: [
    PublicSiteService,
    PublicInquiryService,
    PublicResourceService,
    PrismaService,
  ],
  exports: [PublicSiteService, PublicInquiryService, PublicResourceService],
})
export class PublicSiteModule {}
