import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsEmail,
  IsBoolean,
  IsObject,
  IsArray,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolPlan, SchoolRole } from "@prisma/client";

export class CreateSchoolDto {
  @ApiProperty({ example: "Northfield High School" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "northfield-high" })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({ example: "northfieldhigh.edu" })
  @IsString()
  @IsOptional()
  customDomain?: string;

  @ApiPropertyOptional({ example: "/icons/northfield-logo.svg" })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ enum: SchoolPlan, default: SchoolPlan.PROFESSIONAL })
  @IsEnum(SchoolPlan)
  @IsOptional()
  plan?: SchoolPlan;
}

export class UpdateSchoolDto {
  @ApiPropertyOptional({ example: "Northfield High School" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: "northfieldhigh.edu" })
  @IsString()
  @IsOptional()
  customDomain?: string;

  @ApiPropertyOptional({ example: "/icons/northfield-logo.svg" })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional({ example: "ACTIVE" })
  @IsString()
  @IsOptional()
  status?: string;
}

export class AddMemberDto {
  @ApiProperty({ example: "teacher@northfield.edu" })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: SchoolRole, default: SchoolRole.EDITOR })
  @IsEnum(SchoolRole)
  role: SchoolRole;
}

export class OnboardingDto {
  @ApiProperty({ example: "Riverside Academy" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "riverside-academy" })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({ example: "tpl-classic" })
  @IsString()
  @IsOptional()
  templateId?: string;

  @ApiPropertyOptional({ example: "theme-classic" })
  @IsString()
  @IsOptional()
  themePreset?: string;

  @ApiPropertyOptional({ example: "#1E3A8A" })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ example: "Dr. Arthur Pendelton" })
  @IsString()
  @IsOptional()
  principalName?: string;

  @ApiPropertyOptional({ example: "contact@riverside.edu" })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ example: "+1 (555) 019-2834" })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ example: ["home", "about", "academics", "admissions", "teachers", "contact"] })
  @IsArray()
  @IsOptional()
  selectedPages?: string[];
}
