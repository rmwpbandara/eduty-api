import { IsEnum, IsNotEmpty } from 'class-validator';
import { LeaveRequestStatus } from '../leave-request.entity';

export class UpdateLeaveRequestStatusDto {
  @IsEnum(LeaveRequestStatus)
  @IsNotEmpty()
  status: LeaveRequestStatus;
}

