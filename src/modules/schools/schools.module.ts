import { Module } from "@nestjs/common";
import { SchoolsService } from "./schools.service";
import { SchoolMembersService } from "./school-members.service";
import { SchoolOverviewService } from "./school-overview.service";
import { SchoolSetupService } from "./school-setup.service";
import { SchoolsController } from "./schools.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [SchoolsController],
  providers: [
    SchoolsService,
    SchoolMembersService,
    SchoolOverviewService,
    SchoolSetupService,
    PrismaService,
  ],
  exports: [
    SchoolsService,
    SchoolMembersService,
    SchoolOverviewService,
    SchoolSetupService,
  ],
})
export class SchoolsModule {}
