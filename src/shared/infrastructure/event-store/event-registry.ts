import { Injectable } from '@nestjs/common';
import type { DomainEventBase } from '../../domain/domain-event.base';
import type { StoredEventData } from './event-store.service';

export type EventDeserializer = (data: StoredEventData) => DomainEventBase;

@Injectable()
export class EventRegistry {
  private readonly registry = new Map<string, EventDeserializer>();

  register(eventType: string, deserializer: EventDeserializer): void {
    this.registry.set(eventType, deserializer);
  }

  getDeserializer(eventType: string): EventDeserializer | undefined {
    return this.registry.get(eventType);
  }

  has(eventType: string): boolean {
    return this.registry.has(eventType);
  }
}
