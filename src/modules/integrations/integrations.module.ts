import { Module } from "@nestjs/common";
import { IntegrationsService } from "./integrations.service";
import { IntegrationsController } from "./integrations.controller";
import { ErpWebhookController } from "./erp-webhook.controller";
import { ErpClientService } from "./erp-client.service";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [IntegrationsController, ErpWebhookController],
  providers: [IntegrationsService, ErpClientService, PrismaService],
  exports: [IntegrationsService, ErpClientService],
})
export class IntegrationsModule {}
