import {
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  IsArray,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateContentDto {
  @ApiPropertyOptional({ example: 1984 })
  @IsInt()
  @IsOptional()
  established?: number;

  @ApiPropertyOptional({ example: 1984 })
  @IsInt()
  @IsOptional()
  establishedYear?: number;

  @ApiPropertyOptional({ example: "NHS-1042" })
  @IsString()
  @IsOptional()
  schoolCode?: string;

  @ApiPropertyOptional({ example: "Northfield High School" })
  @IsString()
  @IsOptional()
  schoolName?: string;

  @ApiPropertyOptional({ example: "Secondary school" })
  @IsString()
  @IsOptional()
  schoolType?: string;

  @ApiPropertyOptional({
    example: "Excellence in Education, Leadership in Character",
  })
  @IsString()
  @IsOptional()
  motto?: string;

  @ApiPropertyOptional({
    example: "Northfield High School has provided excellence...",
  })
  @IsString()
  @IsOptional()
  shortBio?: string;

  @ApiPropertyOptional({ example: "Dr. Farhana Noor" })
  @IsString()
  @IsOptional()
  principalName?: string;

  @ApiPropertyOptional({ example: "Principal & Head Administrator" })
  @IsString()
  @IsOptional()
  principalTitle?: string;

  @ApiPropertyOptional({
    example: "Welcome to our vibrant school community...",
  })
  @IsString()
  @IsOptional()
  principalBio?: string;

  @ApiPropertyOptional({ example: "https://images.unsplash.com/..." })
  @IsString()
  @IsOptional()
  principalPhotoUrl?: string;

  @ApiPropertyOptional({ example: "https://.../logo.png" })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: "https://.../cover.jpg" })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiPropertyOptional({ example: "To cultivate empathetic scholars..." })
  @IsString()
  @IsOptional()
  visionStatement?: string;

  @ApiPropertyOptional({
    example: "To provide an inclusive learning environment...",
  })
  @IsString()
  @IsOptional()
  missionStatement?: string;

  @ApiPropertyOptional({
    example: "142 Northfield Avenue, Riverdale, NY 10471",
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: "+1 (555) 234-5678" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "admissions@northfieldhigh.edu" })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "Monday - Friday: 8:00 AM - 4:30 PM" })
  @IsString()
  @IsOptional()
  officeHours?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  socialLinks?: Record<string, string>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  stats?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  academics?: Record<string, any>;
}
