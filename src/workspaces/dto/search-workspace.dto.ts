import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SearchWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  query: string; // Can be workspace name or ID
}

