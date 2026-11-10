import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import { Public } from "../../common/decorators/public.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { TrackEventDto } from "./dto/track-event.dto";

@ApiTags("Public Website Delivery")
@Controller("public/analytics")
export class PublicAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Post("track")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Record anonymous page view or public visit event" })
  @ResponseMessage("Event recorded")
  async trackEvent(
    @Body() dto: TrackEventDto,
    @Ip() ip?: string,
    @Headers("user-agent") userAgent?: string,
  ) {
    return this.analyticsService.recordEvent(dto, ip, userAgent);
  }
}
