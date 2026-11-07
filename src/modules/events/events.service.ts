import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
} from "./dto/events.dto";

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvents(schoolId: string, query: EventQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (query.category) {
      where.category = { contains: query.category, mode: "insensitive" };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.upcomingOnly) {
      where.eventDate = { gte: new Date() };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { venue: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.schoolEvent.count({ where }),
      this.prisma.schoolEvent.findMany({
        where,
        orderBy: { eventDate: "asc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEventById(schoolId: string, eventId: string) {
    const event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, schoolId },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return event;
  }

  async createEvent(schoolId: string, dto: CreateEventDto) {
    return this.prisma.schoolEvent.create({
      data: {
        schoolId,
        title: dto.title,
        category: dto.category || "Academic",
        eventDate: new Date(dto.eventDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        time: dto.time || null,
        venue: dto.venue || null,
        description: dto.description || null,
        bannerUrl: dto.bannerUrl || null,
        status: dto.status,
        registrationUrl: dto.registrationUrl || null,
      },
    });
  }

  async updateEvent(schoolId: string, eventId: string, dto: UpdateEventDto) {
    await this.getEventById(schoolId, eventId);

    return this.prisma.schoolEvent.update({
      where: { id: eventId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.eventDate !== undefined
          ? { eventDate: new Date(dto.eventDate) }
          : {}),
        ...(dto.endDate !== undefined
          ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
          : {}),
        ...(dto.time !== undefined ? { time: dto.time } : {}),
        ...(dto.venue !== undefined ? { venue: dto.venue } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.bannerUrl !== undefined ? { bannerUrl: dto.bannerUrl } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.registrationUrl !== undefined
          ? { registrationUrl: dto.registrationUrl }
          : {}),
      },
    });
  }

  async deleteEvent(schoolId: string, eventId: string) {
    await this.getEventById(schoolId, eventId);

    await this.prisma.schoolEvent.delete({
      where: { id: eventId },
    });

    return { message: "Event deleted successfully" };
  }
}
