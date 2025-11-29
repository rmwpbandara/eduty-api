import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchWorkspaceDto {
  @ApiProperty({
    description: 'Search query - can be workspace name or ID',
    example: 'Emergency',
  })
  @IsString()
  @IsNotEmpty()
  query: string; // Can be workspace name or ID
}
