import { Module } from "@nestjs/common";
import { PagesService } from "./pages.service";
import { PageSectionsService } from "./page-sections.service";
import { PagesController } from "./pages.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [PagesController],
  providers: [PagesService, PageSectionsService, PrismaService],
  exports: [PagesService, PageSectionsService],
})
export class PagesModule {}
