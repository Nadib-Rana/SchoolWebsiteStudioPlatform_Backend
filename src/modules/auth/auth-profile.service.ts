import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class AuthProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserSchoolMembers(userId: string) {
    return this.prisma.schoolMember.findMany({
      where: { userId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            plan: true,
            isPublished: true,
          },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phoneNumber: true,
        role: true,
        status: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        schoolMembers: {
          include: {
            school: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                plan: true,
                isPublished: true,
              },
            },
          },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User profile not found");
    }

    return user;
  }
}
