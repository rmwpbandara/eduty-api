import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnrollWorkspaceDto {
  @ApiProperty({
    description: 'UUID of the workspace to enroll in',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  workspaceId: string;
}

