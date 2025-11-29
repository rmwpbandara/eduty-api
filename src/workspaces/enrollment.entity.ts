import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Workspace } from './workspace.entity';

@Entity('workspace_enrollments')
@Unique(['workspaceId', 'userId'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 50, default: 'member', nullable: true })
  role: string;

  @CreateDateColumn({ name: 'enrolled_at', type: 'timestamp' })
  enrolledAt: Date;

  @ManyToOne(() => Workspace)
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;
}

