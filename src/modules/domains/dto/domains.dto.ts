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

export class VerifyDomainDto {
  @ApiPropertyOptional({ default: false, description: "Simulate successful verification for testing/demo" })
  @IsBoolean()
  @IsOptional()
  simulate?: boolean;
}
