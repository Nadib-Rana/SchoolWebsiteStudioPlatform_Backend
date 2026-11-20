import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { IntegrationsService } from "./integrations.service";

@ApiTags("Integrations & ERP Sync")
@Controller("public/webhooks/erp")
export class ErpWebhookController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Public()
  @Post(":schoolIdOrSlug")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Receive HMAC-signed admission status webhooks from connected School ERP",
  })
  @ResponseMessage("ERP webhook processed successfully")
  async receiveWebhook(
    @Param("schoolIdOrSlug") schoolIdOrSlug: string,
    @Body() body: Record<string, any>,
    @Headers("x-erp-signature") signature?: string,
    @Req() req?: Request & { rawBody?: Buffer },
  ) {
    const rawPayload = req?.rawBody
      ? req.rawBody
      : JSON.stringify(body || {});
    return this.integrationsService.handleErpWebhook(
      schoolIdOrSlug,
      rawPayload,
      body || {},
      signature,
    );
  }
}

