import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { EventsService } from "./events.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { SchoolRolesGuard } from "../../common/guards/school-roles.guard";
import { SchoolRoles } from "../../common/decorators/school-roles.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { SchoolRole } from "@prisma/client";
import {
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
} from "./dto/events.dto";

@ApiTags("School Events & Calendar")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("schools/:id/events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: "List school events with filtering and search" })
  @ResponseMessage("Events retrieved successfully")
  async getEvents(@Param("id") id: string, @Query() query: EventQueryDto) {
    return this.eventsService.getEvents(id, query);
  }

  @Get(":eventId")
  @ApiOperation({ summary: "Get single event by ID" })
  @ResponseMessage("Event details retrieved")
  async getEventById(
    @Param("id") id: string,
    @Param("eventId", ParseUUIDPipe) eventId: string,
  ) {
    return this.eventsService.getEventById(id, eventId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Create a new event" })
  @ResponseMessage("Event created successfully")
  async createEvent(@Param("id") id: string, @Body() dto: CreateEventDto) {
    return this.eventsService.createEvent(id, dto);
  }

  @Patch(":eventId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN, SchoolRole.EDITOR)
  @ApiOperation({ summary: "Update event" })
  @ResponseMessage("Event updated successfully")
  async updateEvent(
    @Param("id") id: string,
    @Param("eventId", ParseUUIDPipe) eventId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(id, eventId, dto);
  }

  @Delete(":eventId")
  @UseGuards(SchoolRolesGuard)
  @SchoolRoles(SchoolRole.OWNER, SchoolRole.ADMIN)
  @ApiOperation({ summary: "Delete event" })
  @ResponseMessage("Event deleted successfully")
  async deleteEvent(
    @Param("id") id: string,
    @Param("eventId", ParseUUIDPipe) eventId: string,
  ) {
    return this.eventsService.deleteEvent(id, eventId);
  }
}
