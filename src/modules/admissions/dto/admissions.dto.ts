import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AdmissionStatus } from "@prisma/client";

export class ApplyAdmissionDto {
  @ApiProperty({ example: "northfield-high" })
  @IsString()
  @IsNotEmpty()
  schoolSlug: string;

  @ApiProperty({ example: "Liam Vance" })
  @IsString()
  @IsNotEmpty()
  studentName: string;

  @ApiProperty({ example: "2012-06-15" })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: "Male" })
  @IsString()
  @IsNotEmpty()
  gender: string;

  @ApiProperty({ example: "Grade 7" })
  @IsString()
  @IsNotEmpty()
  applyingForGrade: string;

  @ApiPropertyOptional({ example: "St. Jude Elementary School" })
  @IsString()
  @IsOptional()
  previousSchool?: string;

  @ApiProperty({ example: "Arthur Vance" })
  @IsString()
  @IsNotEmpty()
  guardianName: string;

  @ApiProperty({ example: "Father" })
  @IsString()
  @IsNotEmpty()
  guardianRelationship: string;

  @ApiProperty({ example: "+1 (555) 345-6789" })
  @IsString()
  @IsNotEmpty()
  guardianPhone: string;

  @ApiProperty({ example: "arthur.vance@example.com" })
  @IsEmail()
  guardianEmail: string;

  @ApiProperty({ example: "27 Lakeview Avenue, NY 10471" })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  documents?: Record<string, string>;
}

export class TrackAdmissionDto {
  @ApiProperty({ example: "ADM-2026-8491" })
  @IsString()
  @IsNotEmpty()
  applicationNumber: string;

  @ApiPropertyOptional({ example: "+1 (555) 345-6789" })
  @IsString()
  @IsOptional()
  guardianPhone?: string;
}

export class UpdateAdmissionStatusDto {
  @ApiProperty({ enum: AdmissionStatus })
  @IsEnum(AdmissionStatus)
  status: AdmissionStatus;

  @ApiPropertyOptional({
    example: "Interview scheduled for Monday 10:00 AM in Room 102",
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class AdmissionQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: AdmissionStatus })
  @IsEnum(AdmissionStatus)
  @IsOptional()
  status?: AdmissionStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  grade?: string;
}
