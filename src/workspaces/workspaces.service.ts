import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Workspace } from './workspace.entity';
import { Enrollment } from './enrollment.entity';
import {
  EnrollmentRequest,
  EnrollmentRequestStatus,
} from './enrollment-request.entity';
import { UserFavorite } from './user-favorite.entity';
import { Invitation, InvitationStatus } from './invitation.entity';
import { Roster, RosterStatus } from './roster.entity';
import { RosterAssignment } from './roster-assignment.entity';
import { LeaveRequest, LeaveRequestStatus } from './leave-request.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { SearchWorkspaceDto } from './dto/search-workspace.dto';
import { EnrollWorkspaceDto } from './dto/enroll-workspace.dto';
import { SaveRosterDto } from './dto/save-roster.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    @InjectRepository(Workspace)
    private workspaceRepository: Repository<Workspace>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(EnrollmentRequest)
    private enrollmentRequestRepository: Repository<EnrollmentRequest>,
    @InjectRepository(UserFavorite)
    private userFavoriteRepository: Repository<UserFavorite>,
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(Roster)
    private rosterRepository: Repository<Roster>,
    @InjectRepository(RosterAssignment)
    private rosterAssignmentRepository: Repository<RosterAssignment>,
    @InjectRepository(LeaveRequest)
    private leaveRequestRepository: Repository<LeaveRequest>,
    private authService: AuthService,
  ) {}

  async create(
    createWorkspaceDto: CreateWorkspaceDto,
    ownerId: string,
  ): Promise<Workspace> {
    const workspace = this.workspaceRepository.create({
      ...createWorkspaceDto,
      ownerId,
    });

    const savedWorkspace = await this.workspaceRepository.save(workspace);
    this.logger.log(
      `Workspace created: ${savedWorkspace.id} by user ${ownerId}`,
    );
    return savedWorkspace;
  }

  async findAllByOwner(ownerId: string): Promise<Workspace[]> {
    return this.workspaceRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, ownerId: string): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    if (workspace.ownerId !== ownerId) {
      throw new ForbiddenException(
        'You do not have permission to access this workspace',
      );
    }

    return workspace;
  }

  async update(
    id: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
    ownerId: string,
  ): Promise<Workspace> {
    const workspace = await this.findOne(id, ownerId);

    Object.assign(workspace, updateWorkspaceDto);
    const updatedWorkspace = await this.workspaceRepository.save(workspace);
    this.logger.log(`Workspace updated: ${id} by user ${ownerId}`);
    return updatedWorkspace;
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const workspace = await this.findOne(id, ownerId);

    // Delete all enrollment requests for this workspace
    const enrollmentRequests = await this.enrollmentRequestRepository.find({
      where: { workspaceId: id },
    });
    if (enrollmentRequests.length > 0) {
      await this.enrollmentRequestRepository.remove(enrollmentRequests);
      this.logger.log(
        `Deleted ${enrollmentRequests.length} enrollment request(s) for workspace ${id}`,
      );
    }

    // Delete all enrollments for this workspace
    const enrollments = await this.enrollmentRepository.find({
      where: { workspaceId: id },
    });
    if (enrollments.length > 0) {
      // Shift favorites for all enrolled users
      for (const enrollment of enrollments) {
        await this.shiftFavoriteToNext(enrollment.userId, id);
      }

      await this.enrollmentRepository.remove(enrollments);
      this.logger.log(
        `Deleted ${enrollments.length} enrollment(s) for workspace ${id}`,
      );
    }

    // Finally delete the workspace
    await this.workspaceRepository.remove(workspace);
    this.logger.log(
      `Workspace deleted: ${id} by user ${ownerId} (removed ${enrollments.length} enrollments and ${enrollmentRequests.length} requests)`,
    );
  }

  async verifyOwnership(id: string, ownerId: string): Promise<boolean> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
    });

    if (!workspace) {
      return false;
    }

    return workspace.ownerId === ownerId;
  }

  async searchWorkspaces(searchDto: SearchWorkspaceDto): Promise<Workspace[]> {
    const { query } = searchDto;

    // Check if query is a UUID (workspace ID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuidRegex.test(query)) {
      // Search by ID
      const workspace = await this.workspaceRepository.findOne({
        where: { id: query },
      });
      return workspace ? [workspace] : [];
    } else {
      // Search by name (case-insensitive partial match)
      return this.workspaceRepository.find({
        where: {
          name: Like(`%${query}%`),
        },
        order: { createdAt: 'DESC' },
        take: 20, // Limit results
      });
    }
  }

  async requestEnrollment(
    enrollDto: EnrollWorkspaceDto,
    userId: string,
  ): Promise<EnrollmentRequest | Enrollment> {
    const { workspaceId } = enrollDto;

    // Check if workspace exists
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Check if already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        workspaceId,
        userId,
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('You are already enrolled in this workspace');
    }

    // Check if there's already a pending request
    const existingRequest = await this.enrollmentRequestRepository.findOne({
      where: {
        workspaceId,
        userId,
        status: EnrollmentRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        'You already have a pending enrollment request for this workspace',
      );
    }

    // Special case: If the user is the workspace owner, auto-approve the enrollment
    if (workspace.ownerId === userId) {
      // Create enrollment directly (auto-approved for owner)
      const enrollment = this.enrollmentRepository.create({
        workspaceId,
        userId,
      });

      const savedEnrollment = await this.enrollmentRepository.save(enrollment);

      // Also create an approved enrollment request record for consistency
      const request = this.enrollmentRequestRepository.create({
        workspaceId,
        userId,
        status: EnrollmentRequestStatus.APPROVED,
      });

      await this.enrollmentRequestRepository.save(request);

      this.logger.log(
        `Owner ${userId} auto-enrolled in their own workspace ${workspaceId}`,
      );

      // Auto-set as favorite if this is the user's first enrollment
      await this.autoSetFirstFavorite(userId);

      // Return the enrollment (not the request) for consistency
      return savedEnrollment as any;
    }

    // Regular user: Create pending enrollment request
    const request = this.enrollmentRequestRepository.create({
      workspaceId,
      userId,
      status: EnrollmentRequestStatus.PENDING,
    });

    const savedRequest = await this.enrollmentRequestRepository.save(request);
    this.logger.log(
      `User ${userId} requested enrollment in workspace ${workspaceId}`,
    );
    return savedRequest;
  }

  async getPendingRequests(
    workspaceId: string,
    requestingUserId: string,
  ): Promise<any[]> {
    // Verify workspace exists and user is the owner
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    if (workspace.ownerId !== requestingUserId) {
      throw new ForbiddenException(
        'Only the workspace owner can view pending enrollment requests',
      );
    }

    // Get all pending requests
    const requests = await this.enrollmentRequestRepository.find({
      where: {
        workspaceId,
        status: EnrollmentRequestStatus.PENDING,
      },
      order: { createdAt: 'ASC' },
    });

    // Fetch user details for each request
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const user = await this.authService.getUserById(request.userId);
        return {
          id: request.id,
          userId: request.userId,
          email: user?.email || 'Unknown',
          requestedAt: request.createdAt,
        };
      }),
    );

    return requestsWithDetails;
  }

  async approveEnrollmentRequest(
    requestId: string,
    ownerId: string,
  ): Promise<Enrollment> {
    const request = await this.enrollmentRequestRepository.findOne({
      where: { id: requestId },
      relations: ['workspace'],
    });

    if (!request) {
      throw new NotFoundException('Enrollment request not found');
    }

    if (request.workspace.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Only the workspace owner can approve enrollment requests',
      );
    }

    if (request.status !== EnrollmentRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve request with status: ${request.status}`,
      );
    }

    // Check if user is already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        workspaceId: request.workspaceId,
        userId: request.userId,
      },
    });

    if (existingEnrollment) {
      // Update request status and return existing enrollment
      request.status = EnrollmentRequestStatus.APPROVED;
      await this.enrollmentRequestRepository.save(request);
      return existingEnrollment;
    }

    // Create enrollment
    const enrollment = this.enrollmentRepository.create({
      workspaceId: request.workspaceId,
      userId: request.userId,
    });

    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    // Update request status
    request.status = EnrollmentRequestStatus.APPROVED;
    await this.enrollmentRequestRepository.save(request);

    this.logger.log(
      `Enrollment request ${requestId} approved. User ${request.userId} enrolled in workspace ${request.workspaceId}`,
    );

    // Auto-set as favorite if this is the user's first enrollment
    await this.autoSetFirstFavorite(request.userId);

    return savedEnrollment;
  }

  async rejectEnrollmentRequest(
    requestId: string,
    ownerId: string,
  ): Promise<void> {
    const request = await this.enrollmentRequestRepository.findOne({
      where: { id: requestId },
      relations: ['workspace'],
    });

    if (!request) {
      throw new NotFoundException('Enrollment request not found');
    }

    if (request.workspace.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Only the workspace owner can reject enrollment requests',
      );
    }

    if (request.status !== EnrollmentRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject request with status: ${request.status}`,
      );
    }

    // Update request status
    request.status = EnrollmentRequestStatus.REJECTED;
    await this.enrollmentRequestRepository.save(request);

    this.logger.log(
      `Enrollment request ${requestId} rejected by owner ${ownerId}`,
    );
  }

  async getEnrolledWorkspaces(userId: string): Promise<Workspace[]> {
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
      relations: ['workspace'],
      order: { enrolledAt: 'DESC' },
    });

    return enrollments.map((enrollment) => enrollment.workspace);
  }

  async checkEnrollment(
    workspaceId: string,
    userId: string,
  ): Promise<Enrollment | null> {
    return this.enrollmentRepository.findOne({
      where: {
        workspaceId,
        userId,
      },
    });
  }

  async checkEnrollmentRequest(
    workspaceId: string,
    userId: string,
  ): Promise<EnrollmentRequest | null> {
    return this.enrollmentRequestRepository.findOne({
      where: {
        workspaceId,
        userId,
        status: EnrollmentRequestStatus.PENDING,
      },
    });
  }

  async unenrollFromWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        workspaceId,
        userId,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('You are not enrolled in this workspace');
    }

    // Remove the enrollment record
    await this.enrollmentRepository.remove(enrollment);

    // Also remove any enrollment request records for this user and workspace
    // This ensures a fresh start if they enroll again
    const enrollmentRequests = await this.enrollmentRequestRepository.find({
      where: {
        workspaceId,
        userId,
      },
    });

    if (enrollmentRequests && enrollmentRequests.length > 0) {
      await this.enrollmentRequestRepository.remove(enrollmentRequests);
      this.logger.log(
        `Removed ${enrollmentRequests.length} enrollment request(s) for user ${userId} and workspace ${workspaceId}`,
      );
    }

    this.logger.log(`User ${userId} unenrolled from workspace ${workspaceId}`);

    // Shift favorite to next enrollment if needed
    await this.shiftFavoriteToNext(userId, workspaceId);
  }

  async removeUserFromWorkspace(
    workspaceId: string,
    targetUserId: string,
    ownerId: string,
  ): Promise<void> {
    // Verify workspace exists and requesting user is the owner
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    if (workspace.ownerId !== ownerId) {
      throw new ForbiddenException('Only the workspace owner can remove users');
    }

    // Owner cannot remove themselves
    if (targetUserId === ownerId) {
      throw new BadRequestException(
        'You cannot remove yourself from your own workspace. Use unenroll instead.',
      );
    }

    // Find the enrollment
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        workspaceId,
        userId: targetUserId,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('User is not enrolled in this workspace');
    }

    // Remove the enrollment record
    await this.enrollmentRepository.remove(enrollment);

    // Also remove any enrollment request records
    const enrollmentRequests = await this.enrollmentRequestRepository.find({
      where: {
        workspaceId,
        userId: targetUserId,
      },
    });

    if (enrollmentRequests && enrollmentRequests.length > 0) {
      await this.enrollmentRequestRepository.remove(enrollmentRequests);
    }

    this.logger.log(
      `Owner ${ownerId} removed user ${targetUserId} from workspace ${workspaceId}`,
    );

    // Shift favorite to next enrollment if needed
    await this.shiftFavoriteToNext(targetUserId, workspaceId);
  }

  async getWorkspaceWithEnrollmentStatus(
    workspaceId: string,
    userId: string,
  ): Promise<{
    workspace: Workspace;
    isEnrolled: boolean;
    isOwner: boolean;
    requestStatus?: string;
  }> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        workspaceId,
        userId,
      },
    });

    // Check for enrollment request status
    const request = await this.enrollmentRequestRepository.findOne({
      where: {
        workspaceId,
        userId,
      },
      order: { createdAt: 'DESC' },
    });

    return {
      workspace,
      isEnrolled: !!enrollment,
      isOwner: workspace.ownerId === userId,
      requestStatus: request?.status || null,
    };
  }

  async getUserEnrollmentRequest(
    workspaceId: string,
    userId: string,
  ): Promise<{ status: string; requestedAt: Date } | null> {
    const request = await this.enrollmentRequestRepository.findOne({
      where: {
        workspaceId,
        userId,
      },
      order: { createdAt: 'DESC' },
    });

    if (!request) {
      return null;
    }

    return {
      status: request.status,
      requestedAt: request.createdAt,
    };
  }

  async getUserPendingRequests(userId: string): Promise<any[]> {
    try {
      this.logger.log(`[getUserPendingRequests] Starting for user ${userId}`);

      if (!userId || typeof userId !== 'string') {
        this.logger.error(`[getUserPendingRequests] Invalid userId: ${userId}`);
        return [];
      }

      // Use the exact same pattern as requestEnrollment's findOne check
      const requests = await this.enrollmentRequestRepository.find({
        where: {
          userId: userId,
          status: EnrollmentRequestStatus.PENDING,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      this.logger.log(
        `[getUserPendingRequests] Found ${requests?.length || 0} requests`,
      );

      if (!requests || requests.length === 0) {
        return [];
      }

      // Load workspaces and map results
      const result: any[] = [];
      for (const request of requests) {
        try {
          let workspaceName = 'Unknown Workspace';
          if (request.workspaceId) {
            const workspace = await this.workspaceRepository.findOne({
              where: { id: request.workspaceId },
            });
            if (workspace) {
              workspaceName = workspace.name;
            }
          }

          result.push({
            id: request.id,
            workspaceId: request.workspaceId,
            workspaceName: workspaceName,
            requestedAt: request.createdAt
              ? request.createdAt.toISOString()
              : new Date().toISOString(),
            status: request.status || EnrollmentRequestStatus.PENDING,
          });
        } catch (itemError: any) {
          this.logger.warn(
            `[getUserPendingRequests] Error processing request ${request.id}:`,
            itemError?.message,
          );
          // Skip this item but continue with others
        }
      }

      this.logger.log(
        `[getUserPendingRequests] Returning ${result.length} requests`,
      );
      return result;
    } catch (error: any) {
      this.logger.error(
        `[getUserPendingRequests] Error:`,
        error?.message || error,
      );
      if (error instanceof Error) {
        this.logger.error('[getUserPendingRequests] Stack:', error.stack);
      }
      return [];
    }
  }

  async getEnrolledUsers(
    workspaceId: string,
    requestingUserId: string,
  ): Promise<any[]> {
    // Verify workspace exists and user has access (owner or enrolled)
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Check if user is owner or enrolled
    const isOwner = workspace.ownerId === requestingUserId;
    const isEnrolled = await this.enrollmentRepository.findOne({
      where: {
        workspaceId,
        userId: requestingUserId,
      },
    });

    if (!isOwner && !isEnrolled) {
      throw new ForbiddenException(
        'You do not have permission to view users in this workspace',
      );
    }

    // Get all enrollments for this workspace
    const enrollments = await this.enrollmentRepository.find({
      where: { workspaceId },
      order: { enrolledAt: 'ASC' },
    });

    // Fetch user details for each enrolled user
    const usersWithDetails = await Promise.all(
      enrollments.map(async (enrollment) => {
        const user = await this.authService.getUserById(enrollment.userId);
        return {
          id: enrollment.userId,
          email: user?.email || 'Unknown',
          enrolledAt: enrollment.enrolledAt,
          isOwner: enrollment.userId === workspace.ownerId,
        };
      }),
    );

    // Only return actually enrolled users (owner must enroll to appear in the list)
    return usersWithDetails;
  }

  // Favorite workspace management
  async setFavoriteWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<UserFavorite> {
    // Verify user is enrolled in the workspace
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        workspaceId,
        userId,
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You must be enrolled in a workspace to favorite it',
      );
    }

    // Check if user already has a favorite
    let favorite = await this.userFavoriteRepository.findOne({
      where: { userId },
    });

    if (favorite) {
      // Update existing favorite
      favorite.workspaceId = workspaceId;
      favorite.updatedAt = new Date();
    } else {
      // Create new favorite
      favorite = this.userFavoriteRepository.create({
        userId,
        workspaceId,
      });
    }

    const savedFavorite = await this.userFavoriteRepository.save(favorite);
    this.logger.log(`User ${userId} set favorite workspace to ${workspaceId}`);
    return savedFavorite;
  }

  async getFavoriteWorkspace(userId: string): Promise<any | null> {
    const favorite = await this.userFavoriteRepository.findOne({
      where: { userId },
      relations: ['workspace'],
    });

    if (!favorite) {
      return null;
    }

    // Verify user is still enrolled
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        workspaceId: favorite.workspaceId,
        userId,
      },
    });

    if (!enrollment) {
      // User is no longer enrolled, remove the favorite
      await this.userFavoriteRepository.remove(favorite);
      return null;
    }

    return {
      id: favorite.id,
      workspaceId: favorite.workspaceId,
      workspaceName: favorite.workspace.name,
      createdAt: favorite.createdAt,
      updatedAt: favorite.updatedAt,
    };
  }

  async removeFavoriteWorkspace(userId: string): Promise<void> {
    const favorite = await this.userFavoriteRepository.findOne({
      where: { userId },
    });

    if (favorite) {
      await this.userFavoriteRepository.remove(favorite);
      this.logger.log(`User ${userId} removed favorite workspace`);
    }
  }

  async autoSetFirstFavorite(userId: string): Promise<void> {
    // Check if user already has a favorite
    const existingFavorite = await this.userFavoriteRepository.findOne({
      where: { userId },
    });

    if (existingFavorite) {
      return; // Already has a favorite
    }

    // Get first enrollment
    const firstEnrollment = await this.enrollmentRepository.findOne({
      where: { userId },
      order: { enrolledAt: 'ASC' },
    });

    if (firstEnrollment) {
      const favorite = this.userFavoriteRepository.create({
        userId,
        workspaceId: firstEnrollment.workspaceId,
      });
      await this.userFavoriteRepository.save(favorite);
      this.logger.log(
        `Auto-set first favorite for user ${userId} to workspace ${firstEnrollment.workspaceId}`,
      );
    }
  }

  async shiftFavoriteToNext(
    userId: string,
    removedWorkspaceId: string,
  ): Promise<void> {
    // Check if the removed workspace was the favorite
    const favorite = await this.userFavoriteRepository.findOne({
      where: { userId },
    });

    if (favorite && favorite.workspaceId === removedWorkspaceId) {
      // Get next enrollment (oldest remaining)
      const nextEnrollment = await this.enrollmentRepository.findOne({
        where: { userId },
        order: { enrolledAt: 'ASC' },
      });

      if (nextEnrollment) {
        // Update favorite to next enrollment
        favorite.workspaceId = nextEnrollment.workspaceId;
        favorite.updatedAt = new Date();
        await this.userFavoriteRepository.save(favorite);
        this.logger.log(
          `Shifted favorite for user ${userId} to workspace ${nextEnrollment.workspaceId}`,
        );
      } else {
        // No more enrollments, remove favorite
        await this.userFavoriteRepository.remove(favorite);
        this.logger.log(
          `Removed favorite for user ${userId} (no enrollments left)`,
        );
      }
    }
  }

  // ============================================================================
  // INVITATION METHODS
  // ============================================================================

  /**
   * Create an invitation for a user to join a workspace (owner only)
   */
  async createInvitation(
    workspaceId: string,
    inviteeEmail: string,
    inviterId: string,
  ): Promise<Invitation> {
    // Verify workspace exists and user is the owner
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    if (workspace.ownerId !== inviterId) {
      throw new ForbiddenException('Only the workspace owner can invite users');
    }

    // Normalize email
    const normalizedEmail = inviteeEmail.toLowerCase().trim();

    // Check if inviter is trying to invite themselves
    try {
      const inviterUser = await this.authService.getUserById(inviterId);
      if (inviterUser && inviterUser.email.toLowerCase() === normalizedEmail) {
        throw new BadRequestException('You cannot invite yourself');
      }
    } catch (error) {
      // If user lookup fails, continue (user might not exist yet)
      this.logger.warn(`Could not verify inviter email: ${error.message}`);
    }

    // Check if user is already enrolled
    try {
      const inviteeUser =
        await this.authService.getUserByEmail(normalizedEmail);
      if (inviteeUser) {
        const existingEnrollment = await this.enrollmentRepository.findOne({
          where: {
            workspaceId,
            userId: inviteeUser.id,
          },
        });

        if (existingEnrollment) {
          throw new ConflictException(
            'User is already enrolled in this workspace',
          );
        }
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      // If user doesn't exist yet, that's fine - they can accept after signing up
      this.logger.log(
        `Inviting user who may not be registered yet: ${normalizedEmail}`,
      );
    }

    // Check if there's already a pending invitation
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        workspaceId,
        inviteeEmail: normalizedEmail,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new ConflictException(
        'A pending invitation already exists for this user',
      );
    }

    // Create the invitation
    const invitation = this.invitationRepository.create({
      workspaceId,
      inviterId,
      inviteeEmail: normalizedEmail,
      status: InvitationStatus.PENDING,
    });

    const savedInvitation = await this.invitationRepository.save(invitation);
    this.logger.log(
      `Invitation created: ${savedInvitation.id} for ${normalizedEmail} to workspace ${workspaceId}`,
    );

    return savedInvitation;
  }

  /**
   * Get all invitations for a workspace (owner only)
   */
  async getWorkspaceInvitations(
    workspaceId: string,
    ownerId: string,
  ): Promise<Invitation[]> {
    // Verify workspace exists and user is the owner
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    if (workspace.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Only the workspace owner can view invitations',
      );
    }

    return this.invitationRepository.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all pending invitations for the current user (by email)
   */
  async getUserInvitations(userEmail: string): Promise<any[]> {
    const normalizedEmail = userEmail.toLowerCase().trim();

    const invitations = await this.invitationRepository.find({
      where: {
        inviteeEmail: normalizedEmail,
        status: InvitationStatus.PENDING,
      },
      relations: ['workspace'],
      order: { createdAt: 'DESC' },
    });

    // Get inviter details for each invitation
    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        let inviterEmail = 'Unknown';
        try {
          const inviterUser = await this.authService.getUserById(
            invitation.inviterId,
          );
          if (inviterUser) {
            inviterEmail = inviterUser.email;
          }
        } catch (error) {
          this.logger.warn(`Could not fetch inviter details: ${error.message}`);
        }

        return {
          id: invitation.id,
          workspaceId: invitation.workspaceId,
          workspaceName: invitation.workspace.name,
          inviterEmail,
          status: invitation.status,
          createdAt: invitation.createdAt,
        };
      }),
    );

    return invitationsWithDetails;
  }

  /**
   * Accept an invitation and enroll the user
   */
  async acceptInvitation(
    invitationId: string,
    userId: string,
    userEmail: string,
  ): Promise<void> {
    const normalizedEmail = userEmail.toLowerCase().trim();

    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Invitation has already been ${invitation.status}`,
      );
    }

    if (invitation.inviteeEmail !== normalizedEmail) {
      throw new ForbiddenException('This invitation is not for you');
    }

    // Check if user is already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        workspaceId: invitation.workspaceId,
        userId,
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('You are already enrolled in this workspace');
    }

    // Create enrollment
    const enrollment = this.enrollmentRepository.create({
      workspaceId: invitation.workspaceId,
      userId,
    });

    await this.enrollmentRepository.save(enrollment);

    // Update invitation status
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.updatedAt = new Date();
    await this.invitationRepository.save(invitation);

    this.logger.log(
      `User ${userId} accepted invitation ${invitationId} and enrolled in workspace ${invitation.workspaceId}`,
    );

    // Auto-set as favorite if first enrollment
    await this.autoSetFirstFavorite(userId);
  }

  /**
   * Reject an invitation
   */
  async rejectInvitation(
    invitationId: string,
    userId: string,
    userEmail: string,
  ): Promise<void> {
    const normalizedEmail = userEmail.toLowerCase().trim();

    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Invitation has already been ${invitation.status}`,
      );
    }

    if (invitation.inviteeEmail !== normalizedEmail) {
      throw new ForbiddenException('This invitation is not for you');
    }

    // Update invitation status
    invitation.status = InvitationStatus.REJECTED;
    invitation.updatedAt = new Date();
    await this.invitationRepository.save(invitation);

    this.logger.log(
      `User ${userId} rejected invitation ${invitationId} for workspace ${invitation.workspaceId}`,
    );
  }

  /**
   * Cancel an invitation (owner only)
   */
  async cancelInvitation(invitationId: string, ownerId: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['workspace'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: invitation.workspaceId },
    });

    if (!workspace || workspace.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Only the workspace owner can cancel invitations',
      );
    }

    await this.invitationRepository.remove(invitation);
    this.logger.log(`Invitation ${invitationId} cancelled by owner ${ownerId}`);
  }

  // ============================================================================
  // ROSTER METHODS
  // ============================================================================

  /**
   * Save or update a roster (draft mode)
   */
  async saveRoster(
    saveRosterDto: SaveRosterDto,
    userId: string,
  ): Promise<Roster> {
    const { workspaceId, month, year, assignments } = saveRosterDto;

    // Verify workspace exists and user is the owner or enrolled
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Check if user is owner - ONLY OWNERS CAN CREATE/EDIT ROSTERS
    const isOwner = workspace.ownerId === userId;

    if (!isOwner) {
      throw new ForbiddenException(
        'Only workspace owner can create or modify rosters',
      );
    }

    // Find or create roster
    let roster = await this.rosterRepository.findOne({
      where: { workspaceId, month, year },
    });

    if (roster) {
      roster.updatedAt = new Date();
    } else {
      // Create new roster
      roster = this.rosterRepository.create({
        workspaceId,
        month,
        year,
        status: RosterStatus.DRAFT,
      });
      roster = await this.rosterRepository.save(roster);
    }

    // Delete existing assignments for this roster
    await this.rosterAssignmentRepository.delete({ rosterId: roster.id });

    // Create new assignments (only non-empty ones)
    const assignmentsToCreate = assignments
      .filter((a) => a.dutyType !== '')
      .map((assignment) =>
        this.rosterAssignmentRepository.create({
          rosterId: roster.id,
          userId: assignment.userId,
          day: assignment.day,
          shiftPeriod: assignment.shiftPeriod,
          dutyType: assignment.dutyType,
          isOvertime: assignment.isOvertime,
        }),
      );

    if (assignmentsToCreate.length > 0) {
      await this.rosterAssignmentRepository.save(assignmentsToCreate);
    }

    this.logger.log(
      `Roster saved for workspace ${workspaceId} (${month}/${year}) by user ${userId}`,
    );

    return roster;
  }

  /**
   * Publish a roster (owner only)
   */
  async publishRoster(rosterId: string, ownerId: string): Promise<Roster> {
    const roster = await this.rosterRepository.findOne({
      where: { id: rosterId },
      relations: ['workspace'],
    });

    if (!roster) {
      throw new NotFoundException('Roster not found');
    }

    // Verify user is the workspace owner
    if (roster.workspace.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Only the workspace owner can publish rosters',
      );
    }

    // Update roster status
    roster.status = RosterStatus.PUBLISHED;
    roster.publishedAt = new Date();
    roster.publishedBy = ownerId;

    const updatedRoster = await this.rosterRepository.save(roster);

    this.logger.log(`Roster ${rosterId} published by owner ${ownerId}`);

    return updatedRoster;
  }

  /**
   * Unpublish a roster (owner only)
   */
  async unpublishRoster(rosterId: string, ownerId: string): Promise<Roster> {
    const roster = await this.rosterRepository.findOne({
      where: { id: rosterId },
      relations: ['workspace'],
    });

    if (!roster) {
      throw new NotFoundException('Roster not found');
    }

    // Verify user is the workspace owner
    if (roster.workspace.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Only the workspace owner can unpublish rosters',
      );
    }

    // Update roster status
    roster.status = RosterStatus.DRAFT;
    roster.publishedAt = null;
    roster.publishedBy = null;

    const updatedRoster = await this.rosterRepository.save(roster);

    this.logger.log(`Roster ${rosterId} unpublished by owner ${ownerId}`);

    return updatedRoster;
  }

  /**
   * Get roster for a specific month/year in a workspace
   */
  async getRoster(
    workspaceId: string,
    month: number,
    year: number,
    userId: string,
  ): Promise<any> {
    // Verify workspace exists and user has access
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Check if user is owner or enrolled
    const isOwner = workspace.ownerId === userId;
    const isEnrolled = await this.enrollmentRepository.findOne({
      where: { workspaceId, userId },
    });

    if (!isOwner && !isEnrolled) {
      throw new ForbiddenException(
        'You do not have permission to view this roster',
      );
    }

    // Find roster
    const roster = await this.rosterRepository.findOne({
      where: { workspaceId, month, year },
    });

    if (!roster) {
      return {
        roster: null,
        assignments: [],
      };
    }

    // Get all assignments for this roster
    const assignments = await this.rosterAssignmentRepository.find({
      where: { rosterId: roster.id },
    });

    return {
      roster: {
        id: roster.id,
        workspaceId: roster.workspaceId,
        month: roster.month,
        year: roster.year,
        status: roster.status,
        publishedAt: roster.publishedAt,
        publishedBy: roster.publishedBy,
        createdAt: roster.createdAt,
        updatedAt: roster.updatedAt,
      },
      assignments: assignments.map((a) => ({
        id: a.id,
        userId: a.userId,
        day: a.day,
        shiftPeriod: a.shiftPeriod,
        dutyType: a.dutyType,
        isOvertime: a.isOvertime,
      })),
    };
  }

  /**
   * Get published roster assignments for a user across all their enrolled workspaces
   * Used for displaying in user's personal calendar
   */
  async getUserPublishedRosters(
    userId: string,
    month: number,
    year: number,
  ): Promise<any[]> {
    // Get all workspaces user is enrolled in
    const enrollments = await this.enrollmentRepository.find({
      where: { userId },
    });

    if (enrollments.length === 0) {
      return [];
    }

    const workspaceIds = enrollments.map((e) => e.workspaceId);

    // Find all published rosters for these workspaces in the given month/year
    const rosters = await this.rosterRepository
      .createQueryBuilder('roster')
      .where('roster.workspace_id IN (:...workspaceIds)', { workspaceIds })
      .andWhere('roster.month = :month', { month })
      .andWhere('roster.year = :year', { year })
      .andWhere('roster.status = :status', { status: RosterStatus.PUBLISHED })
      .leftJoinAndSelect('roster.workspace', 'workspace')
      .getMany();

    if (rosters.length === 0) {
      return [];
    }

    // Get all assignments for this user in these rosters
    const rosterIds = rosters.map((r) => r.id);
    const assignments = await this.rosterAssignmentRepository
      .createQueryBuilder('assignment')
      .where('assignment.roster_id IN (:...rosterIds)', { rosterIds })
      .andWhere('assignment.user_id = :userId', { userId })
      .getMany();

    // Group assignments by roster and return with workspace info
    const result = rosters.map((roster) => {
      const rosterAssignments = assignments.filter(
        (a) => a.rosterId === roster.id,
      );

      return {
        rosterId: roster.id,
        workspaceId: roster.workspaceId,
        workspaceName: roster.workspace?.name || 'Unknown',
        month: roster.month,
        year: roster.year,
        publishedAt: roster.publishedAt,
        assignments: rosterAssignments.map((a) => ({
          day: a.day,
          shiftPeriod: a.shiftPeriod,
          dutyType: a.dutyType,
          isOvertime: a.isOvertime,
        })),
      };
    });

    return result;
  }

  /**
   * Delete a roster (owner only)
   */
  async deleteRoster(rosterId: string, ownerId: string): Promise<void> {
    const roster = await this.rosterRepository.findOne({
      where: { id: rosterId },
      relations: ['workspace'],
    });

    if (!roster) {
      throw new NotFoundException('Roster not found');
    }

    // Verify user is the workspace owner
    if (roster.workspace.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Only the workspace owner can delete rosters',
      );
    }

    // Delete roster (assignments will be cascade deleted)
    await this.rosterRepository.remove(roster);

    this.logger.log(`Roster ${rosterId} deleted by owner ${ownerId}`);
  }

  // ============================================================================
  // LEAVE MANAGEMENT METHODS
  // ============================================================================

  /**
   * Request leave for a workspace
   */
  async requestLeave(
    createLeaveRequestDto: CreateLeaveRequestDto,
    userId: string,
  ): Promise<LeaveRequest> {
    const { workspaceId, startDate, endDate, reason } = createLeaveRequestDto;

    // Verify workspace exists
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Verify user is enrolled in the workspace
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        workspaceId,
        userId,
      },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You must be enrolled in the workspace to request leave',
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      throw new BadRequestException(
        'End date must be after or equal to start date',
      );
    }

    // Check for overlapping pending leave requests
    const overlappingRequests = await this.leaveRequestRepository
      .createQueryBuilder('leave')
      .where('leave.workspace_id = :workspaceId', { workspaceId })
      .andWhere('leave.user_id = :userId', { userId })
      .andWhere('leave.status = :status', {
        status: LeaveRequestStatus.PENDING,
      })
      .andWhere(
        '(leave.start_date <= :endDate AND leave.end_date >= :startDate)',
        { startDate, endDate },
      )
      .getMany();

    if (overlappingRequests.length > 0) {
      throw new ConflictException(
        'You already have a pending leave request that overlaps with this date range',
      );
    }

    // Create leave request
    const leaveRequest = this.leaveRequestRepository.create({
      workspaceId,
      userId,
      startDate: start,
      endDate: end,
      reason: reason || null,
      status: LeaveRequestStatus.PENDING,
    });

    const savedRequest = await this.leaveRequestRepository.save(leaveRequest);
    this.logger.log(
      `Leave request created: ${savedRequest.id} by user ${userId} for workspace ${workspaceId}`,
    );

    return savedRequest;
  }

  /**
   * Get user's own leave requests
   */
  async getMyLeaveRequests(userId: string): Promise<any[]> {
    const leaveRequests = await this.leaveRequestRepository.find({
      where: { userId },
      relations: ['workspace'],
      order: { createdAt: 'DESC' },
    });

    return leaveRequests.map((request) => ({
      id: request.id,
      workspaceId: request.workspaceId,
      workspaceName: request.workspace?.name || 'Unknown',
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    }));
  }

  /**
   * Get all leave requests for a workspace (owner only)
   */
  async getWorkspaceLeaveRequests(
    workspaceId: string,
    requestingUserId: string,
  ): Promise<any[]> {
    // Verify workspace exists and user is the owner
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    if (workspace.ownerId !== requestingUserId) {
      throw new ForbiddenException(
        'Only the workspace owner can view leave requests',
      );
    }

    // Get all leave requests for this workspace
    const leaveRequests = await this.leaveRequestRepository.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
    });

    // Fetch user details for each request
    const requestsWithDetails = await Promise.all(
      leaveRequests.map(async (request) => {
        const user = await this.authService.getUserById(request.userId);
        return {
          id: request.id,
          userId: request.userId,
          email: user?.email || 'Unknown',
          startDate: request.startDate,
          endDate: request.endDate,
          reason: request.reason,
          status: request.status,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
        };
      }),
    );

    return requestsWithDetails;
  }

  /**
   * Approve a leave request (owner only)
   */
  async approveLeaveRequest(
    requestId: string,
    ownerId: string,
  ): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findOne({
      where: { id: requestId },
      relations: ['workspace'],
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.workspace.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Only the workspace owner can approve leave requests',
      );
    }

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve request with status: ${request.status}`,
      );
    }

    request.status = LeaveRequestStatus.APPROVED;
    const updatedRequest = await this.leaveRequestRepository.save(request);

    this.logger.log(`Leave request ${requestId} approved by owner ${ownerId}`);

    return updatedRequest;
  }

  /**
   * Reject a leave request (owner only)
   */
  async rejectLeaveRequest(
    requestId: string,
    ownerId: string,
  ): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findOne({
      where: { id: requestId },
      relations: ['workspace'],
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.workspace.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Only the workspace owner can reject leave requests',
      );
    }

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject request with status: ${request.status}`,
      );
    }

    request.status = LeaveRequestStatus.REJECTED;
    const updatedRequest = await this.leaveRequestRepository.save(request);

    this.logger.log(`Leave request ${requestId} rejected by owner ${ownerId}`);

    return updatedRequest;
  }

  /**
   * Cancel own leave request (users only)
   */
  async cancelLeaveRequest(requestId: string, userId: string): Promise<void> {
    const request = await this.leaveRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.userId !== userId) {
      throw new ForbiddenException(
        'You can only cancel your own leave requests',
      );
    }

    if (request.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel request with status: ${request.status}`,
      );
    }

    await this.leaveRequestRepository.remove(request);

    this.logger.log(`Leave request ${requestId} cancelled by user ${userId}`);
  }
}
