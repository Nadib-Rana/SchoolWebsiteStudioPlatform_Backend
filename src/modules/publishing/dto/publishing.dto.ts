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
