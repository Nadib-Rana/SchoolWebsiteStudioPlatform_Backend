import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateTeacherDto,
  UpdateTeacherDto,
  TeacherQueryDto,
} from "./dto/teachers.dto";

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeachers(schoolId: string, query: TeacherQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (query.department) {
      where.department = { contains: query.department, mode: "insensitive" };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { designation: { contains: query.search, mode: "insensitive" } },
        { department: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.teacher.count({ where }),
      this.prisma.teacher.findMany({
        where,
        orderBy: [{ order: "asc" }, { name: "asc" }],
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

  async getTeacherById(schoolId: string, teacherId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
    });

    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }

    return teacher;
  }

  async createTeacher(schoolId: string, dto: CreateTeacherDto) {
    return this.prisma.teacher.create({
      data: {
        schoolId,
        ...dto,
      },
    });
  }

  async updateTeacher(
    schoolId: string,
    teacherId: string,
    dto: UpdateTeacherDto,
  ) {
    await this.getTeacherById(schoolId, teacherId);

    return this.prisma.teacher.update({
      where: { id: teacherId },
      data: dto,
    });
  }

  async deleteTeacher(schoolId: string, teacherId: string) {
    await this.getTeacherById(schoolId, teacherId);

    await this.prisma.teacher.delete({
      where: { id: teacherId },
    });

    return { message: "Teacher deleted successfully" };
  }
}
