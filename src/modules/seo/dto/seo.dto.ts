import { IsString, IsOptional, IsArray, IsBoolean } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateSeoDto {
  @ApiPropertyOptional({
    example: "Northfield High School | Inspiring Excellence",
  })
  @IsString()
  @IsOptional()
  siteTitle?: string;

  @ApiPropertyOptional({ example: "A premier public secondary institution..." })
  @IsString()
  @IsOptional()
  tagline?: string;

  @ApiPropertyOptional({ example: "Welcome to Northfield High School..." })
  @IsString()
  @IsOptional()
  metaDescription?: string;

  @ApiPropertyOptional({ example: ["High School", "AP Program", "STEM"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  metaKeywords?: string[];

  @ApiPropertyOptional({ example: "https://images.unsplash.com/..." })
  @IsString()
  @IsOptional()
  ogImageUrl?: string;

  @ApiPropertyOptional({ example: "G-XXXXXXXXXX" })
  @IsString()
  @IsOptional()
  googleAnalyticsId?: string;

  @ApiPropertyOptional({ example: "google-site-verification=..." })
  @IsString()
  @IsOptional()
  searchConsoleTag?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  robotsTxt?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  sitemapEnabled?: boolean;
}
