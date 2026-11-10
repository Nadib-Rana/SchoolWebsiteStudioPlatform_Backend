import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DomainsService } from "./domains.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import { CreateDomainDto, VerifyDomainDto } from "./dto/domains.dto";

@ApiTags("Custom Domains")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/domains")
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get()
  @ApiOperation({ summary: "Get school domains and DNS status" })
  @ResponseMessage("Domains retrieved successfully")
  async getDomains(@Param("id") id: string) {
    return this.domainsService.getDomains(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Connect a new custom domain" })
  @ResponseMessage("Custom domain registered")
  async addDomain(@Param("id") id: string, @Body() dto: CreateDomainDto) {
    return this.domainsService.addDomain(id, dto);
  }

  @Post(":domainId/verify")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Trigger DNS verification and SSL provisioning" })
  @ResponseMessage("DNS verification checked")
  async verifyDomain(
    @Param("id") id: string,
    @Param("domainId", ParseUUIDPipe) domainId: string,
    @Body() dto?: VerifyDomainDto,
  ) {
    return this.domainsService.verifyDomain(id, domainId, dto?.simulate);
  }

  @Post(":domainId/set-primary")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Set domain as primary public domain" })
  @ResponseMessage("Primary domain updated")
  async setPrimary(
    @Param("id") id: string,
    @Param("domainId", ParseUUIDPipe) domainId: string,
  ) {
    return this.domainsService.setPrimary(id, domainId);
  }

  @Delete(":domainId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Disconnect custom domain" })
  @ResponseMessage("Domain disconnected successfully")
  async removeDomain(
    @Param("id") id: string,
    @Param("domainId", ParseUUIDPipe) domainId: string,
  ) {
    return this.domainsService.removeDomain(id, domainId);
  }
}
