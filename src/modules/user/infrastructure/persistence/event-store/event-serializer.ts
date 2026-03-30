import { Injectable, Logger } from '@nestjs/common';
import type { DomainEventBase } from '../../../../../shared/domain/domain-event.base';
import { EventRegistry } from '../../../../../shared/infrastructure/event-store/event-registry';
import type {
  EventSerializer as IEventSerializer,
  StoredEventData,
} from '../../../../../shared/infrastructure/event-store/event-store.service';

@Injectable()
export class UserEventSerializer implements IEventSerializer {
  private readonly logger = new Logger(UserEventSerializer.name);

  constructor(private readonly registry: EventRegistry) {}

  serialize(event: DomainEventBase): StoredEventData {
    return {
      eventType: event.eventType,
      eventId: event.eventId,
      occurredAt: event.occurredAt.toISOString(),
      payload: this.extractPayload(event),
    };
  }

  deserialize(data: StoredEventData): DomainEventBase | null {
    const deserializer = this.registry.getDeserializer(data.eventType);
    if (!deserializer) {
      this.logger.warn(`Unknown event type "${data.eventType}" — skipping`);
      return null;
    }
    return deserializer(data);
  }

  private extractPayload(event: DomainEventBase): Record<string, unknown> {
    if ('payload' in event) {
      return { ...(event as any).payload };
    }
    throw new Error(`Unknown event type: ${event.eventType}`);
  }
}
