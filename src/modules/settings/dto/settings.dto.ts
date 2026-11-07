import { IsString, IsOptional, IsBoolean, IsObject } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: "admin@northfield.edu" })
  @IsString()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ example: "+1 (555) 234-5678" })
  @IsString()
  @IsOptional()
  supportPhone?: string;

  @ApiPropertyOptional({ example: "America/New_York" })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: "MM/DD/YYYY" })
  @IsString()
  @IsOptional()
  dateFormat?: string;

  @ApiPropertyOptional({ example: "en" })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  allowPublicAdmission?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  maintenanceMode?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  securityConfig?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  notificationPreferences?: Record<string, any>;
}
