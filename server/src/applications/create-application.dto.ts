import { IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateApplicationDto {
  @IsOptional() @IsString() @MaxLength(500) message?: string
}
