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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { SearchWorkspaceDto } from './dto/search-workspace.dto';
import { EnrollWorkspaceDto } from './dto/enroll-workspace.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { SaveRosterDto } from './dto/save-roster.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Workspaces')
@ApiBearerAuth()
@Controller('workspaces')
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new workspace',
    description: 'Creates a new workspace owned by the authenticated user',
  })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createWorkspaceDto: CreateWorkspaceDto, @Request() req) {
    return this.workspacesService.create(createWorkspaceDto, req.user.id);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search workspaces',
    description:
      'Search for workspaces by name or ID. Returns workspaces with enrollment status for the current user',
  })
  @ApiQuery({
    name: 'query',
    description: 'Search query (workspace name or ID)',
    example: 'Emergency',
  })
  @ApiResponse({
    status: 200,
    description:
      'List of workspaces matching the search query with enrollment status',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async search(@Query() searchDto: SearchWorkspaceDto, @Request() req) {
    const workspaces = await this.workspacesService.searchWorkspaces(searchDto);

    // Add enrollment status for each workspace
    const workspacesWithStatus = await Promise.all(
      workspaces.map(async (workspace) => {
        const enrollment = await this.workspacesService.checkEnrollment(
          workspace.id,
          req.user.id,
        );
        const enrollmentRequest =
          await this.workspacesService.checkEnrollmentRequest(
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
  @ApiOperation({
    summary: 'Get enrolled workspaces',
    description: 'Returns all workspaces the current user is enrolled in',
  })
  @ApiResponse({ status: 200, description: 'List of enrolled workspaces' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getEnrolled(@Request() req) {
    return this.workspacesService.getEnrolledWorkspaces(req.user.id);
  }

  @Post('favorite/:id')
  @ApiOperation({
    summary: 'Set favorite workspace',
    description: 'Marks a workspace as favorite for the current user',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Workspace set as favorite successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  setFavorite(@Param('id') id: string, @Request() req) {
    return this.workspacesService.setFavoriteWorkspace(id, req.user.id);
  }

  @Get('favorite')
  @ApiOperation({
    summary: 'Get favorite workspace',
    description: "Returns the current user's favorite workspace",
  })
  @ApiResponse({ status: 200, description: 'Favorite workspace details' })
  @ApiResponse({ status: 404, description: 'No favorite workspace found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getFavorite(@Request() req) {
    return this.workspacesService.getFavoriteWorkspace(req.user.id);
  }

  @Delete('favorite')
  @ApiOperation({
    summary: 'Remove favorite workspace',
    description: 'Removes the favorite workspace for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Favorite workspace removed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeFavorite(@Request() req) {
    await this.workspacesService.removeFavoriteWorkspace(req.user.id);
    return { message: 'Favorite removed successfully' };
  }

  @Get('my-requests')
  @ApiOperation({
    summary: 'Get my pending enrollment requests',
    description:
      'Returns all pending enrollment requests made by the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of pending enrollment requests',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyPendingRequests(@Request() req) {
    try {
      if (!req.user || !req.user.id) {
        console.error('[Controller] No user or user.id in request');
        return [];
      }

      console.log(
        `[Controller] Getting pending requests for user: ${req.user.id}`,
      );

      let requests: any[] = [];
      try {
        requests = await this.workspacesService.getUserPendingRequests(
          req.user.id,
        );
        console.log(
          `[Controller] Service returned ${requests?.length || 0} requests`,
        );
      } catch (serviceError: any) {
        console.error('[Controller] Service error:', serviceError);
        console.error(
          '[Controller] Service error message:',
          serviceError?.message,
        );
        console.error('[Controller] Service error name:', serviceError?.name);
        if (serviceError instanceof Error) {
          console.error(
            '[Controller] Service error stack:',
            serviceError.stack,
          );
        }
        // Return empty array on service error
        return [];
      }

      // Ensure we always return an array
      if (!Array.isArray(requests)) {
        console.warn(
          '[Controller] Service returned non-array:',
          typeof requests,
          requests,
        );
        return [];
      }

      console.log(
        `[Controller] Successfully returning ${requests.length} requests`,
      );
      return requests;
    } catch (error: any) {
      // Log error but return empty array to prevent frontend crash
      console.error(
        '[Controller] Unexpected error in getMyPendingRequests:',
        error,
      );
      console.error('[Controller] Error type:', typeof error);
      console.error('[Controller] Error message:', error?.message);
      if (error instanceof Error) {
        console.error('[Controller] Error stack:', error.stack);
      }
      return [];
    }
  }

  @Get('details/:id')
  @ApiOperation({
    summary: 'Get workspace details with enrollment status',
    description:
      'Returns workspace details including enrollment status for the current user',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Workspace details with enrollment status',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  getWorkspaceDetails(@Param('id') id: string, @Request() req) {
    return this.workspacesService.getWorkspaceWithEnrollmentStatus(
      id,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all workspaces owned by user',
    description: 'Returns all workspaces owned by the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'List of owned workspaces' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Request() req) {
    return this.workspacesService.findAllByOwner(req.user.id);
  }

  @Get(':id/request-status')
  @ApiOperation({
    summary: 'Get enrollment request status',
    description:
      'Returns the enrollment request status for the current user in the specified workspace',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Enrollment request status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  getRequestStatus(@Param('id') id: string, @Request() req) {
    return this.workspacesService.getUserEnrollmentRequest(id, req.user.id);
  }

  @Get(':id/requests')
  @ApiOperation({
    summary: 'Get pending enrollment requests',
    description:
      'Returns all pending enrollment requests for a workspace (workspace owner only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of pending enrollment requests',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  getPendingRequests(@Param('id') id: string, @Request() req) {
    return this.workspacesService.getPendingRequests(id, req.user.id);
  }

  @Get(':id/users')
  @ApiOperation({
    summary: 'Get enrolled users',
    description:
      'Returns all users enrolled in the workspace (workspace owner only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'List of enrolled users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  getEnrolledUsers(@Param('id') id: string, @Request() req) {
    return this.workspacesService.getEnrolledUsers(id, req.user.id);
  }

  @Delete(':id/users/:userId')
  @ApiOperation({
    summary: 'Remove user from workspace',
    description: 'Removes a user from the workspace (workspace owner only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'userId',
    description: 'User UUID to remove',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({ status: 200, description: 'User removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  @ApiResponse({ status: 404, description: 'Workspace or user not found' })
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
  @ApiOperation({
    summary: 'Get workspace by ID',
    description: 'Returns workspace details by ID (must be owner or enrolled)',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Workspace details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not owner or enrolled',
  })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.workspacesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update workspace',
    description: 'Updates workspace details (workspace owner only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Workspace updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  update(
    @Param('id') id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @Request() req,
  ) {
    return this.workspacesService.update(id, updateWorkspaceDto, req.user.id);
  }

  @Post('enroll')
  @ApiOperation({
    summary: 'Request workspace enrollment',
    description: 'Creates an enrollment request for a workspace',
  })
  @ApiResponse({
    status: 201,
    description: 'Enrollment request created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Already enrolled or request exists',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  requestEnrollment(@Body() enrollDto: EnrollWorkspaceDto, @Request() req) {
    return this.workspacesService.requestEnrollment(enrollDto, req.user.id);
  }

  @Post('requests/:requestId/approve')
  @ApiOperation({
    summary: 'Approve enrollment request',
    description: 'Approves an enrollment request (workspace owner only)',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Enrollment request UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollment request approved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  approveRequest(@Param('requestId') requestId: string, @Request() req) {
    return this.workspacesService.approveEnrollmentRequest(
      requestId,
      req.user.id,
    );
  }

  @Post('requests/:requestId/reject')
  @ApiOperation({
    summary: 'Reject enrollment request',
    description: 'Rejects an enrollment request (workspace owner only)',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Enrollment request UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollment request rejected successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  rejectRequest(@Param('requestId') requestId: string, @Request() req) {
    return this.workspacesService
      .rejectEnrollmentRequest(requestId, req.user.id)
      .then(() => ({
        message: 'Enrollment request rejected successfully',
      }));
  }

  @Delete('enroll/:workspaceId')
  @ApiOperation({
    summary: 'Unenroll from workspace',
    description: 'Removes the current user from a workspace',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully unenrolled from workspace',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Workspace or enrollment not found',
  })
  unenroll(@Param('workspaceId') workspaceId: string, @Request() req) {
    return this.workspacesService.unenrollFromWorkspace(
      workspaceId,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete workspace',
    description: 'Deletes a workspace (workspace owner only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Workspace deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  remove(@Param('id') id: string, @Request() req) {
    return this.workspacesService.remove(id, req.user.id);
  }

  // ============================================================================
  // INVITATION ENDPOINTS
  // ============================================================================

  @Post(':id/invite')
  @ApiOperation({
    summary: 'Invite user to workspace',
    description:
      'Sends an invitation to a user to join the workspace (workspace owner only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
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
  @ApiOperation({
    summary: 'Get workspace invitations',
    description:
      'Returns all invitations for a workspace (workspace owner only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Workspace UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'List of workspace invitations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
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
  @ApiOperation({
    summary: 'Get my invitations',
    description: 'Returns all invitations received by the current user',
  })
  @ApiResponse({ status: 200, description: 'List of user invitations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyInvitations(@Request() req) {
    return this.workspacesService.getUserInvitations(req.user.email);
  }

  @Post('invitations/:invitationId/accept')
  @ApiOperation({
    summary: 'Accept invitation',
    description: 'Accepts a workspace invitation',
  })
  @ApiParam({
    name: 'invitationId',
    description: 'Invitation UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
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
  @ApiOperation({
    summary: 'Reject invitation',
    description: 'Rejects a workspace invitation',
  })
  @ApiParam({
    name: 'invitationId',
    description: 'Invitation UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Invitation rejected successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
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
  @ApiOperation({
    summary: 'Cancel invitation',
    description: 'Cancels a workspace invitation (workspace owner only)',
  })
  @ApiParam({
    name: 'invitationId',
    description: 'Invitation UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation cancelled successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
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
  @ApiOperation({
    summary: 'Save roster',
    description:
      'Saves or updates a roster for a workspace (workspace owner only)',
  })
  @ApiResponse({ status: 201, description: 'Roster saved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  async saveRoster(@Body() saveRosterDto: SaveRosterDto, @Request() req) {
    return this.workspacesService.saveRoster(saveRosterDto, req.user.id);
  }

  @Post('rosters/:rosterId/publish')
  @ApiOperation({
    summary: 'Publish roster',
    description:
      'Publishes a roster making it visible to enrolled users (workspace owner only)',
  })
  @ApiParam({
    name: 'rosterId',
    description: 'Roster UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Roster published successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  @ApiResponse({ status: 404, description: 'Roster not found' })
  async publishRoster(@Param('rosterId') rosterId: string, @Request() req) {
    return this.workspacesService.publishRoster(rosterId, req.user.id);
  }

  @Post('rosters/:rosterId/unpublish')
  @ApiOperation({
    summary: 'Unpublish roster',
    description:
      'Unpublishes a roster making it hidden from enrolled users (workspace owner only)',
  })
  @ApiParam({
    name: 'rosterId',
    description: 'Roster UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Roster unpublished successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  @ApiResponse({ status: 404, description: 'Roster not found' })
  async unpublishRoster(@Param('rosterId') rosterId: string, @Request() req) {
    return this.workspacesService.unpublishRoster(rosterId, req.user.id);
  }

  // IMPORTANT: More specific routes must come BEFORE generic routes!
  @Get('rosters/my-rosters/:month/:year')
  @ApiOperation({
    summary: 'Get my published rosters',
    description:
      'Returns all published rosters for workspaces the user is enrolled in, filtered by month and year',
  })
  @ApiParam({ name: 'month', description: 'Month number (1-12)', example: '1' })
  @ApiParam({ name: 'year', description: 'Year (2000-2100)', example: '2024' })
  @ApiResponse({ status: 200, description: 'List of published rosters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({
    summary: 'Get roster',
    description:
      'Returns a roster for a specific workspace, month, and year (must be enrolled or owner)',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({ name: 'month', description: 'Month number (1-12)', example: '1' })
  @ApiParam({ name: 'year', description: 'Year (2000-2100)', example: '2024' })
  @ApiResponse({ status: 200, description: 'Roster details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not enrolled or owner',
  })
  @ApiResponse({ status: 404, description: 'Roster not found' })
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
  @ApiOperation({
    summary: 'Delete roster',
    description: 'Deletes a roster (workspace owner only)',
  })
  @ApiParam({
    name: 'rosterId',
    description: 'Roster UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Roster deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  @ApiResponse({ status: 404, description: 'Roster not found' })
  async deleteRoster(@Param('rosterId') rosterId: string, @Request() req) {
    await this.workspacesService.deleteRoster(rosterId, req.user.id);
    return { message: 'Roster deleted successfully' };
  }

  // ============================================================================
  // LEAVE MANAGEMENT ENDPOINTS
  // ============================================================================

  @Post('leave-requests')
  @ApiOperation({
    summary: 'Create leave request',
    description: 'Creates a new leave request for a workspace',
  })
  @ApiResponse({
    status: 201,
    description: 'Leave request created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid dates or overlapping requests',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
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
  @ApiOperation({
    summary: 'Get my leave requests',
    description: 'Returns all leave requests created by the current user',
  })
  @ApiResponse({ status: 200, description: 'List of user leave requests' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyLeaveRequests(@Request() req) {
    return this.workspacesService.getMyLeaveRequests(req.user.id);
  }

  @Get(':workspaceId/leave-requests')
  @ApiOperation({
    summary: 'Get workspace leave requests',
    description:
      'Returns all leave requests for a workspace (workspace owner only)',
  })
  @ApiParam({
    name: 'workspaceId',
    description: 'Workspace UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'List of workspace leave requests' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
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
  @ApiOperation({
    summary: 'Approve leave request',
    description: 'Approves a leave request (workspace owner only)',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Leave request UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Leave request approved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  async approveLeaveRequest(
    @Param('requestId') requestId: string,
    @Request() req,
  ) {
    await this.workspacesService.approveLeaveRequest(requestId, req.user.id);
    return { message: 'Leave request approved successfully' };
  }

  @Post('leave-requests/:requestId/reject')
  @ApiOperation({
    summary: 'Reject leave request',
    description: 'Rejects a leave request (workspace owner only)',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Leave request UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Leave request rejected successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not workspace owner' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  async rejectLeaveRequest(
    @Param('requestId') requestId: string,
    @Request() req,
  ) {
    await this.workspacesService.rejectLeaveRequest(requestId, req.user.id);
    return { message: 'Leave request rejected successfully' };
  }

  @Delete('leave-requests/:requestId')
  @ApiOperation({
    summary: 'Cancel leave request',
    description: 'Cancels a leave request (request creator only)',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Leave request UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Leave request cancelled successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not request creator' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  async cancelLeaveRequest(
    @Param('requestId') requestId: string,
    @Request() req,
  ) {
    await this.workspacesService.cancelLeaveRequest(requestId, req.user.id);
    return { message: 'Leave request cancelled successfully' };
  }
}
