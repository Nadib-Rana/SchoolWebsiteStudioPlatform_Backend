import { Module } from "@nestjs/common";
import { SchoolsService } from "./schools.service";
import { SchoolsController } from "./schools.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [SchoolsController],
  providers: [SchoolsService, PrismaService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
