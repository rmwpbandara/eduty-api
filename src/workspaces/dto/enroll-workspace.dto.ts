import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class EnrollWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;
}

