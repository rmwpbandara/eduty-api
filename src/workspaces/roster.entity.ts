import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Workspace } from './workspace.entity';

export enum RosterStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Entity('rosters')
@Unique(['workspaceId', 'month', 'year'])
export class Roster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId: string;

  @Column({ type: 'integer' })
  month: number; // 1-12

  @Column({ type: 'integer' })
  year: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: RosterStatus.DRAFT,
  })
  status: RosterStatus;

  @Column({ type: 'timestamp', name: 'published_at', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'uuid', name: 'published_by', nullable: true })
  publishedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Workspace)
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;
}

