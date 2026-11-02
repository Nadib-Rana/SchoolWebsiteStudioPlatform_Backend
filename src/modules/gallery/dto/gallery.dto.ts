import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateAlbumDto {
  @ApiProperty({ example: "Campus Life & Community" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: "campus-life" })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: "https://images.unsplash.com/photo-..." })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiPropertyOptional({ example: "Activities" })
  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdateAlbumDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  order?: number;
}

export class AddPhotoDto {
  @ApiPropertyOptional({ example: "Annual sports day celebration" })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiProperty({ example: "https://images.unsplash.com/photo-..." })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 1048576 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  sizeBytes?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  order?: number;
}

export class CreateMediaAssetDto {
  @ApiProperty({ example: "school-campus-hero.jpg" })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ example: "school-campus-hero.jpg" })
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @ApiProperty({ example: "image/jpeg" })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ example: 2516582 })
  @Type(() => Number)
  @IsInt()
  sizeBytes: number;

  @ApiProperty({ example: "https://images.unsplash.com/photo-..." })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ default: "IMAGE" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
