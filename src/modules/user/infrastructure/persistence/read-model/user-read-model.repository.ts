import { Injectable } from '@nestjs/common';
import type { DomainEventBase } from '../../../../../shared/domain/domain-event.base';
import type { PrismaService } from '../../../../../shared/infrastructure/prisma/prisma.service';
import type { IUserReadModelRepository } from '../../../application/ports/user-read-model.repository.interface';
import { UserCreatedEvent } from '../../../domain/events/user-created.event';

@Injectable()
export class UserReadModelRepository implements IUserReadModelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async applyProjection(events: ReadonlyArray<DomainEventBase>): Promise<void> {
    for (const event of events) {
      if (event instanceof UserCreatedEvent) {
        await this.prisma.user.create({
          data: {
            id: event.payload.userId,
            email: event.payload.email,
            username: event.payload.username,
            createdAt: event.payload.createdAt,
            isActive: true,
          },
        });
      }
    }
  }
}
