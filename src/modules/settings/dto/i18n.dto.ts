import { IsString, IsOptional, IsArray, IsObject } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateI18nDto {
  @ApiPropertyOptional({ example: "en", description: "Default school primary language code" })
  @IsString()
  @IsOptional()
  defaultLanguage?: string;

  @ApiPropertyOptional({
    example: ["en", "bn", "es"],
    description: "List of enabled language codes for the public website",
  })
  @IsArray()
  @IsOptional()
  supportedLanguages?: string[];

  @ApiPropertyOptional({
    example: { bn: { motto: "শিখুন · নেতৃত্ব দিন · সেবা করুন", applyButtonText: "ভর্তি আবেদন" } },
    description: "Custom localized translation overrides",
  })
  @IsObject()
  @IsOptional()
  customOverrides?: Record<string, Record<string, string>>;
}
