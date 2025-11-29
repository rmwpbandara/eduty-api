import { IsUUID, IsInt, Min, Max, IsArray, ValidateNested, IsString, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class RosterAssignmentDto {
  @IsUUID()
  userId: string;

  @IsInt()
  @Min(1)
  @Max(31)
  day: number;

  @IsString()
  @IsIn(['M', 'E', 'N'])
  shiftPeriod: 'M' | 'E' | 'N';

  @IsString()
  @IsIn(['M', 'E', 'N', 'DO', 'SD', 'VL', ''])
  dutyType: 'M' | 'E' | 'N' | 'DO' | 'SD' | 'VL' | '';

  @IsBoolean()
  isOvertime: boolean;
}

export class SaveRosterDto {
  @IsUUID()
  workspaceId: string;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RosterAssignmentDto)
  assignments: RosterAssignmentDto[];
}

