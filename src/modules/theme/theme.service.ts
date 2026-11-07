import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { UpdateThemeDraftDto } from "./dto/theme.dto";

@Injectable()
export class ThemeService {
  constructor(private readonly prisma: PrismaService) {}

  async getTheme(schoolId: string) {
    const themeConfig = await this.prisma.schoolThemeConfig.findUnique({
      where: { schoolId },
    });

    if (!themeConfig) {
      // Default theme if not yet created
      return this.prisma.schoolThemeConfig.create({
        data: {
          schoolId,
          activeTheme: "theme-classic",
          selectedTemplate: "tpl-classic",
          primaryColor: "#1E3A8A",
          secondaryColor: "#0D9488",
          accentColor: "#F59E0B",
        },
      });
    }

    return themeConfig;
  }

  async saveDraft(schoolId: string, dto: UpdateThemeDraftDto) {
    const existing = await this.getTheme(schoolId);

    return this.prisma.schoolThemeConfig.update({
      where: { schoolId },
      data: {
        draftConfig: {
          ...(existing.draftConfig as object),
          ...dto,
        },
      },
    });
  }

  async publishTheme(schoolId: string) {
    const existing = await this.getTheme(schoolId);
    const draft = (existing.draftConfig as Record<string, any>) || {};

    return this.prisma.schoolThemeConfig.update({
      where: { schoolId },
      data: {
        activeTheme: draft.activeTheme || existing.activeTheme,
        selectedTemplate: draft.selectedTemplate || existing.selectedTemplate,
        primaryColor: draft.primaryColor || existing.primaryColor,
        secondaryColor: draft.secondaryColor || existing.secondaryColor,
        accentColor: draft.accentColor || existing.accentColor,
        fontHeading: draft.fontHeading || existing.fontHeading,
        fontBody: draft.fontBody || existing.fontBody,
        buttonRadius: draft.buttonRadius || existing.buttonRadius,
        buttonShadow: draft.buttonShadow || existing.buttonShadow,
        cardStyle: draft.cardStyle || existing.cardStyle,
        headerLayout: draft.headerLayout || existing.headerLayout,
        footerLayout: draft.footerLayout || existing.footerLayout,
        draftConfig: null, // cleared after publishing
      },
    });
  }
}
