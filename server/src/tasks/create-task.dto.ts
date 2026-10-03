import { IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateTaskDto {
  @IsString() @MaxLength(120) title!: string
  @IsOptional() dueAt?: string
}
