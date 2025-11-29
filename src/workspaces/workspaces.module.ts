import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { Workspace } from './workspace.entity';
import { Enrollment } from './enrollment.entity';
import { EnrollmentRequest } from './enrollment-request.entity';
import { UserFavorite } from './user-favorite.entity';
import { Invitation } from './invitation.entity';
import { Roster } from './roster.entity';
import { RosterAssignment } from './roster-assignment.entity';
import { LeaveRequest } from './leave-request.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      Enrollment,
      EnrollmentRequest,
      UserFavorite,
      Invitation,
      Roster,
      RosterAssignment,
      LeaveRequest,
    ]),
    AuthModule,
  ],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}

