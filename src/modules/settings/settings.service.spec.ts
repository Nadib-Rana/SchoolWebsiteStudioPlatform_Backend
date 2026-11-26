import { SettingsService } from "./settings.service";

describe("SettingsService", () => {
  let service: SettingsService;
  let prisma: {
    schoolSettings: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      schoolSettings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new SettingsService(prisma as any);
  });

  it("merges notificationPreferences without overwriting unrelated keys like _floatingContact", async () => {
    prisma.schoolSettings.findUnique.mockResolvedValue({
      id: "set-1",
      schoolId: "school-1",
      notificationPreferences: {
        _floatingContact: {
          showWhatsappButton: true,
          whatsappNumber: "01711000000",
        },
        new_admission: { email: true, inApp: true },
      },
    });
    prisma.schoolSettings.update.mockImplementation(async ({ data }) => data);

    const res = await service.updateSettings("school-1", {
      notificationPreferences: {
        _governingBody: {
          enabled: true,
          showOnHome: false,
          title: "Managing Committee (SMC)",
        },
      },
    });

    expect(res.notificationPreferences).toEqual({
      _floatingContact: {
        showWhatsappButton: true,
        whatsappNumber: "01711000000",
      },
      new_admission: { email: true, inApp: true },
      _governingBody: {
        enabled: true,
        showOnHome: false,
        title: "Managing Committee (SMC)",
      },
    });
  });
});

