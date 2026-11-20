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

  @ApiPropertyOptional({ example: "Arafat" })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: "Rahman" })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: "Arafat Rahman" })
  @IsString()
  @IsOptional()
  studentName?: string;

  @ApiProperty({ example: "2012-06-15" })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ example: "MALE" })
  @IsString()
  @IsNotEmpty()
  gender: string;

  @ApiPropertyOptional({ example: "01711000000" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "arafat@example.com" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "O+" })
  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @ApiProperty({ example: "Grade 7" })
  @IsString()
  @IsNotEmpty()
  applyingForGrade: string;

  @ApiPropertyOptional({ example: "class-uuid-from-erp" })
  @IsString()
  @IsOptional()
  appliedClassId?: string;

  @ApiPropertyOptional({ example: "St. Jude Elementary School" })
  @IsString()
  @IsOptional()
  previousSchool?: string;

  @ApiProperty({ example: "Kamal Rahman" })
  @IsString()
  @IsNotEmpty()
  guardianName: string;

  @ApiProperty({ example: "FATHER" })
  @IsString()
  @IsNotEmpty()
  guardianRelationship: string;

  @ApiProperty({ example: "01711000001" })
  @IsString()
  @IsNotEmpty()
  guardianPhone: string;

  @ApiPropertyOptional({ example: "parent@example.com" })
  @IsEmail()
  @IsOptional()
  guardianEmail?: string;

  @ApiProperty({ example: "Dhaka, Bangladesh" })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ example: "https://cdn.example.com/docs/cert.pdf" })
  @IsString()
  @IsOptional()
  documentsUrl?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  documents?: Record<string, string>;
}

export class TrackAdmissionDto {
  @ApiPropertyOptional({ example: "northfield-high" })
  @IsString()
  @IsOptional()
  schoolSlug?: string;

  @ApiProperty({ example: "ADM-2026-0001" })
  @IsString()
  @IsNotEmpty()
  applicationNumber: string;

  @ApiPropertyOptional({
    example: "01711000000",
    description: "Applicant or guardian phone/email identifier",
  })
  @IsString()
  @IsOptional()
  identifier?: string;

  @ApiPropertyOptional({
    example: "01711000001",
    description: "Guardian phone number required for verification",
  })
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
