import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsBoolean,
  IsUrl,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ConfigureIntegrationDto {
  @ApiProperty({ example: "SCHOOL_ERP" })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ example: "School ERP System" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: "CONNECTED" })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description:
      "Integration credentials such as { erpBaseUrl, apiKey, enabled }",
  })
  @IsObject()
  @IsOptional()
  credentials?: Record<string, any>;
}

export class TestErpConnectionDto {
  @ApiPropertyOptional({ example: "https://erp.myschool.edu.bd/api/v1" })
  @IsOptional()
  @IsUrl({ require_tld: false })
  erpBaseUrl?: string;

  @ApiPropertyOptional({ example: "sk_web_xxxxxxxx" })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
