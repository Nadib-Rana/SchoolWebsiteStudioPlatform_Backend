import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  IsObject,
  MaxLength,
  IsUrl,
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

  @ApiPropertyOptional({ example: "20122691234567890" })
  @IsString()
  @IsOptional()
  birthRegistrationNo?: string;

  @ApiPropertyOptional({ example: "Kamal Rahman" })
  @IsString()
  @IsOptional()
  fatherName?: string;

  @ApiPropertyOptional({ example: "Fatema Begum" })
  @IsString()
  @IsOptional()
  motherName?: string;

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

  @ApiPropertyOptional({ example: "Dhaka, Bangladesh" })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: "House 12, Road 4, Mirpur, Dhaka" })
  @IsString()
  @IsOptional()
  presentAddress?: string;

  @ApiPropertyOptional({ example: "Village Rampur, Cumilla" })
  @IsString()
  @IsOptional()
  permanentAddress?: string;

  @ApiPropertyOptional({ example: "https://cdn.example.com/docs/cert.pdf" })
  @IsString()
  @IsOptional()
  documentsUrl?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  documents?: Record<string, string>;

  @ApiPropertyOptional({
    description:
      "Optional applicant passport photo: WebP/JPEG/PNG Data URI (<= 1.5 MB) or HTTPS image URL",
  })
  @IsString()
  @IsOptional()
  @MaxLength(2_200_000)
  photoUrl?: string;
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

export class PayOnlineAdmissionDto {
  @ApiProperty({ example: "APP-20261127-4821" })
  @IsString()
  @IsNotEmpty()
  applicationNumber: string;

  @ApiProperty({ example: "01711000000" })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: "SSLCOMMERZ" })
  @IsString()
  @IsNotEmpty()
  gateway: string;

  @ApiProperty({ example: "https://school.example.com/admissions/payment-callback" })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  callbackBaseUrl: string;
}

export class VerifyOnlinePaymentDto {
  @ApiProperty({ example: "APP-20261127-4821" })
  @IsString()
  @IsNotEmpty()
  applicationNumber: string;

  @ApiProperty({ example: "01711000000" })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: "SSLCOMMERZ" })
  @IsString()
  @IsNotEmpty()
  gateway: string;

  @ApiPropertyOptional({ example: "SSLC-1732648800-a1b2c3d4" })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiPropertyOptional({ example: "VAL_ID_FROM_SSLCOMMERZ" })
  @IsString()
  @IsOptional()
  valId?: string;

  @ApiPropertyOptional({ example: "PAYMENT_ID_FROM_BKASH" })
  @IsString()
  @IsOptional()
  paymentID?: string;
}

export class PayManualAdmissionDto {
  @ApiProperty({ example: "APP-20261127-4821" })
  @IsString()
  @IsNotEmpty()
  applicationNumber: string;

  @ApiProperty({ example: "01711000000" })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: "BKASH" })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiProperty({ example: "9K4M2P7Q1X" })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiPropertyOptional({ example: "Sent from 01711000000" })
  @IsString()
  @IsOptional()
  paymentNote?: string;
}
