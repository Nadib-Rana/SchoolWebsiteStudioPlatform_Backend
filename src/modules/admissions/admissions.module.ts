import { Module } from "@nestjs/common";
import { AdmissionsController } from "./admissions.controller";
import { AdmissionsService } from "./admissions.service";
import { PrismaModule } from "../../database/prisma.module";
import { IntegrationsModule } from "../integrations/integrations.module";

@Module({
  imports: [PrismaModule, IntegrationsModule],
  controllers: [AdmissionsController],
  providers: [AdmissionsService],
  exports: [AdmissionsService],
})
export class AdmissionsModule {}
