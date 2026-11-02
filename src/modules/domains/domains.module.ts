import { Module } from "@nestjs/common";
import { DomainsService } from "./domains.service";
import { DomainsController } from "./domains.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [DomainsController],
  providers: [DomainsService, PrismaService],
  exports: [DomainsService],
})
export class DomainsModule {}
