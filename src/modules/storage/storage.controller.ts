import {
  Controller,
  Post,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
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
import { StorageService } from "./storage.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { PrismaService } from "../../database/prisma.service";
import {
  PresignUploadDto,
  PresignDownloadDto,
  DeleteObjectDto,
} from "./dto/storage.dto";
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_FILE_SIZE,
} from "./storage.constants";
import {
  resolveAuthorizedSchoolId,
  validateFileExtAndMime,
  checkSchoolStorageQuota,
  validateTenantDeletePermission,
} from "./storage.helper";

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
    validateFileExtAndMime(dto.filename, dto.mimeType);

    const requestedSchoolId =
      dto.schoolId || (req.headers?.["x-school-id"] as string | undefined);
    const schoolId = await resolveAuthorizedSchoolId(
      this.prisma,
      req.user,
      requestedSchoolId,
    );

    if (schoolId) {
      await checkSchoolStorageQuota(this.prisma, schoolId);
    }

    const key = this.storageService.generateKey(
      "uploads",
      dto.filename,
      schoolId,
    );
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
      limits: { fileSize: MAX_UPLOAD_FILE_SIZE },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase() as any)) {
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

    const requestedSchoolId = req?.headers?.["x-school-id"] as
      | string
      | undefined;
    const schoolId = await resolveAuthorizedSchoolId(
      this.prisma,
      req?.user,
      requestedSchoolId,
    );
    if (schoolId) {
      await checkSchoolStorageQuota(this.prisma, schoolId);
    }
    const key = this.storageService.generateKey(
      "uploads",
      file.originalname,
      schoolId,
    );
    return this.storageService.uploadBuffer(key, file.buffer, file.mimetype);
  }

  @ApiBearerAuth()
  @Post("delete")
  @ApiOperation({ summary: "Delete an object from storage" })
  @ResponseMessage("Object deleted successfully")
  async deleteObject(@Body() dto: DeleteObjectDto, @Req() req: any) {
    if (req.user) {
      await validateTenantDeletePermission(this.prisma, dto.key, req.user);
    }

    const success = await this.storageService.deleteObject(dto.key, dto.bucket);
    return { success, key: dto.key };
  }
}
