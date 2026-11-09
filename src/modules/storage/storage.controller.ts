import {
  Controller,
  Post,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ForbiddenException,
  Req,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import * as path from "path";
import { StorageService } from "./storage.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { PrismaService } from "../../database/prisma.service";
import { Role } from "@prisma/client";
import {
  PresignUploadDto,
  PresignDownloadDto,
  DeleteObjectDto,
} from "./dto/storage.dto";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
];

const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".pdf",
];

@ApiTags("Storage")
@ApiBearerAuth()
@Controller("storage")
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("presign-upload")
  @ApiOperation({
    summary:
      "Generate a presigned upload URL for direct client-to-storage uploads",
  })
  @ResponseMessage("Presigned upload URL generated successfully")
  async getPresignUploadUrl(@Body() dto: PresignUploadDto, @Req() req: any) {
    const ext = path.extname(dto.filename).toLowerCase();
    if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Unsupported file extension '${ext}'. Allowed extensions: ${ALLOWED_EXTENSIONS.join(", ")}`,
      );
    }

    if (dto.mimeType && !ALLOWED_MIME_TYPES.includes(dto.mimeType.toLowerCase())) {
      throw new BadRequestException(
        `Unsupported MIME type '${dto.mimeType}'. Allowed MIME types: ${ALLOWED_MIME_TYPES.join(", ")}`,
      );
    }

    // Resolve tenant ID for namespacing and quota verification
    let schoolId = dto.schoolId;
    if (!schoolId && req.user?.id) {
      const defaultMember = await this.prisma.schoolMember.findFirst({
        where: { userId: req.user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
      if (defaultMember) {
        schoolId = defaultMember.schoolId;
      }
    }

    if (schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { planStorageLimit: true },
      });
      if (school?.planStorageLimit) {
        const usage = await this.prisma.mediaAsset.aggregate({
          where: { schoolId },
          _sum: { sizeBytes: true },
        });
        const totalUsed = usage._sum.sizeBytes || 0n;
        if (BigInt(totalUsed) >= BigInt(school.planStorageLimit)) {
          throw new BadRequestException(
            "Storage limit reached for this school subscription plan. Please upgrade plan.",
          );
        }
      }
    }

    const key = this.storageService.generateKey("uploads", dto.filename, schoolId);
    return this.storageService.getPresignedUploadUrl(key, dto.bucket);
  }

  @Post("presign-download")
  @ApiOperation({
    summary: "Generate a presigned download URL for viewing/downloading files",
  })
  @ResponseMessage("Presigned download URL generated successfully")
  async getPresignDownloadUrl(@Body() dto: PresignDownloadDto) {
    const url = await this.storageService.getPresignedObjectUrl(
      dto.key,
      dto.bucket,
    );
    return { key: dto.key, downloadUrl: url };
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
          return callback(
            new BadRequestException(
              `Unsupported file type '${file.mimetype}'. Allowed types: JPEG, PNG, WEBP, GIF, SVG, PDF`,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload file directly via server multipart form" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ResponseMessage("File uploaded successfully")
  async uploadFile(
    @UploadedFile() file?: Express.Multer.File,
    @Req() req?: any,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided in request");
    }

    let schoolId: string | undefined;
    if (req?.user?.id) {
      const defaultMember = await this.prisma.schoolMember.findFirst({
        where: { userId: req.user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
      if (defaultMember) {
        schoolId = defaultMember.schoolId;
      }
    }

    const key = this.storageService.generateKey("uploads", file.originalname, schoolId);
    return this.storageService.uploadBuffer(key, file.buffer, file.mimetype);
  }

  @ApiBearerAuth()
  @Post("delete")
  @ApiOperation({ summary: "Delete an object from storage" })
  @ResponseMessage("Object deleted successfully")
  async deleteObject(@Body() dto: DeleteObjectDto, @Req() req: any) {
    const user = req.user;

    // Multi-tenant permission validation on storage key deletion
    if (user && user.role !== Role.SUPER_ADMIN) {
      if (!dto.key.startsWith("tenants/")) {
        throw new ForbiddenException(
          "Cannot delete storage objects outside your tenant namespace",
        );
      }

      const parts = dto.key.split("/");
      const targetSchoolId = parts[1];

      const membership = await this.prisma.schoolMember.findUnique({
        where: {
          schoolId_userId: {
            schoolId: targetSchoolId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenException(
          "You are not authorized to delete storage objects belonging to another school tenant",
        );
      }
    }

    const success = await this.storageService.deleteObject(dto.key, dto.bucket);
    return { success, key: dto.key };
  }
}
