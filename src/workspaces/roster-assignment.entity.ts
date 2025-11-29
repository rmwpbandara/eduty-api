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
import { Roster } from './roster.entity';

export type ShiftPeriod = 'M' | 'E' | 'N';
export type DutyType = 'M' | 'E' | 'N' | 'DO' | 'SD' | 'VL' | '';

@Entity('roster_assignments')
@Unique(['rosterId', 'userId', 'day', 'shiftPeriod'])
export class RosterAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'roster_id' })
  rosterId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'integer' })
  day: number; // 1-31

  @Column({ type: 'varchar', length: 1, name: 'shift_period' })
  shiftPeriod: ShiftPeriod; // M, E, N

  @Column({ type: 'varchar', length: 2, name: 'duty_type' })
  dutyType: DutyType; // M, E, N, DO, SD, VL, or empty

  @Column({ type: 'boolean', name: 'is_overtime', default: false })
  isOvertime: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => Roster)
  @JoinColumn({ name: 'roster_id' })
  roster: Roster;
}

