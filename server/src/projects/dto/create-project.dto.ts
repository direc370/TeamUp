import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'

export class CreateProjectDto {
  @IsString() @MinLength(4) @MaxLength(50) title!: string
  @IsString() @MinLength(10) @MaxLength(300) description!: string
  @IsString() @IsNotEmpty() @MaxLength(80) category!: string
  @IsString() @IsNotEmpty() @MaxLength(120) goal!: string
  @IsString() @IsNotEmpty() @MaxLength(80) weeklyCommitment!: string
  @IsOptional() @IsString() @MaxLength(120) location?: string
  @IsOptional() @IsInt() @Min(1) @Max(20) neededMembers?: number
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(5) @IsString({ each: true }) @MaxLength(40, { each: true }) skills!: string[]
  @IsOptional() @IsIn(['draft', 'open']) status?: 'draft' | 'open'
}
