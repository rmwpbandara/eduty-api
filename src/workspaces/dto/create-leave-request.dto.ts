import { IsString, IsNotEmpty, IsUUID, IsDateString, IsOptional } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

