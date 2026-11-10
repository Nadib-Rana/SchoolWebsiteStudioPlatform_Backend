import { PrismaService } from "../../database/prisma.service";

export function formatSnapshotJson(data: any): any {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
  );
}

export async function restoreThemeAndProfile(
  prisma: PrismaService,
  schoolId: string,
  snapshot: any,
) {
  if (snapshot.themeConfig) {
    await prisma.schoolThemeConfig.upsert({
      where: { schoolId },
      update: {
        activeTheme: snapshot.themeConfig.activeTheme,
        selectedTemplate: snapshot.themeConfig.selectedTemplate,
        primaryColor: snapshot.themeConfig.primaryColor,
        secondaryColor: snapshot.themeConfig.secondaryColor,
        fontHeading: snapshot.themeConfig.fontHeading,
        fontBody: snapshot.themeConfig.fontBody,
        draftConfig: null,
      },
      create: {
        schoolId,
        activeTheme: snapshot.themeConfig.activeTheme || "theme-classic",
        selectedTemplate:
          snapshot.themeConfig.selectedTemplate || "template-modern",
        primaryColor: snapshot.themeConfig.primaryColor || "#102f58",
      },
    });
  }

  if (snapshot.profile) {
    await prisma.schoolProfile.upsert({
      where: { schoolId },
      update: {
        motto: snapshot.profile.motto,
        shortBio: snapshot.profile.shortBio,
        address: snapshot.profile.address,
        phone: snapshot.profile.phone,
        email: snapshot.profile.email,
      },
      create: {
        schoolId,
        motto: snapshot.profile.motto,
        shortBio: snapshot.profile.shortBio,
      },
    });
  }
}
