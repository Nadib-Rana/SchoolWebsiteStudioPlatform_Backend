import { Module } from "@nestjs/common";
import { NavigationService } from "./navigation.service";
import { NavigationController } from "./navigation.controller";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [NavigationController],
  providers: [NavigationService, PrismaService],
  exports: [NavigationService],
})
export class NavigationModule {}
