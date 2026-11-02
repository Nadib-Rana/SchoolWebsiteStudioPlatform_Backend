import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";

@ApiTags("Analytics & Reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: "Get school website analytics, top pages and traffic sources" })
  @ResponseMessage("Analytics data retrieved successfully")
  async getAnalytics(
    @Param("id") id: string,
    @Query("days") days?: number,
  ) {
    return this.analyticsService.getAnalytics(id, days ? Number(days) : 30);
  }
}
