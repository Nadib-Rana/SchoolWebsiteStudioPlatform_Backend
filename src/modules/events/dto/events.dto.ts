import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsInt,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PublishStatus } from "@prisma/client";

export class EventQueryDto {
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
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  @IsOptional()
  upcomingOnly?: boolean;

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

export class CreateEventDto {
  @ApiProperty({ example: "Inter-school Science Fair" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ default: "Academic" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: "2026-05-18T09:00:00Z" })
  @IsDateString()
  eventDate: string;

  @ApiPropertyOptional({ example: "2026-05-18T17:00:00Z" })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: "9:00 AM - 4:00 PM" })
  @IsString()
  @IsOptional()
  time?: string;

  @ApiPropertyOptional({ example: "Main Auditorium & Labs" })
  @IsString()
  @IsOptional()
  venue?: string;

  @ApiPropertyOptional({ example: "Over 80 science innovation projects..." })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @ApiPropertyOptional({
    enum: PublishStatus,
    default: PublishStatus.PUBLISHED,
  })
  @IsEnum(PublishStatus)
  @IsOptional()
  status?: PublishStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  registrationUrl?: string;
}

export class UpdateEventDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  eventDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  time?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  venue?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @ApiPropertyOptional({ enum: PublishStatus })
  @IsEnum(PublishStatus)
  @IsOptional()
  status?: PublishStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  registrationUrl?: string;
}
