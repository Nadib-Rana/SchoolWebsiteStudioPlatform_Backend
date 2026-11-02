import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MenuItemDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: "About Us" })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ example: "/about" })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ example: "about" })
  @IsString()
  @IsOptional()
  pageSlug?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isExternal?: boolean;

  @ApiPropertyOptional({ default: "_self" })
  @IsString()
  @IsOptional()
  target?: string;
}

export class UpdateNavigationDto {
  @ApiProperty({ example: "HEADER" })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ type: [MenuItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  items: MenuItemDto[];
}
