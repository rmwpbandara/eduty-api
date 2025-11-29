import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class UpdateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  name?: string;
}

