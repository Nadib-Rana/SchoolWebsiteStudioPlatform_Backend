import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export class GoverningMemberQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  limit?: number = 50;
}

export class CreateGoverningMemberDto {
  @ApiProperty({ example: "Alhaj Md. Habibur Rahman" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "Chairman" })
  @IsString()
  @IsNotEmpty()
  designation: string;

  @ApiPropertyOptional({
    example: "GOVERNING_BODY",
    description:
      "GOVERNING_BODY | MANAGING_COMMITTEE | BOARD_OF_TRUSTEES | ADVISORY_BOARD",
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: "M.A., LL.B." })
  @IsString()
  @IsOptional()
  qualification?: string;

  @ApiPropertyOptional({ example: "2025–2027" })
  @IsString()
  @IsOptional()
  termPeriod?: string;

  @ApiPropertyOptional({ example: "chairman@school.edu" })
  @Transform(emptyToUndefined)
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "+880 1711-000000" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "https://cdn.example.com/photo.jpg" })
  @IsString()
  @IsOptional()
  photoUrl?: string;

  @ApiPropertyOptional({
    example: "Committed to transparent governance and academic excellence.",
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ default: "ACTIVE" })
  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateGoverningMemberDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  designation?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  qualification?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  termPeriod?: string;

  @ApiPropertyOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;
}

