import { Injectable, Logger } from '@nestjs/common';
import type { DomainEventBase } from '../../domain/domain-event.base';
import type { PrismaService } from '../prisma/prisma.service';

export interface StoredEventData {
  eventType: string;
  eventId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export interface EventSerializer {
  serialize(event: DomainEventBase): StoredEventData;
  deserialize(data: StoredEventData): DomainEventBase | null;
}

export interface AppendResult {
  nextExpectedRevision: bigint;
}

export class ConcurrencyError extends Error {
  constructor(
    streamId: string,
    expectedRevision: bigint | 'no_stream' | 'any',
    actualRevision: bigint | null,
  ) {
    super(
      `Concurrency conflict on stream "${streamId}": expected revision ${String(expectedRevision)}, actual ${actualRevision === null ? 'no_stream' : String(actualRevision)}`,
    );
    this.name = 'ConcurrencyError';
  }
}

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  async appendToStream(
    streamId: string,
    events: ReadonlyArray<DomainEventBase>,
    expectedRevision: bigint | 'no_stream' | 'any',
    serializer: EventSerializer,
  ): Promise<AppendResult> {
    return this.prisma.$transaction(async (tx) => {
      // Get the current max version for this stream
      const latest = await tx.domainEvent.findFirst({
        where: { streamId },
        orderBy: { version: 'desc' },
        select: { version: true },
      });

      const currentRevision = latest?.version ?? null;

      // Validate expected revision
      if (expectedRevision === 'no_stream') {
        if (currentRevision !== null) {
          throw new ConcurrencyError(
            streamId,
            expectedRevision,
            currentRevision,
          );
        }
      } else if (expectedRevision !== 'any') {
        if (currentRevision === null || currentRevision !== expectedRevision) {
          throw new ConcurrencyError(
            streamId,
            expectedRevision,
            currentRevision,
          );
        }
      }

      const startVersion = currentRevision !== null ? currentRevision + 1n : 0n;

      const rows = events.map((event, index) => {
        const stored = serializer.serialize(event);
        return {
          id: stored.eventId,
          streamId,
          eventType: stored.eventType,
          payload: stored.payload as object,
          version: startVersion + BigInt(index),
          occurredAt: new Date(stored.occurredAt),
        };
      });

      await tx.domainEvent.createMany({ data: rows });

      const nextExpectedRevision = startVersion + BigInt(events.length) - 1n;
      return { nextExpectedRevision };
    });
  }

  async readStream(
    streamId: string,
    serializer: EventSerializer,
  ): Promise<DomainEventBase[]> {
    const rows = await this.prisma.domainEvent.findMany({
      where: { streamId },
      orderBy: { version: 'asc' },
    });

    const events: DomainEventBase[] = [];
    for (const row of rows) {
      const domainEvent = serializer.deserialize({
        eventType: row.eventType,
        eventId: row.id,
        occurredAt: row.occurredAt.toISOString(),
        payload: row.payload as Record<string, unknown>,
      });
      // Skip unknown event types (forward compatibility)
      if (domainEvent) {
        events.push(domainEvent);
      }
    }

    return events;
  }
}
