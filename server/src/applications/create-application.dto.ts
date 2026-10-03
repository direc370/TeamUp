import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

const AVAILABILITY_OPTIONS = ['每周 3–5 小时', '每周 5–8 小时', '每周 8 小时以上'] as const

export class CreateApplicationDto {
  @IsArray() @ArrayMaxSize(3) @IsString({ each: true }) @MaxLength(40, { each: true }) roleTags!: string[]
  @IsString() @MinLength(60) @MaxLength(200) experience!: string
  @IsIn(AVAILABILITY_OPTIONS) availability!: string
  @IsString() @MinLength(40) @MaxLength(120) fitReason!: string
  @IsOptional() @IsArray() @ArrayMaxSize(2) @IsString({ each: true }) @MaxLength(200, { each: true }) links?: string[]
  @IsOptional() @IsString() @MaxLength(120) note?: string
}
