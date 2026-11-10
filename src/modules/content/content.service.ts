import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { UpdateContentDto } from "./dto/content.dto";

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getContent(schoolId: string) {
    const [school, profile] = await Promise.all([
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, name: true, slug: true, logoUrl: true },
      }),
      this.prisma.schoolProfile.findUnique({
        where: { schoolId },
      }),
    ]);

    if (!profile) {
      throw new NotFoundException("School profile not found");
    }

    // Calculate completion percentages matching frontend contentItems
    const hasInfo = Boolean(profile.address && profile.phone && profile.email);
    const hasAbout = Boolean(
      profile.motto &&
      (profile.visionStatement || (profile as any).vision) &&
      (profile.missionStatement || (profile as any).mission),
    );
    const hasPrincipal = Boolean(
      profile.principalName &&
      (profile.principalBio || (profile as any).principalMessage),
    );
    const hasAcademicInfo = Boolean(
      (profile.academics as any)?.programs?.length,
    );
    const hasFacilities = Boolean(
      (profile.academics as any)?.facilities?.length,
    );
    const hasStats = Boolean(
      (profile.stats as any)?.studentsCount || (profile as any).statistics,
    );

    const completionItems = [
      {
        key: "school_info",
        name: "School information",
        description: "Core identity, contact details, logo and address",
        progress: hasInfo ? "100%" : "60%",
      },
      {
        key: "about_school",
        name: "About school",
        description: "History, mission, vision and educational values",
        progress: hasAbout ? "100%" : "75%",
      },
      {
        key: "principal_message",
        name: "Principal message",
        description: "Public welcome message and principal profile",
        progress: hasPrincipal ? "100%" : "50%",
      },
      {
        key: "academic_info",
        name: "Academic information",
        description: "Curriculum, teaching approach and school calendar",
        progress: hasAcademicInfo ? "85%" : "40%",
      },
      {
        key: "classes_grades",
        name: "Classes and grades",
        description: "Grade levels, sections and enrollment information",
        progress: "85%",
      },
      {
        key: "subjects",
        name: "Subjects",
        description: "Subject catalog organized by grade and program",
        progress: "70%",
      },
      {
        key: "facilities",
        name: "Facilities",
        description: "Campus facilities and approved public details",
        progress: hasFacilities ? "90%" : "50%",
      },
      {
        key: "achievements",
        name: "Achievements",
        description: "Awards, distinctions and school milestones",
        progress: hasStats ? "80%" : "45%",
      },
    ];

    return {
      school,
      profile,
      completionItems,
    };
  }

  async updateContent(schoolId: string, dto: UpdateContentDto) {
    const {
      establishedYear,
      schoolName,
      schoolCode,
      schoolType,
      logoUrl,
      ...profileData
    } = dto;
    const established = dto.established ?? establishedYear;

    if (schoolName || logoUrl !== undefined) {
      await this.prisma.school.update({
        where: { id: schoolId },
        data: {
          ...(schoolName ? { name: schoolName } : {}),
          ...(logoUrl !== undefined ? { logoUrl } : {}),
        },
      });
    }

    const dataToSave = {
      ...profileData,
      ...(established !== undefined ? { established } : {}),
    };

    const existing = await this.prisma.schoolProfile.findUnique({
      where: { schoolId },
    });

    if (!existing) {
      return this.prisma.schoolProfile.create({
        data: {
          schoolId,
          ...dataToSave,
        },
      });
    }

    return this.prisma.schoolProfile.update({
      where: { schoolId },
      data: dataToSave,
    });
  }
}
