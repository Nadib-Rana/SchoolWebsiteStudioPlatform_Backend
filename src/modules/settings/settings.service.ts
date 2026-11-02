import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { UpdateSettingsDto } from "./dto/settings.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(schoolId: string) {
    const settings = await this.prisma.schoolSettings.findUnique({
      where: { schoolId },
    });

    if (!settings) {
      return this.prisma.schoolSettings.create({
        data: {
          schoolId,
          timezone: "Asia/Dhaka",
          dateFormat: "DD/MM/YYYY",
          language: "en",
          allowPublicAdmission: true,
          maintenanceMode: false,
        },
      });
    }

    return settings;
  }

  async updateSettings(schoolId: string, dto: UpdateSettingsDto) {
    await this.getSettings(schoolId);

    return this.prisma.schoolSettings.update({
      where: { schoolId },
      data: dto,
    });
  }
}
