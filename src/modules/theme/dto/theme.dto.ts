import { IsString, IsOptional, IsObject } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateThemeDraftDto {
  @ApiPropertyOptional({ example: "theme-classic" })
  @IsString()
  @IsOptional()
  activeTheme?: string;

  @ApiPropertyOptional({ example: "tpl-classic" })
  @IsString()
  @IsOptional()
  selectedTemplate?: string;

  @ApiPropertyOptional({ example: "#1E3A8A" })
  @IsString()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ example: "#0D9488" })
  @IsString()
  @IsOptional()
  secondaryColor?: string;

  @ApiPropertyOptional({ example: "#F59E0B" })
  @IsString()
  @IsOptional()
  accentColor?: string;

  @ApiPropertyOptional({ example: "DM Serif Display" })
  @IsString()
  @IsOptional()
  fontHeading?: string;

  @ApiPropertyOptional({ example: "Inter" })
  @IsString()
  @IsOptional()
  fontBody?: string;

  @ApiPropertyOptional({ example: "rounded-md" })
  @IsString()
  @IsOptional()
  buttonRadius?: string;

  @ApiPropertyOptional({ example: "shadow-sm" })
  @IsString()
  @IsOptional()
  buttonShadow?: string;

  @ApiPropertyOptional({ example: "bordered" })
  @IsString()
  @IsOptional()
  cardStyle?: string;

  @ApiPropertyOptional({ example: "standard" })
  @IsString()
  @IsOptional()
  headerLayout?: string;

  @ApiPropertyOptional({ example: "detailed" })
  @IsString()
  @IsOptional()
  footerLayout?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  draftConfig?: Record<string, any>;
}
