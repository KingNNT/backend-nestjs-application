import {
  EventStoreDBClient,
  FORWARDS,
  type JSONEventData,
  jsonEvent,
  START,
  StreamNotFoundError,
} from '@eventstore/db-client';
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { DomainEventBase } from '../../domain/domain-event.base';

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

@Injectable()
export class EventStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventStoreService.name);
  private client!: EventStoreDBClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const connectionString = this.config.getOrThrow<string>(
      'EVENTSTORE_CONNECTION_STRING',
    );
    this.client = EventStoreDBClient.connectionString(connectionString);
    this.logger.log('EventStoreDB client initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.dispose();
  }

  async appendToStream(
    streamId: string,
    events: ReadonlyArray<DomainEventBase>,
    expectedRevision: bigint | 'no_stream' | 'any',
    serializer: EventSerializer,
  ): Promise<AppendResult> {
    const jsonEvents: JSONEventData[] = events.map((e) => {
      const stored = serializer.serialize(e);
      return jsonEvent({
        id: stored.eventId,
        type: stored.eventType,
        data: stored.payload,
        metadata: { occurredAt: stored.occurredAt },
      });
    });

    const result = await this.client.appendToStream(streamId, jsonEvents, {
      expectedRevision,
    });

    return { nextExpectedRevision: result.nextExpectedRevision };
  }

  async readStream(
    streamId: string,
    serializer: EventSerializer,
  ): Promise<DomainEventBase[]> {
    try {
      const events: DomainEventBase[] = [];
      const readable = this.client.readStream(streamId, {
        direction: FORWARDS,
        fromRevision: START,
        maxCount: 10_000,
      });

      for await (const resolvedEvent of readable) {
        if (!resolvedEvent.event) continue;
        const domainEvent = serializer.deserialize({
          eventType: resolvedEvent.event.type,
          eventId: resolvedEvent.event.id,
          occurredAt:
            (resolvedEvent.event.metadata as any)?.occurredAt ??
            new Date().toISOString(),
          payload: resolvedEvent.event.data as Record<string, unknown>,
        });
        // Skip unknown event types (forward compatibility)
        if (domainEvent) {
          events.push(domainEvent);
        }
      }

      return events;
    } catch (err) {
      if (err instanceof StreamNotFoundError) return [];
      throw err;
    }
  }
}
