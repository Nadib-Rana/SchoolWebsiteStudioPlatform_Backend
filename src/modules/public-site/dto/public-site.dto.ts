import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ContactInquiryDto {
  @ApiProperty({ example: "northfield-high" })
  @IsString()
  @IsNotEmpty()
  schoolSlug: string;

  @ApiProperty({ example: "Sarah Jenkins" })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: "sarah.j@example.com" })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: "+1 (555) 987-6543" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: "Admissions Inquiry for Grade 9" })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: "I would like to inquire about the application deadlines and tuition for the upcoming fall semester." })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class UpdateInquiryStatusDto {
  @ApiProperty({ example: "RESPONDED" })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({ example: "Replied via email with prospectus brochure." })
  @IsString()
  @IsOptional()
  responseNotes?: string;
}
