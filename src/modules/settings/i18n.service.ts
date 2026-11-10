import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { UpdateI18nDto } from "./dto/i18n.dto";

export const AVAILABLE_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", dir: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr" },
  { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl" },
  { code: "fr", name: "French", nativeName: "Français", dir: "ltr" },
  { code: "de", name: "German", nativeName: "Deutsch", dir: "ltr" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", dir: "ltr" },
];

@Injectable()
export class I18nService {
  private readonly logger = new Logger(I18nService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getI18nSettings(schoolId: string) {
    const settings = await this.prisma.schoolSettings.findUnique({
      where: { schoolId },
    });

    const prefs = (settings?.notificationPreferences as any) || {};
    const i18n = prefs.i18n || {};

    const defaultLanguage = dtoOrDefault(
      dtoOrDefault(dtoOrDefault(settings?.language, i18n.defaultLanguage), "en"),
      "en",
    );
    const supportedLanguages =
      Array.isArray(i18n.supportedLanguages) &&
      i18n.supportedLanguages.length > 0
        ? i18n.supportedLanguages
        : ["en", "bn"];

    const customOverrides = i18n.customOverrides || {
      bn: {
        motto: "শিখুন · নেতৃত্ব দিন · সেবা করুন",
        applyButtonText: "ভর্তি আবেদন",
      },
    };

    return {
      defaultLanguage,
      supportedLanguages,
      customOverrides,
      availableLanguages: AVAILABLE_LANGUAGES,
    };
  }

  async updateI18nSettings(
    schoolId: string,
    dto: UpdateI18nDto,
    userId?: string,
  ) {
    let settings = await this.prisma.schoolSettings.findUnique({
      where: { schoolId },
    });

    if (!settings) {
      settings = await this.prisma.schoolSettings.create({
        data: {
          schoolId,
          language: dto.defaultLanguage || "en",
        },
      });
    }

    const prefs = (settings.notificationPreferences as any) || {};
    const existingI18n = prefs.i18n || {};

    const updatedI18n = {
      defaultLanguage:
        dto.defaultLanguage || existingI18n.defaultLanguage || "en",
      supportedLanguages:
        dto.supportedLanguages || existingI18n.supportedLanguages || ["en", "bn"],
      customOverrides:
        dto.customOverrides !== undefined
          ? dto.customOverrides
          : existingI18n.customOverrides || {},
    };

    prefs.i18n = updatedI18n;

    const updated = await this.prisma.schoolSettings.update({
      where: { schoolId },
      data: {
        language: updatedI18n.defaultLanguage,
        notificationPreferences: prefs,
      },
    });

    if (userId) {
      await this.auditService.log({
        schoolId,
        userId,
        action: "SETTINGS_UPDATED",
        entity: "SchoolSettings",
        entityId: updated.id,
        details: {
          section: "i18n",
          defaultLanguage: updatedI18n.defaultLanguage,
          supportedLanguages: updatedI18n.supportedLanguages,
        },
      });
    }

    return {
      defaultLanguage: updatedI18n.defaultLanguage,
      supportedLanguages: updatedI18n.supportedLanguages,
      customOverrides: updatedI18n.customOverrides,
      availableLanguages: AVAILABLE_LANGUAGES,
    };
  }

  async getPublicI18n(schoolSlug: string) {
    const school = await this.prisma.school.findFirst({
      where: { OR: [{ slug: schoolSlug }, { customDomain: schoolSlug }] },
      select: { id: true },
    });
    if (!school) {
      return {
        defaultLanguage: "en",
        supportedLanguages: ["en", "bn"],
        customOverrides: {},
        availableLanguages: AVAILABLE_LANGUAGES,
      };
    }
    return this.getI18nSettings(school.id);
  }
}

function dtoOrDefault(val: any, fallback: string) {
  return typeof val === "string" && val.trim() ? val : fallback;
}
