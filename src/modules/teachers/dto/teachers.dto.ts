import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsInt,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TeacherQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

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

export class CreateTeacherDto {
  @ApiProperty({ example: "Dr. Farhana Noor" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "Principal" })
  @IsString()
  @IsNotEmpty()
  designation: string;

  @ApiProperty({ example: "Leadership" })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiPropertyOptional({ example: "Ph.D. in Educational Administration" })
  @IsString()
  @IsOptional()
  qualification?: string;

  @ApiPropertyOptional({ example: "f.noor@northfield.edu" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "+1 (555) 019-2834" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "https://images.unsplash.com/photo-..." })
  @IsString()
  @IsOptional()
  photoUrl?: string;

  @ApiPropertyOptional({ example: "Over 20 years experience..." })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ default: "ACTIVE" })
  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateTeacherDto {
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
  department?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  qualification?: string;

  @ApiPropertyOptional()
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
  bio?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;
}
