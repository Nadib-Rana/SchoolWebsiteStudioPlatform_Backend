import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsArray,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PublishStatus } from "@prisma/client";

export class PageQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: PublishStatus })
  @IsEnum(PublishStatus)
  @IsOptional()
  status?: PublishStatus;

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

export class CreatePageDto {
  @ApiProperty({ example: "admissions" })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: "Admissions" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: "Admissions" })
  @IsString()
  @IsOptional()
  navLabel?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isHome?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ enum: PublishStatus, default: PublishStatus.DRAFT })
  @IsEnum(PublishStatus)
  @IsOptional()
  status?: PublishStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  metaDescription?: string;
}

export class UpdatePageDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  navLabel?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isHome?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ enum: PublishStatus })
  @IsEnum(PublishStatus)
  @IsOptional()
  status?: PublishStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  featuredImage?: string;
}

export class CreateSectionDto {
  @ApiProperty({ example: "hero" })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ example: "Main Hero Banner" })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  content?: Record<string, any>;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

export class UpdateSectionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  content?: Record<string, any>;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

export class ReorderSectionsDto {
  @ApiProperty({ example: ["uuid-1", "uuid-2", "uuid-3"] })
  @IsArray()
  @IsString({ each: true })
  sectionIds: string[];
}
