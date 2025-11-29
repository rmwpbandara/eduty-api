import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsString,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class RosterAssignmentDto {
  @ApiProperty({
    description: 'UUID of the user assigned to this shift',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Day of the month (1-31)',
    example: 15,
    minimum: 1,
    maximum: 31,
  })
  @IsInt()
  @Min(1)
  @Max(31)
  day: number;

  @ApiProperty({
    description: 'Shift period: M (Morning), E (Evening), N (Night)',
    example: 'M',
    enum: ['M', 'E', 'N'],
  })
  @IsString()
  @IsIn(['M', 'E', 'N'])
  shiftPeriod: 'M' | 'E' | 'N';

  @ApiProperty({
    description:
      'Duty type: M (Morning), E (Evening), N (Night), DO (Day Off), SD (Sick Day), VL (Vacation Leave), or empty string',
    example: 'M',
    enum: ['M', 'E', 'N', 'DO', 'SD', 'VL', ''],
  })
  @IsString()
  @IsIn(['M', 'E', 'N', 'DO', 'SD', 'VL', ''])
  dutyType: 'M' | 'E' | 'N' | 'DO' | 'SD' | 'VL' | '';

  @ApiProperty({
    description: 'Whether this is an overtime shift',
    example: false,
  })
  @IsBoolean()
  isOvertime: boolean;
}

export class SaveRosterDto {
  @ApiProperty({
    description: 'UUID of the workspace',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  workspaceId: string;

  @ApiProperty({
    description: 'Month number (1-12)',
    example: 1,
    minimum: 1,
    maximum: 12,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({
    description: 'Year (2000-2100)',
    example: 2024,
    minimum: 2000,
    maximum: 2100,
  })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({
    description: 'Array of roster assignments for the month',
    type: [RosterAssignmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RosterAssignmentDto)
  assignments: RosterAssignmentDto[];
}
