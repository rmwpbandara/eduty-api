import { IsUUID } from 'class-validator';

export class PublishRosterDto {
  @IsUUID()
  rosterId: string;
}

