import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackEventDto {
  @ApiProperty({
    description: 'School slug identifier',
    example: 'northfield-high',
  })
  @IsString()
  @IsNotEmpty()
  schoolSlug: string;

  @ApiProperty({ description: 'Path visited', example: '/admissions' })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiPropertyOptional({
    description: 'HTTP referrer',
    example: 'https://www.google.com',
  })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional({ description: 'Device type hint', example: 'mobile' })
  @IsOptional()
  @IsString()
  device?: string;

  @ApiPropertyOptional({ description: 'Visitor identifier / session id' })
  @IsOptional()
  @IsString()
  visitorId?: string;
}
