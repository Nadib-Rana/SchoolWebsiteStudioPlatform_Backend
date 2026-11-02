import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsInt,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PublishStatus } from "@prisma/client";

export class NoticeQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ enum: PublishStatus })
  @IsEnum(PublishStatus)
  @IsOptional()
  status?: PublishStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  limit?: number = 20;
}

export class CreateNoticeDto {
  @ApiProperty({ example: "Summer schedule and office hours" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ default: "General" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: "During summer recess, administrative offices will operate..." })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fileUrl?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @ApiPropertyOptional({ default: "NORMAL" })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ enum: PublishStatus, default: PublishStatus.PUBLISHED })
  @IsEnum(PublishStatus)
  @IsOptional()
  status?: PublishStatus;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  publishDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expiryDate?: string;
}

export class UpdateNoticeDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ enum: PublishStatus })
  @IsEnum(PublishStatus)
  @IsOptional()
  status?: PublishStatus;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  publishDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expiryDate?: string;
}
