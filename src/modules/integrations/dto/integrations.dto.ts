import { IsString, IsNotEmpty, IsOptional, IsObject } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ConfigureIntegrationDto {
  @ApiProperty({ example: "SCHOOL_ERP" })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ example: "PowerSchool ERP" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: "CONNECTED" })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  credentials?: Record<string, any>;
}
