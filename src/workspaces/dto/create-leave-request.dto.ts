import { IsString, IsNotEmpty, IsUUID, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeaveRequestDto {
  @ApiProperty({
    description: 'UUID of the workspace',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;

  @ApiProperty({
    description: 'Start date of the leave request',
    example: '2024-01-15',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date of the leave request',
    example: '2024-01-20',
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    description: 'Reason for the leave request',
    example: 'Personal vacation',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

