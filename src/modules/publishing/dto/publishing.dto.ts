import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ReleaseVersionDto {
  @ApiProperty({ example: "v1.4.3" })
  @IsString()
  @IsNotEmpty()
  versionTag: string;

  @ApiProperty({
    example: "Updated faculty profiles and spring admissions schedule",
  })
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  publishedBy?: string;
}

export class CreateBackupDto {
  @ApiPropertyOptional({
    example: "Pre-Admissions Launch Snapshot",
    description: "Descriptive label for this backup",
  })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({
    example: "v1.5.0-backup",
    description: "Custom version tag; auto-generated if omitted",
  })
  @IsString()
  @IsOptional()
  versionTag?: string;

  @ApiPropertyOptional({
    example: "Manual snapshot taken before redesigning hero and admission pages",
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RestoreVersionDto {
  @ApiPropertyOptional({
    example: "Rolling back after accidental content deletion",
    description: "Optional reason for revision rollback",
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
