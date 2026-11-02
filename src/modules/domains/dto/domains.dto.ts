import { IsString, IsNotEmpty, IsBoolean, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDomainDto {
  @ApiProperty({ example: "portal.northfieldhigh.edu" })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
