import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { SearchWorkspaceDto } from './dto/search-workspace.dto';
import { EnrollWorkspaceDto } from './dto/enroll-workspace.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { SaveRosterDto } from './dto/save-roster.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('workspaces')
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  create(@Body() createWorkspaceDto: CreateWorkspaceDto, @Request() req) {
    return this.workspacesService.create(createWorkspaceDto, req.user.id);
  }

  @Get('search')
  async search(@Query() searchDto: SearchWorkspaceDto, @Request() req) {
    const workspaces = await this.workspacesService.searchWorkspaces(searchDto);
    
    // Add enrollment status for each workspace
    const workspacesWithStatus = await Promise.all(
      workspaces.map(async (workspace) => {
        const enrollment = await this.workspacesService.checkEnrollment(
          workspace.id,
          req.user.id,
        );
        const enrollmentRequest = await this.workspacesService.checkEnrollmentRequest(
          workspace.id,
          req.user.id,
        );
        
        return {
          ...workspace,
          isEnrolled: !!enrollment,
          enrollmentStatus: enrollmentRequest?.status || null,
        };
      }),
    );
    
    return workspacesWithStatus;
  }

  @Get('enrolled')
  getEnrolled(@Request() req) {
    return this.workspacesService.getEnrolledWorkspaces(req.user.id);
  }

  @Post('favorite/:id')
  setFavorite(@Param('id') id: string, @Request() req) {
    return this.workspacesService.setFavoriteWorkspace(id, req.user.id);
  }

  @Get('favorite')
  getFavorite(@Request() req) {
    return this.workspacesService.getFavoriteWorkspace(req.user.id);
  }

  @Delete('favorite')
  async removeFavorite(@Request() req) {
    await this.workspacesService.removeFavoriteWorkspace(req.user.id);
    return { message: 'Favorite removed successfully' };
  }

  @Get('my-requests')
  async getMyPendingRequests(@Request() req) {
    try {
      if (!req.user || !req.user.id) {
        console.error('[Controller] No user or user.id in request');
        return [];
      }
      
      console.log(`[Controller] Getting pending requests for user: ${req.user.id}`);
      
      let requests: any[] = [];
      try {
        requests = await this.workspacesService.getUserPendingRequests(req.user.id);
        console.log(`[Controller] Service returned ${requests?.length || 0} requests`);
      } catch (serviceError: any) {
        console.error('[Controller] Service error:', serviceError);
        console.error('[Controller] Service error message:', serviceError?.message);
        console.error('[Controller] Service error name:', serviceError?.name);
        if (serviceError instanceof Error) {
          console.error('[Controller] Service error stack:', serviceError.stack);
        }
        // Return empty array on service error
        return [];
      }
      
      // Ensure we always return an array
      if (!Array.isArray(requests)) {
        console.warn('[Controller] Service returned non-array:', typeof requests, requests);
        return [];
      }
      
      console.log(`[Controller] Successfully returning ${requests.length} requests`);
      return requests;
    } catch (error: any) {
      // Log error but return empty array to prevent frontend crash
      console.error('[Controller] Unexpected error in getMyPendingRequests:', error);
      console.error('[Controller] Error type:', typeof error);
      console.error('[Controller] Error message:', error?.message);
      if (error instanceof Error) {
        console.error('[Controller] Error stack:', error.stack);
      }
      return [];
    }
  }

  @Get('details/:id')
  getWorkspaceDetails(@Param('id') id: string, @Request() req) {
    return this.workspacesService.getWorkspaceWithEnrollmentStatus(
      id,
      req.user.id,
    );
  }

  @Get()
  findAll(@Request() req) {
    return this.workspacesService.findAllByOwner(req.user.id);
  }

  @Get(':id/request-status')
  getRequestStatus(@Param('id') id: string, @Request() req) {
    return this.workspacesService.getUserEnrollmentRequest(id, req.user.id);
  }

  @Get(':id/requests')
  getPendingRequests(@Param('id') id: string, @Request() req) {
    return this.workspacesService.getPendingRequests(id, req.user.id);
  }

  @Get(':id/users')
  getEnrolledUsers(@Param('id') id: string, @Request() req) {
    return this.workspacesService.getEnrolledUsers(id, req.user.id);
  }

  @Delete(':id/users/:userId')
  async removeUser(
    @Param('id') workspaceId: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    await this.workspacesService.removeUserFromWorkspace(
      workspaceId,
      userId,
      req.user.id,
    );
    return { message: 'User removed successfully' };
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.workspacesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @Request() req,
  ) {
    return this.workspacesService.update(id, updateWorkspaceDto, req.user.id);
  }

  @Post('enroll')
  requestEnrollment(@Body() enrollDto: EnrollWorkspaceDto, @Request() req) {
    return this.workspacesService.requestEnrollment(enrollDto, req.user.id);
  }

  @Post('requests/:requestId/approve')
  approveRequest(@Param('requestId') requestId: string, @Request() req) {
    return this.workspacesService.approveEnrollmentRequest(requestId, req.user.id);
  }

  @Post('requests/:requestId/reject')
  rejectRequest(@Param('requestId') requestId: string, @Request() req) {
    return this.workspacesService.rejectEnrollmentRequest(requestId, req.user.id).then(() => ({
      message: 'Enrollment request rejected successfully',
    }));
  }

  @Delete('enroll/:workspaceId')
  unenroll(@Param('workspaceId') workspaceId: string, @Request() req) {
    return this.workspacesService.unenrollFromWorkspace(
      workspaceId,
      req.user.id,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.workspacesService.remove(id, req.user.id);
  }

  // ============================================================================
  // INVITATION ENDPOINTS
  // ============================================================================

  @Post(':id/invite')
  async inviteUser(
    @Param('id') workspaceId: string,
    @Body() inviteUserDto: InviteUserDto,
    @Request() req,
  ) {
    return this.workspacesService.createInvitation(
      workspaceId,
      inviteUserDto.email,
      req.user.id,
    );
  }

  @Get(':id/invitations')
  async getWorkspaceInvitations(
    @Param('id') workspaceId: string,
    @Request() req,
  ) {
    return this.workspacesService.getWorkspaceInvitations(
      workspaceId,
      req.user.id,
    );
  }

  @Get('invitations/my-invitations')
  async getMyInvitations(@Request() req) {
    return this.workspacesService.getUserInvitations(req.user.email);
  }

  @Post('invitations/:invitationId/accept')
  async acceptInvitation(
    @Param('invitationId') invitationId: string,
    @Request() req,
  ) {
    await this.workspacesService.acceptInvitation(
      invitationId,
      req.user.id,
      req.user.email,
    );
    return { message: 'Invitation accepted successfully' };
  }

  @Post('invitations/:invitationId/reject')
  async rejectInvitation(
    @Param('invitationId') invitationId: string,
    @Request() req,
  ) {
    await this.workspacesService.rejectInvitation(
      invitationId,
      req.user.id,
      req.user.email,
    );
    return { message: 'Invitation rejected successfully' };
  }

  @Delete('invitations/:invitationId')
  async cancelInvitation(
    @Param('invitationId') invitationId: string,
    @Request() req,
  ) {
    await this.workspacesService.cancelInvitation(invitationId, req.user.id);
    return { message: 'Invitation cancelled successfully' };
  }

  // ============================================================================
  // ROSTER ENDPOINTS
  // ============================================================================

  @Post('rosters/save')
  async saveRoster(@Body() saveRosterDto: SaveRosterDto, @Request() req) {
    return this.workspacesService.saveRoster(saveRosterDto, req.user.id);
  }

  @Post('rosters/:rosterId/publish')
  async publishRoster(@Param('rosterId') rosterId: string, @Request() req) {
    return this.workspacesService.publishRoster(rosterId, req.user.id);
  }

  @Post('rosters/:rosterId/unpublish')
  async unpublishRoster(@Param('rosterId') rosterId: string, @Request() req) {
    return this.workspacesService.unpublishRoster(rosterId, req.user.id);
  }

  // IMPORTANT: More specific routes must come BEFORE generic routes!
  @Get('rosters/my-rosters/:month/:year')
  async getMyPublishedRosters(
    @Param('month') month: string,
    @Param('year') year: string,
    @Request() req,
  ) {
    return this.workspacesService.getUserPublishedRosters(
      req.user.id,
      parseInt(month),
      parseInt(year),
    );
  }

  @Get('rosters/:workspaceId/:month/:year')
  async getRoster(
    @Param('workspaceId') workspaceId: string,
    @Param('month') month: string,
    @Param('year') year: string,
    @Request() req,
  ) {
    return this.workspacesService.getRoster(
      workspaceId,
      parseInt(month),
      parseInt(year),
      req.user.id,
    );
  }

  @Delete('rosters/:rosterId')
  async deleteRoster(@Param('rosterId') rosterId: string, @Request() req) {
    await this.workspacesService.deleteRoster(rosterId, req.user.id);
    return { message: 'Roster deleted successfully' };
  }

  // ============================================================================
  // LEAVE MANAGEMENT ENDPOINTS
  // ============================================================================

  @Post('leave-requests')
  async requestLeave(
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
    @Request() req,
  ) {
    return this.workspacesService.requestLeave(
      createLeaveRequestDto,
      req.user.id,
    );
  }

  @Get('leave-requests/my-requests')
  async getMyLeaveRequests(@Request() req) {
    return this.workspacesService.getMyLeaveRequests(req.user.id);
  }

  @Get(':workspaceId/leave-requests')
  async getWorkspaceLeaveRequests(
    @Param('workspaceId') workspaceId: string,
    @Request() req,
  ) {
    return this.workspacesService.getWorkspaceLeaveRequests(
      workspaceId,
      req.user.id,
    );
  }

  @Post('leave-requests/:requestId/approve')
  async approveLeaveRequest(
    @Param('requestId') requestId: string,
    @Request() req,
  ) {
    await this.workspacesService.approveLeaveRequest(requestId, req.user.id);
    return { message: 'Leave request approved successfully' };
  }

  @Post('leave-requests/:requestId/reject')
  async rejectLeaveRequest(
    @Param('requestId') requestId: string,
    @Request() req,
  ) {
    await this.workspacesService.rejectLeaveRequest(requestId, req.user.id);
    return { message: 'Leave request rejected successfully' };
  }

  @Delete('leave-requests/:requestId')
  async cancelLeaveRequest(
    @Param('requestId') requestId: string,
    @Request() req,
  ) {
    await this.workspacesService.cancelLeaveRequest(requestId, req.user.id);
    return { message: 'Leave request cancelled successfully' };
  }
}

